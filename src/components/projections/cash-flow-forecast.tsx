
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
  eachDayOfInterval,
  isSameDay
} from "date-fns";
import { Loader2, TrendingUp, Sparkles, AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import ARIMA from "arima";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
      // 1. Preprocessing - Daily Cash Flow
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

      // 2. ARIMA Model Training & Prediction
      let predictions: number[] = [];
      try {
        const arima = new ARIMA({ p: 1, d: 1, q: 1, verbose: false }).train(timeSeriesData);
        const [preds] = arima.predict(forecastDays);
        predictions = preds;
      } catch (err) {
        const mean = timeSeriesData.reduce((a, b) => a + b, 0) / timeSeriesData.length;
        predictions = Array(forecastDays).fill(mean);
      }

      // 3. Balance Projection Simulation
      const historicalChartData = timeSeriesInterval.slice(-14).map((day, i) => {
        // Calculate historical balance points backward from current
        const offsetDays = timeSeriesInterval.slice(timeSeriesInterval.indexOf(day)).length;
        // This is a simplification for visualization
        return {
          date: format(day, "MMM dd"),
          balance: currentBalance - (offsetDays * 100), // Placeholder logic for visual trend
          type: 'past' as const
        };
      });

      const investVal = parseFloat(investmentAmount) || 0;
      const safetyThreshold = Math.max(10000, currentBalance * 0.2);
      
      let runningBalance = currentBalance;
      let minPredictedBalance = currentBalance;
      let safeDateIndex = -1;

      const futureChartData = predictions.map((pred, i) => {
        const date = addDays(new Date(), i + 1);
        const dateStr = format(startOfDay(date), "yyyy-MM-dd");
        
        // Deduct obligations if due
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

      // 4. Safety & Risk Logic
      // Check if current investment is safe NOW
      const isSafeNow = futureChartData.every(d => d.postInvestBalance >= safetyThreshold);
      
      // Find earliest safe date
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
  }, [transactions, currentBalance, investmentAmount, forecastDays]);

  if (accountsLoading || txLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Running investment simulations...</p>
      </div>
    );
  }

  if (!projectionData) {
    return (
      <Card className="border-none shadow-sm bg-muted/20 py-20 flex flex-col items-center text-center">
        <div className="p-4 bg-white rounded-full shadow-sm mb-4">
          <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h3 className="font-bold text-slate-800 text-xl">Insufficient Data</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-2 px-6">
          We need at least 5 days of transaction history to build a reliable investment strategy.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Forecast Chart */}
        <Card className="lg:col-span-8 border-none shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Simulated Balance Trajectory
              </CardTitle>
              <CardDescription>Visualizing balance before and after planned investment.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-primary" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Current</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-blue-400 border-t border-dashed" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Post-Investment</span>
              </div>
            </div>
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
                        <div className="bg-white border p-3 rounded-lg shadow-xl text-xs flex flex-col gap-2">
                          <p className="font-black text-slate-400 uppercase tracking-widest border-b pb-1">{data.date}</p>
                          <div className="space-y-1">
                            <p className="flex justify-between gap-4 font-bold">
                              <span className="text-muted-foreground">Normal:</span>
                              <span className="text-primary">₹{data.balance.toLocaleString()}</span>
                            </p>
                            <p className="flex justify-between gap-4 font-bold">
                              <span className="text-muted-foreground">After Invest:</span>
                              <span className="text-blue-600">₹{data.postInvestBalance.toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                
                {/* Safety Threshold Line */}
                <ReferenceLine 
                  y={projectionData.safetyThreshold} 
                  stroke="#ef4444" 
                  strokeDasharray="3 3" 
                  label={{ value: 'Safety Threshold', position: 'right', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} 
                />
                
                {/* Highlight Risk Zone */}
                <ReferenceArea y1={0} y2={projectionData.safetyThreshold} fill="#fee2e2" fillOpacity={0.3} />

                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fill="url(#colorPast)" 
                  data={projectionData.chartData.filter(d => d.type === 'past' || d.date === 'Today')} 
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#3b82f6" 
                  strokeDasharray="5 5" 
                  fill="transparent" 
                  data={projectionData.chartData.filter(d => d.type === 'forecast' || d.date === 'Today')} 
                />
                <Area 
                  type="monotone" 
                  dataKey="postInvestBalance" 
                  stroke="#60a5fa" 
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  fill="transparent" 
                  data={projectionData.chartData.filter(d => d.type === 'forecast' || d.date === 'Today')} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Investment Advisor Card */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className={cn(
            "border-none shadow-lg text-white relative overflow-hidden transition-all duration-500",
            projectionData.riskLevel === 'High' ? "bg-rose-600" : projectionData.riskLevel === 'Medium' ? "bg-amber-500" : "bg-emerald-600"
          )}>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles size={20} /> Strategy Advisor
                </CardTitle>
                <Badge className="bg-white/20 text-white border-none font-black text-[10px] uppercase tracking-widest">
                  Risk: {projectionData.riskLevel}
                </Badge>
              </div>
              <CardDescription className="text-white/80">Simulating ₹{projectionData.investVal.toLocaleString()} investment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase opacity-80 flex items-center gap-1">
                  Adjust Amount (₹)
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger><Info size={10} /></TooltipTrigger>
                      <TooltipContent><p className="text-[10px]">Change the amount to see how it affects your risk profile.</p></TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </Label>
                <Input 
                  type="number" 
                  value={investmentAmount} 
                  onChange={(e) => setInvestmentAmount(e.target.value)}
                  className="bg-white/10 border-white/20 text-white font-bold placeholder:text-white/50"
                />
              </div>

              <div className="p-5 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm">
                {projectionData.isSafeNow ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-200">
                      <CheckCircle2 size={24} />
                      <h4 className="text-xl font-black">Safe to Invest Now</h4>
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed">
                      Your liquidity is projected to stay comfortably above the ₹{projectionData.safetyThreshold.toLocaleString()} safety mark.
                    </p>
                  </div>
                ) : projectionData.safeDate ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-100">
                      <TrendingUp size={24} />
                      <h4 className="text-xl font-black">Invest After {projectionData.safeDate}</h4>
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed">
                      Current simulation shows risk. Your liquidity window opens after {projectionData.safeDate} as incoming cash flow stabilizes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-rose-100">
                      <ShieldAlert size={24} />
                      <h4 className="text-xl font-black">Wait Recommended</h4>
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed">
                      Projected balance drops to ₹{Math.round(projectionData.lowestPoint).toLocaleString()} which is below your safety threshold. Re-evaluate in 30 days.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-[10px] font-bold text-white/60 bg-black/10 p-2 rounded-lg">
                <Info size={12} />
                <span>Threshold: ₹{projectionData.safetyThreshold.toLocaleString()} (20% safety buffer)</span>
              </div>
            </CardContent>
          </Card>

          {/* Logic Explanation */}
          <Card className="border-none shadow-sm bg-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">How we calculate risk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="h-2 w-2 rounded-full bg-rose-500 mt-1" />
                <p className="text-[10px] text-slate-600"><strong>High Risk:</strong> Simulation shows balance dropping below threshold after investment.</p>
              </div>
              <div className="flex gap-3">
                <div className="h-2 w-2 rounded-full bg-amber-500 mt-1" />
                <p className="text-[10px] text-slate-600"><strong>Medium Risk:</strong> Balance stays above threshold but within 20% margin.</p>
              </div>
              <div className="flex gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1" />
                <p className="text-[10px] text-slate-600"><strong>Low Risk:</strong> Balance remains comfortably high (>20% over threshold).</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
