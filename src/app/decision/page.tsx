
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
  Wallet, 
  Zap, 
  Lightbulb,
  ArrowRight,
  Info,
  Loader2,
  TrendingUp
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { cn } from "@/lib/utils";

export default function DecisionPage() {
  const db = useFirestore();
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [showResult, setShowResult] = useState(false);

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
      budgetUsed: budgetUsed.toFixed(1)
    };
  }, [amount, currentBalance, safetyThreshold]);

  const handleCheckDecision = () => {
    if (amount) setShowResult(true);
  };

  const setQuickAmount = (val: number) => {
    setAmount(val.toString());
    setShowResult(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-10 pb-12 animate-in fade-in duration-700">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Smart Decision Tool</h1>
        <p className="text-muted-foreground">Check if a purchase fits your current financial trajectory.</p>
      </div>

      <div className="grid gap-8">
        {/* Input Section */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Can I afford this?</CardTitle>
            <CardDescription>Enter the purchase details to see the impact on your balance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Purchase Amount (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                  <Input 
                    id="amount" 
                    type="number" 
                    placeholder="0.00" 
                    className="pl-8 h-12 text-lg font-bold bg-slate-50 border-none shadow-inner" 
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setShowResult(false); }}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[500, 1000, 5000].map((val) => (
                    <Button key={val} variant="outline" size="sm" className="text-[10px] h-7 px-3 bg-white" onClick={() => setQuickAmount(val)}>
                      ₹{val.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description (Optional)</Label>
                <Input 
                  id="desc" 
                  placeholder="e.g. New Phone, Business Software" 
                  className="h-12 bg-slate-50 border-none shadow-inner" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <Button 
              className="w-full h-12 text-md font-bold bg-primary hover:bg-primary/90 gap-2 transition-all shadow-lg shadow-primary/20"
              onClick={handleCheckDecision}
              disabled={!amount}
            >
              <Zap size={18} /> Check Decision
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        {showResult && decision && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <Card className={cn(
              "border-none shadow-md overflow-hidden transition-colors",
              decision.status === 'affordable' ? "bg-emerald-50" : 
              decision.status === 'risky' ? "bg-amber-50" : "bg-rose-50"
            )}>
              <CardContent className="p-8 space-y-4">
                <div className="flex items-center gap-3">
                  {decision.status === 'affordable' && <CheckCircle2 className="h-8 w-8 text-emerald-600" />}
                  {decision.status === 'risky' && <AlertTriangle className="h-8 w-8 text-amber-600" />}
                  {decision.status === 'not-affordable' && <XCircle className="h-8 w-8 text-rose-600" />}
                  <h2 className={cn(
                    "text-2xl font-black capitalize",
                    decision.status === 'affordable' ? "text-emerald-700" : 
                    decision.status === 'risky' ? "text-amber-700" : "text-rose-700"
                  )}>
                    {decision.status.replace('-', ' ')}
                  </h2>
                </div>
                <p className="text-sm font-medium leading-relaxed opacity-80 text-slate-700">
                  {decision.message}
                </p>
                
                <div className="pt-6 border-t border-black/5 grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Available Now</p>
                    <p className="text-sm font-bold text-slate-700">₹{currentBalance.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Remaining after</p>
                    <p className="text-sm font-bold text-slate-700">₹{decision.remaining.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">% of Budget</p>
                    <p className="text-sm font-bold text-slate-700">{decision.budgetUsed}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Smart Suggestions */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Lightbulb size={16} className="text-primary" /> Smart Suggestions
              </h3>
              <div className="grid gap-3">
                {decision.status === 'affordable' ? (
                  <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center gap-3 group hover:shadow-sm transition-all">
                    <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><CheckCircle2 size={18} /></div>
                    <p className="text-sm font-semibold text-slate-700">Go ahead! This purchase is within your safe zone.</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center gap-3 group hover:shadow-sm transition-all">
                      <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><ArrowRight size={18} /></div>
                      <p className="text-sm font-semibold text-slate-700">Delay this purchase by 3 days for better safety.</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center gap-3 group hover:shadow-sm transition-all">
                      <div className="bg-amber-100 p-2 rounded-lg text-amber-600"><TrendingUp size={18} /></div>
                      <p className="text-sm font-semibold text-slate-700">Wait for your next income to avoid liquidity risk.</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Safe Spending Info */}
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-primary">Safe Spending Limit: ₹{(currentBalance - safetyThreshold).toLocaleString()}</p>
                <p className="text-[10px] text-primary/70 mt-0.5">We recommend keeping at least ₹{safetyThreshold.toLocaleString()} (20%) for unexpected obligations.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
