
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calculator, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  Info,
  Loader2,
  Wallet
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { cn } from "@/lib/utils";

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
}

export default function ExpenseCalculatorPage() {
  const db = useFirestore();
  const [items, setItems] = useState<ExpenseItem[]>([
    { id: '1', description: 'Coffee', amount: 0 },
  ]);
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");

  // Fetch current balance to calculate "Safe Daily Spending"
  const accountsQuery = useMemo(() => (db ? query(collection(db, "accounts")) : null), [db]);
  const { data: accounts, loading } = useCollection(accountsQuery);

  const currentBalance = useMemo(() => {
    return accounts?.reduce((sum, acc: any) => sum + (acc.closingBalance || 0), 0) || 0;
  }, [accounts]);

  // A very simple rule of thumb: 1/30th of balance is a "Safe Day"
  const safeDailyLimit = useMemo(() => currentBalance / 30, [currentBalance]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  }, [items]);

  const addItem = () => {
    if (!newItemDesc) return;
    const amount = parseFloat(newItemAmount) || 0;
    const newItem: ExpenseItem = {
      id: Date.now().toString(),
      description: newItemDesc,
      amount: amount
    };
    setItems([...items, newItem]);
    setNewItemDesc("");
    setNewItemAmount("");
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateAmount = (id: string, val: string) => {
    const amount = parseFloat(val) || 0;
    setItems(items.map(i => i.id === id ? { ...i, amount } : i));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Calculating budget limits...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <Calculator className="h-8 w-8" />
            Daily Expense Calculator
          </h1>
          <p className="text-muted-foreground">Break down your daily spending to see the micro-impact on your balance.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Detailed Breakdown</CardTitle>
              <CardDescription className="text-xs">Add individual items planned for today.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Input 
                    placeholder="Expense name (e.g. Lunch)" 
                    value={newItemDesc} 
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Input 
                    type="number" 
                    placeholder="₹ 0.00" 
                    value={newItemAmount} 
                    onChange={(e) => setNewItemAmount(e.target.value)}
                    className="h-10 text-sm font-bold"
                  />
                </div>
                <Button onClick={addItem} size="icon" className="h-10 w-10 shrink-0">
                  <Plus size={18} />
                </Button>
              </div>

              <div className="space-y-3 pt-4 border-t">
                {items.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground font-medium uppercase tracking-widest italic">
                    Add your first expense above
                  </p>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 group">
                      <div className="flex-1 text-sm font-medium text-slate-700">
                        {item.description}
                      </div>
                      <div className="w-32">
                        <Input 
                          type="number" 
                          value={item.amount || ""} 
                          onChange={(e) => updateAmount(item.id, e.target.value)}
                          className="h-9 text-xs font-bold text-right"
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results & Intelligence */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <div className="p-6 bg-slate-50 border-b">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Planned Spending</p>
              <p className="text-3xl font-black text-slate-900">₹{totalAmount.toLocaleString()}</p>
            </div>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                    <Wallet size={14} className="text-primary" />
                    Daily Safe Limit
                  </p>
                  <p className="text-xs font-black text-slate-900">₹{Math.floor(safeDailyLimit).toLocaleString()}</p>
                </div>
                
                <div className={cn(
                  "p-4 rounded-xl border flex items-start gap-3 transition-all",
                  totalAmount <= safeDailyLimit 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                    : "bg-rose-50 border-rose-100 text-rose-800"
                )}>
                  {totalAmount <= safeDailyLimit ? (
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle size={18} className="text-rose-500 shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest">
                      {totalAmount <= safeDailyLimit ? "Within Budget" : "Above Safe Limit"}
                    </p>
                    <p className="text-[11px] font-medium leading-relaxed opacity-80">
                      {totalAmount <= safeDailyLimit 
                        ? "This spending is well within your daily sustainable limit based on current liquidity."
                        : "This total exceeds your sustainable daily budget. Consider removing non-essential items."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3 border-t">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Info size={12} /> Optimization Tips
                </h3>
                <div className="grid gap-2">
                  <div className="p-3 bg-slate-50 rounded-lg text-[11px] font-medium text-slate-600 flex items-center gap-2">
                    <TrendingDown size={14} className="text-blue-500" />
                    Reduce your top item to save ₹{(totalAmount * 0.1).toFixed(0)} today.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg text-[11px] font-medium text-slate-600 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Consolidate small expenses to avoid multiple transaction fees.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
