
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  Info,
  Loader2,
  Wallet,
  Receipt
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, where, doc, setDoc, deleteDoc, orderBy, limit, getDocs } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function ExpenseTrackerPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const today = useMemo(() => new Date(), []);
  const dayStart = startOfDay(today).toISOString();
  const dayEnd = endOfDay(today).toISOString();

  // 1. Fetch current balance to calculate "Safe Daily Spending"
  const accountsQuery = useMemo(() => (db ? query(collection(db, "accounts"), orderBy("lastUpdated", "desc"), limit(1)) : null), [db]);
  const { data: accounts, loading: accountsLoading } = useCollection(accountsQuery);

  const activeAccount = accounts?.[0];
  const currentBalance = activeAccount?.closingBalance || 0;
  const safeDailyLimit = useMemo(() => currentBalance / 30, [currentBalance]);

  // 2. Fetch today's tracked expenses
  const todayExpensesQuery = useMemo(() => {
    if (!db || !activeAccount) return null;
    return query(
      collection(db, "accounts", activeAccount.id, "transactions"),
      where("date", "==", format(today, "yyyy-MM-dd")),
      where("type", "==", "debit"),
      where("status", "==", "cleared")
    );
  }, [db, activeAccount, today]);

  const { data: todayExpenses, loading: expensesLoading } = useCollection(todayExpensesQuery);

  const totalSpentToday = useMemo(() => {
    return todayExpenses?.reduce((sum, item: any) => sum + Math.abs(item.amount), 0) || 0;
  }, [todayExpenses]);

  const addExpense = async () => {
    if (!newItemDesc || !newItemAmount || !db || !activeAccount) return;
    
    setIsAdding(true);
    const amount = parseFloat(newItemAmount) || 0;
    const txRef = doc(collection(db, "accounts", activeAccount.id, "transactions"));
    
    const txData = {
      date: format(today, "yyyy-MM-dd"),
      description: newItemDesc,
      amount: -amount,
      type: "debit",
      status: "cleared",
      category: "Daily Expense",
      accountId: activeAccount.id,
      createdAt: new Date().toISOString()
    };

    // Non-blocking write
    setDoc(txRef, txData).catch(e => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: txRef.path,
        operation: 'create',
        requestResourceData: txData
      }));
    });

    // Also update account balance optimistically/transactionally if this was a real app, 
    // but for the tracker we'll just track the items.
    
    setNewItemDesc("");
    setNewItemAmount("");
    setIsAdding(false);
    toast({
      title: "Expense Tracked",
      description: `₹${amount} for ${newItemDesc} has been recorded.`,
    });
  };

  const removeExpense = async (id: string) => {
    if (!db || !activeAccount) return;
    const txRef = doc(db, "accounts", activeAccount.id, "transactions", id);
    
    deleteDoc(txRef).catch(e => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: txRef.path,
        operation: 'delete'
      }));
    });
  };

  if (accountsLoading || expensesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading your daily tracker...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <Receipt className="h-8 w-8" />
            Daily Expense Tracker
          </h1>
          <p className="text-muted-foreground">Log your spending in real-time and track against your daily safe limit.</p>
        </div>
      </div>

      {!activeAccount && (
        <Card className="border-none shadow-sm bg-amber-50 border-amber-100 p-6">
          <div className="flex items-center gap-3 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-bold">No Active Account Found</p>
          </div>
          <p className="text-xs text-amber-700 mt-2">Please add a bank balance or sync a statement first to enable tracking.</p>
        </Card>
      )}

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Tracking List */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Log New Expense</CardTitle>
              <CardDescription className="text-xs">Add items as you spend throughout the day.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Input 
                    placeholder="What did you buy? (e.g. Coffee)" 
                    value={newItemDesc} 
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    className="h-10 text-sm"
                    disabled={!activeAccount}
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Input 
                    type="number" 
                    placeholder="₹ 0.00" 
                    value={newItemAmount} 
                    onChange={(e) => setNewItemAmount(e.target.value)}
                    className="h-10 text-sm font-bold"
                    disabled={!activeAccount}
                  />
                </div>
                <Button onClick={addExpense} size="icon" className="h-10 w-10 shrink-0" disabled={!newItemDesc || !newItemAmount || isAdding || !activeAccount}>
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={18} />}
                </Button>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Today's Log ({format(today, "MMM dd")})</h3>
                {todayExpenses?.length === 0 ? (
                  <p className="text-center py-12 text-xs text-muted-foreground font-medium uppercase tracking-widest italic">
                    Nothing tracked yet for today
                  </p>
                ) : (
                  todayExpenses?.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-4 group hover:bg-slate-50 p-2 rounded-lg transition-colors">
                      <div className="flex-1 text-sm font-bold text-slate-700">
                        {item.description}
                      </div>
                      <div className="text-sm font-black text-slate-900">
                        ₹{Math.abs(item.amount).toLocaleString()}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeExpense(item.id)}
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

        {/* Right Column: Analytics */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <div className="p-6 bg-slate-50 border-b">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Spent Today</p>
              <p className="text-3xl font-black text-slate-900">₹{totalSpentToday.toLocaleString()}</p>
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
                  totalSpentToday <= safeDailyLimit 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                    : "bg-rose-50 border-rose-100 text-rose-800"
                )}>
                  {totalSpentToday <= safeDailyLimit ? (
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle size={18} className="text-rose-500 shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest">
                      {totalSpentToday <= safeDailyLimit ? "On Track" : "Limit Exceeded"}
                    </p>
                    <p className="text-[11px] font-medium leading-relaxed opacity-80">
                      {totalSpentToday <= safeDailyLimit 
                        ? "Your actual daily spending is currently within your sustainable liquidity limits."
                        : "You've exceeded your daily sustainable budget. Consider cutting back for the rest of the day."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3 border-t">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Info size={12} /> Live Insights
                </h3>
                <div className="grid gap-2">
                  <div className="p-3 bg-slate-50 rounded-lg text-[11px] font-medium text-slate-600 flex items-center gap-2">
                    <TrendingDown size={14} className="text-blue-500" />
                    Remaining daily budget: ₹{Math.max(0, Math.floor(safeDailyLimit - totalSpentToday)).toLocaleString()}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg text-[11px] font-medium text-slate-600 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    {totalSpentToday > 0 ? "Tracking keeps you 32% more aware of cash leakage." : "Start tracking to see live insights."}
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
