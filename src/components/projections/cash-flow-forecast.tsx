
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
  ReferenceLine
} from "recharts";
import { useFirestore, useCollection } from "@/firebase";
import { collection, collectionGroup, query, orderBy } from "firebase/firestore";
import { 
  format, 
  addDays, 
  startOfDay, 
  eachDayOfInterval
} from "date-fns";
import { Loader2, TrendingUp, Sparkles, AlertTriangle, CheckCircle2, Wallet } from "lucide-react";
import ARIMA from "arima";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function CashFlowForecast() {
  const db = useFirestore();
  const [investmentAmount, setInvestmentAmount] = useState<string>("5000");
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
      transactions.forEach((tx: any) => {
        const dateStr = format(startOfDay(new Date(tx.date)), "yyyy-MM-dd");
        const amount = tx.type === 'credit' ? Math.abs(tx.amount) : -Math.abs(tx.amount);
        dailyNetFlow[dateStr] = (dailyNetFlow[dateStr] || 0) + amount;
      });

      const sortedDates = Object.keys(dailyNetFlow).sort();
      if (sortedDates.length < 3) return null; // Need at least 3 unique days for variance

      const startDate = new Date(sortedDates[0]);
      const endDate = new Date(sortedDates[sortedDates.length - 1]);
      
      const timeSeriesInterval = eachDayOfInterval({ start: startDate, end: endDate });
      const timeSeriesData = timeSeriesInterval.map(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        return dailyNetFlow[dateStr] || 0;
      });

      const mean = timeSeriesData.reduce((a, b) => a + b, 0) / timeSeriesData.length;
      const variance = timeSeriesData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / timeSeriesData.length;
      const stdDev = Math.sqrt(variance);
      const isHighVolatility = stdDev > Math.abs(mean) * 2;

      // Safe ARIMA training
      let predictions: number[] = [];
      try {
        const arima = new ARIMA({ p: 1, d: 1, q: 1, verbose: false }).train(timeSeriesData);
        const [preds] = arima.predict(forecastDays);
        predictions = preds;
      } catch (err) {
        console.error("ARIMA training failed, falling back to simple mean:", err);
        predictions = Array(forecastDays).fill(mean);
      }

      const historicalChartData = timeSeriesInterval.slice(-15).map((day, i) => {
        const offset = timeSeriesData.slice(timeSeriesData.length - 15 + i).reduce((a, b) => a + b, 0);
        return {
          date: format(day, "MMM dd"),
          balance: currentBalance - offset,
          type: 'past' as const
        };
      });

      let runningBalance = currentBalance;
      const futureChartData = predictions.map((pred: number, i: number) => {
        runningBalance += pred;
        return {
          date: format(addDays(new Date(), i + 1), "MMM dd"),
          balance: runningBalance,
          type: 'forecast' as const
        };
      });

      const combinedData = [...historicalChartData, { date: 'Today', balance: currentBalance, type: 'past' as const }, ...futureChartData];
      
      const amountToInvest = parseFloat(investmentAmount) || 0;
      const safetyThreshold = Math.max(10000, currentBalance * 0.2);
      
      let safeDateIndex = -1;
      for (let i = 0; i < futureChartData.length; i++) {
        const futureBal = futureChartData[i].balance;
        if (futureBal >= amountToInvest + safetyThreshold) {
          const isStable = futureChartData.slice(i, i + 3).every(d => d.balance >= amountToInvest + safetyThreshold);
          if (isStable) {
            safeDateIndex = i;
            break;
          }
        }
      }

      return {
        chartData: combinedData,
        isHighVolatility,
        safeDate: safeDateIndex !== -1 ? futureChartData[safeDateIndex].date : null,
        safeBalance: safeDateIndex !== -1 ? futureChartData[safeDateIndex].balance : null,
        safetyThreshold
      };
    } catch (e) {
      console.error("Forecasting Calculation Error:", e);
      return null;
    }
  }, [transactions, currentBalance, investmentAmount, forecastDays]);

  if (accountsLoading || txLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Crunching historical patterns...</p>
      </div>
    );
  }

  if (!projectionData) {
    return (
      <Card className="border-none shadow-sm bg-muted/20 py-20 flex flex-col items-center text-center">
        <div className="p-4 bg-white rounded-full shadow-sm mb-4">
          <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h3 className="font-bold text-slate-800 text-xl">Awaiting Data</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-2 px-6">
          We need at least 5 distinct days of transaction history to build a reliable forecast.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        <Card className="lg:col-span-8 border-none shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Cash Flow Forecast <Badge variant="secondary" className="text-[10px] font-bold">30 Day ARIMA</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} className="text-[10px] fill-muted-foreground" />
                <YAxis axisLine={false} tickLine={false} className="text-[10px] fill-muted-foreground" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border p-3 rounded-lg shadow-xl text-xs flex flex-col gap-1">
                          <p className="font-black text-slate-400 uppercase tracking-widest">{data.date}</p>
                          <p className="font-black text-primary">₹{data.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine x="Today" stroke="hsl(var(--primary))" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))" fill="url(#colorPast)" data={projectionData.chartData.filter(d => d.type === 'past' || d.date === 'Today')} />
                <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeDasharray="5 5" fill="transparent" data={projectionData.chartData.filter(d => d.type === 'forecast' || d.date === 'Today')} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="border-none shadow-sm bg-primary text-primary-foreground relative overflow-hidden">
            <CardHeader>
              <CardTitle>Investment Advisor</CardTitle>
              <CardDescription className="text-primary-foreground/70">Safe reinvestment windows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase opacity-80">Planned Amount (₹)</Label>
                <Input 
                  type="number" 
                  value={investmentAmount} 
                  onChange={(e) => setInvestmentAmount(e.target.value)}
                  className="bg-white/10 border-white/20 text-white font-bold"
                />
              </div>

              {projectionData.safeDate ? (
                <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                  <div className="flex items-center gap-2 text-emerald-300 mb-1">
                    <CheckCircle2 size={16} />
                    <span className="text-[10px] font-bold">OPTIMAL WINDOW</span>
                  </div>
                  <h4 className="text-2xl font-black">After {projectionData.safeDate}</h4>
                </div>
              ) : (
                <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                  <div className="flex items-center gap-2 text-rose-300 mb-1">
                    <AlertTriangle size={16} />
                    <span className="text-[10px] font-bold">WAIT RECOMMENDED</span>
                  </div>
                  <h4 className="text-lg font-bold">No Safe Date in 30 Days</h4>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
