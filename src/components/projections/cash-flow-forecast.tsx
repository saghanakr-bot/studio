
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip,
  ReferenceLine,
  ReferenceArea
} from "recharts";
import { useFirestore, useCollection } from "@/firebase";
import { collection, collectionGroup, query, orderBy } from "firebase/firestore";
import { 
  format, 
  addDays, 
  startOfDay, 
  eachDayOfInterval
} from "date-fns";
import { Loader2, TrendingUp, Sparkles, AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import ARIMA from "arima";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CashFlowForecastProps {
  controlledAmount?: number;
}

export function CashFlowForecast({ controlledAmount }: CashFlowForecastProps) {
  const db = useFirestore();
  const [forecastDays] = useState(30);

  const accountsQuery = useMemo(() => (db ? query(collection(db, "accounts")) : null), [db]);
  const transactionsQuery = useMemo(() => (db ? query(collectionGroup(db, "transactions"), orderBy("date", "asc")) : null), [db]);

  const { data: accounts, loading: accountsLoading } = useCollection(accountsQuery);
  const { data: transactions, loading: txLoading } = useCollection(transactionsQuery);

  const currentBalance = useMemo(() => {
    return accounts?.reduce((sum, acc: any) => sum + (acc.closingBalance || 0), 0) || 0;
  }, [accounts]);

  const projectionData = useMemo(() => {
    if (!transactions || transactions.length < 5) return null;

    try {
      const dailyNetFlow: Record<string, number> = {};
      const pendingObligations: Record<string, number> = {};

      transactions.forEach((tx: any) => {
        const dateStr = format(startOfDay(new Date(tx.date)), "yyyy-MM-dd");
        if (tx.status === 'cleared') {
          const amount = tx.type === 'credit' ? Math.abs(tx.amount) : -Math.abs(tx.amount);
          dailyNetFlow[dateStr] = (dailyNetFlow[dateStr] || 0) + amount;
        } else if (tx.status === 'pending' && tx.type === 'debit') {
          const dueDateStr = format(startOfDay(new Date(tx.dueDate || tx.date)), "yyyy-MM-dd");
          pendingObligations[dueDateStr] = (pendingObligations[dueDateStr] || 0) + Math.abs(tx.amount);
        }
      });

      const sortedDates = Object.keys(dailyNetFlow).sort();
      if (sortedDates.length < 3) return null;

      const startDate = new Date(sortedDates[0]);
      const endDate = new Date(sortedDates[sortedDates.length - 1]);
      const timeSeriesInterval = eachDayOfInterval({ start: startDate, end: endDate });
      
      const timeSeriesData = timeSeriesInterval.map(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        return dailyNetFlow[dateStr] || 0;
      });

      let predictions: number[] = [];
      try {
        const arima = new ARIMA({ p: 1, d: 1, q: 1, verbose: false }).train(timeSeriesData);
        const [preds] = arima.predict(forecastDays);
        predictions = preds;
      } catch (err) {
        const mean = timeSeriesData.reduce((a, b) => a + b, 0) / timeSeriesData.length;
        predictions = Array(forecastDays).fill(mean);
      }

      const historicalChartData = timeSeriesInterval.slice(-14).map((day) => {
        const offsetDays = timeSeriesInterval.slice(timeSeriesInterval.indexOf(day)).length;
        return {
          date: format(day, "MMM dd"),
          balance: currentBalance - (offsetDays * 100),
          type: 'past' as const
        };
      });

      const investVal = controlledAmount || 0;
      const safetyThreshold = Math.max(10000, currentBalance * 0.2);
      
      let runningBalance = currentBalance;
      let minPredictedBalance = currentBalance;
      let safeDateIndex = -1;

      const futureChartData = predictions.map((pred, i) => {
        const date = addDays(new Date(), i + 1);
        const dateStr = format(startOfDay(date), "yyyy-MM-dd");
        const obligation = pendingObligations[dateStr] || 0;
        runningBalance += (pred - obligation);
        
        if (runningBalance < minPredictedBalance) minPredictedBalance = runningBalance;

        return {
          date: format(date, "MMM dd"),
          balance: runningBalance,
          postInvestBalance: runningBalance - investVal,
          type: 'forecast' as const
        };
      });

      const isSafeNow = futureChartData.every(d => d.postInvestBalance >= safetyThreshold);
      
      if (!isSafeNow) {
        for (let i = 0; i < futureChartData.length; i++) {
          const futureWindow = futureChartData.slice(i);
          const isStableAfter = futureWindow.every(d => d.balance >= investVal + safetyThreshold);
          if (isStableAfter) {
            safeDateIndex = i;
            break;
          }
        }
      }

      let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
      const lowestPoint = minPredictedBalance - investVal;
      
      if (lowestPoint < safetyThreshold) riskLevel = 'High';
      else if (lowestPoint < safetyThreshold * 1.2) riskLevel = 'Medium';

      return {
        chartData: [
          ...historicalChartData.map(d => ({ ...d, postInvestBalance: d.balance })),
          { date: 'Today', balance: currentBalance, postInvestBalance: currentBalance - investVal, type: 'past' as const },
          ...futureChartData
        ],
        riskLevel,
        isSafeNow,
        safeDate: safeDateIndex !== -1 ? futureChartData[safeDateIndex].date : null,
        safetyThreshold,
        lowestPoint,
        investVal
      };
    } catch (e) {
      console.error("Forecasting Calculation Error:", e);
      return null;
    }
  }, [transactions, currentBalance, controlledAmount, forecastDays]);

  if (accountsLoading || txLoading) {
    return (
      <Card className="border-none shadow-sm h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground animate-pulse font-bold tracking-widest uppercase">Analyzing Forecast...</p>
      </Card>
    );
  }

  if (!projectionData) {
    return (
      <Card className="border-none shadow-sm bg-muted/20 py-20 flex flex-col items-center text-center">
        <div className="p-4 bg-white rounded-full shadow-sm mb-4">
          <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h3 className="font-bold text-slate-800 text-xl">Insufficient Data for Forecast</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-2 px-6">
          We need at least 5 days of history to build a reliable simulation.
        </p>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm overflow-hidden bg-white">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-6">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            30-Day Liquidity Forecast
          </CardTitle>
          <CardDescription className="text-xs italic">Simulating balance trajectory after ₹{projectionData.investVal.toLocaleString()} impact.</CardDescription>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={cn(
            "text-[10px] font-black uppercase tracking-widest border-none px-2 h-5",
            projectionData.riskLevel === 'High' ? "bg-rose-600 text-white" : 
            projectionData.riskLevel === 'Medium' ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
          )}>
            Risk: {projectionData.riskLevel}
          </Badge>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">AI Strategy Level</p>
        </div>
      </CardHeader>
      <CardContent className="h-[400px] w-full pt-8 px-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={projectionData.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} className="text-[10px] font-bold fill-muted-foreground" />
            <YAxis axisLine={false} tickLine={false} className="text-[10px] font-bold fill-muted-foreground" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border p-3 rounded-lg shadow-xl text-xs flex flex-col gap-2">
                      <p className="font-black text-slate-400 uppercase tracking-widest border-b pb-1">{data.date}</p>
                      <div className="space-y-1">
                        <p className="flex justify-between gap-4 font-bold">
                          <span className="text-muted-foreground">Forecast:</span>
                          <span className="text-primary">₹{Math.round(data.balance).toLocaleString()}</span>
                        </p>
                        <p className="flex justify-between gap-4 font-bold border-t pt-1 mt-1">
                          <span className="text-muted-foreground">After Buy:</span>
                          <span className="text-blue-600">₹{Math.round(data.postInvestBalance).toLocaleString()}</span>
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            
            <ReferenceLine 
              y={projectionData.safetyThreshold} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
              label={{ value: 'Safety Threshold', position: 'right', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} 
            />
            
            <ReferenceArea y1={0} y2={projectionData.safetyThreshold} fill="#fee2e2" fillOpacity={0.2} />

            <Area 
              type="monotone" 
              dataKey="balance" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              fill="url(#colorPast)" 
              data={projectionData.chartData.filter(d => d.type === 'past' || d.date === 'Today')} 
              key="past-area"
              animationDuration={1000}
            />
            <Area 
              type="monotone" 
              dataKey="balance" 
              stroke="#3b82f6" 
              strokeWidth={2}
              strokeDasharray="5 5" 
              fill="transparent" 
              data={projectionData.chartData.filter(d => d.type === 'forecast' || d.date === 'Today')} 
              key="forecast-area"
              animationDuration={1000}
            />
            <Area 
              type="monotone" 
              dataKey="postInvestBalance" 
              stroke="#60a5fa" 
              strokeWidth={1}
              strokeDasharray="3 3"
              fill="transparent" 
              data={projectionData.chartData.filter(d => d.type === 'forecast' || d.date === 'Today')} 
              key="post-invest-area"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
