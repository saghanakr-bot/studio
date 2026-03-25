
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Zap, 
  Lightbulb,
  ArrowRight,
  Info,
  Loader2,
  TrendingUp,
  LineChart,
  ShieldCheck
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { CashFlowForecast } from "@/components/projections/cash-flow-forecast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function StrategyPage() {
  const db = useFirestore();
  const [amount, setAmount] = useState<string>("5000");
  const [description, setDescription] = useState<string>("");

  // Fetch current balance from Firestore
  const accountsQuery = useMemo(() => (db ? query(collection(db, "accounts")) : null), [db]);
  const { data: accounts, loading } = useCollection(accountsQuery);

  const currentBalance = useMemo(() => {
    return accounts?.reduce((sum, acc: any) => sum + (acc.closingBalance || 0), 0) || 0;
  }, [accounts]);

  const safetyThreshold = useMemo(() => Math.max(10000, currentBalance * 0.2), [currentBalance]);

  const decision = useMemo(() => {
    const buyAmount = parseFloat(amount) || 0;
    if (buyAmount <= 0) return null;

    const remaining = currentBalance - buyAmount;
    let status: 'affordable' | 'risky' | 'not-affordable' = 'affordable';
    let message = "";

    if (remaining < 0) {
      status = 'not-affordable';
      message = "This purchase exceeds your current available balance. It's not financially feasible right now.";
    } else if (remaining < safetyThreshold) {
      status = 'risky';
      message = "After this purchase, your balance will drop below your safe limit. You might struggle with upcoming bills.";
    } else {
      status = 'affordable';
      message = "You have plenty of room in your budget for this purchase. Your safety limit remains untouched.";
    }

    const budgetUsed = (buyAmount / currentBalance) * 100;

    return {
      status,
      message,
      remaining,
      budgetUsed: isFinite(budgetUsed) ? budgetUsed.toFixed(1) : "0"
    };
  }, [amount, currentBalance, safetyThreshold]);

  const setQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing strategy engine...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            Strategy & Decisions
          </h1>
          <p className="text-muted-foreground">Predictive cash flow modeling and investment simulations.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left: Input & Decision Card */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="border-none shadow-sm overflow-hidden bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="text-primary" size={20} />
                Can I afford this?
              </CardTitle>
              <CardDescription className="text-xs">Enter a purchase amount to simulate the impact on your 30-day forecast.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Purchase Amount (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">₹</span>
                    <Input 
                      id="amount" 
                      type="number" 
                      placeholder="0.00" 
                      className="pl-8 h-12 text-lg font-bold bg-slate-50 border-none shadow-inner" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[500, 1000, 5000].map((val) => (
                      <Button key={val} variant="outline" size="sm" className="text-[10px] h-7 px-3 bg-white hover:bg-primary/5 hover:text-primary transition-all" onClick={() => setQuickAmount(val)}>
                        ₹{val.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Description (Optional)</Label>
                  <Input 
                    id="desc" 
                    placeholder="e.g. New Equipment, Software" 
                    className="h-12 bg-slate-50 border-none shadow-inner text-sm" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              {decision && (
                <div className={cn(
                  "p-4 rounded-xl border transition-all animate-in zoom-in-95 duration-300",
                  decision.status === 'affordable' ? "bg-emerald-50 border-emerald-100" : 
                  decision.status === 'risky' ? "bg-amber-50 border-amber-100" : "bg-rose-50 border-rose-100"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {decision.status === 'affordable' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                    {decision.status === 'risky' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                    {decision.status === 'not-affordable' && <XCircle className="h-5 w-5 text-rose-600" />}
                    <h3 className={cn(
                      "text-sm font-black uppercase tracking-widest",
                      decision.status === 'affordable' ? "text-emerald-700" : 
                      decision.status === 'risky' ? "text-amber-700" : "text-rose-700"
                    )}>
                      {decision.status.replace('-', ' ')}
                    </h3>
                  </div>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed">
                    {decision.message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Smart Info Cards */}
          {decision && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-none shadow-sm bg-white p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Available Now</p>
                <p className="text-sm font-bold text-slate-900">₹{currentBalance.toLocaleString()}</p>
              </Card>
              <Card className="border-none shadow-sm bg-white p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Remaining after</p>
                <p className="text-sm font-bold text-slate-900">₹{decision.remaining.toLocaleString()}</p>
              </Card>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Lightbulb size={14} className="text-primary" /> Strategy Tips
            </h3>
            <div className="grid gap-3">
              {decision?.status === 'affordable' ? (
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><CheckCircle2 size={16} /></div>
                  <p className="text-xs font-semibold text-emerald-800">Safe zone. This purchase has low impact on future liquidity.</p>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-white rounded-xl border border-slate-100 flex items-center gap-3 hover:shadow-sm transition-all">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><ArrowRight size={16} /></div>
                    <p className="text-xs font-semibold text-slate-700">Delay by 3 days for safer cash flow.</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-100 flex items-center gap-3 hover:shadow-sm transition-all">
                    <div className="bg-amber-100 p-2 rounded-lg text-amber-600"><TrendingUp size={16} /></div>
                    <p className="text-xs font-semibold text-slate-700">Wait for your next invoice to be cleared.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Projections Hub */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <Alert className="bg-blue-50/50 border-blue-100 text-blue-800 py-3">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-xs font-bold">Predictive Simulation</AlertTitle>
            <AlertDescription className="text-[10px]">
              The forecast graph below automatically updates to show how the ₹{parseFloat(amount || "0").toLocaleString()} purchase affects your 30-day liquidity based on historical trends.
            </AlertDescription>
          </Alert>
          
          <CashFlowForecast controlledAmount={parseFloat(amount) || 0} />
        </div>
      </div>
    </div>
  );
}
