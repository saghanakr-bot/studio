"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  TrendingUp,
  Info,
  Loader2,
  Wallet,
  Receipt,
  Calendar as CalendarIcon,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, where, doc, setDoc, deleteDoc, orderBy, limit } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Badge } from "@/components/ui/badge";

export default function ExpenseTrackerPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get date from URL or default to today
  const dateParam = searchParams.get("date");
  const initialDate = dateParam && isValid(parseISO(dateParam)) 
    ? dateParam 
    : format(new Date(), "yyyy-MM-dd");

  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [newItemType, setNewItemType] = useState<"debit" | "credit">("debit");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initialDate);

  // Update URL when date changes to keep "synced" state
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const params = new URLSearchParams(searchParams);
    params.set("date", newDate);
    router.push(`/expenses?${params.toString()}`);
  };

  // 1. Fetch current balance for "Safe Daily Spending" calculation
  const accountsQuery = useMemo(() => (db ? query(collection(db, "accounts"), orderBy("lastUpdated", "desc"), limit(1)) : null), [db]);
  const { data: accounts, loading: accountsLoading } = useCollection(accountsQuery);

  const activeAccount = accounts?.[0];
  const currentBalance = activeAccount?.closingBalance || 0;
  const safeDailyLimit = useMemo(() => currentBalance / 30, [currentBalance]);

  // 2. Fetch ALL transactions for the selected date (cleared & pending)
  const dailyTransactionsQuery = useMemo(() => {
    if (!db || !activeAccount) return null;
    return query(
      collection(db, "accounts", activeAccount.id, "transactions"),
      where("date", "==", selectedDate)
    );
  }, [db, activeAccount, selectedDate]);

  const { data: dayActivity, loading: activityLoading } = useCollection(dailyTransactionsQuery);

  const totals = useMemo(() => {
    return dayActivity?.reduce((acc, item: any) => {
      const val = Math.abs(item.amount);
      if (item.type === 'credit') acc.inflow += val;
      else acc.outflow += val;
      return acc;
    }, { inflow: 0, outflow: 0 }) || { inflow: 0, outflow: 0 };
  }, [dayActivity]);

  const addTransaction = async () => {
    if (!newItemDesc || !newItemAmount || !db || !activeAccount) return;
    
    setIsAdding(true);
    const amountVal = parseFloat(newItemAmount) || 0;
    const finalAmount = newItemType === 'credit' ? amountVal : -amountVal;
    
    const txRef = doc(collection(db, "accounts", activeAccount.id, "transactions"));
    
    const txData = {
      date: selectedDate,
      description: newItemDesc,
      amount: finalAmount,
      type: newItemType,
      status: "cleared",
      category: "Daily Activity",
      accountId: activeAccount.id,
      createdAt: new Date().toISOString()
    };

    setDoc(txRef, txData).catch(e => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: txRef.path,
        operation: 'create',
        requestResourceData: txData
      }));
    });
    
    setNewItemDesc("");
    setNewItemAmount("");
    setIsAdding(false);
    toast({
      title: "Transaction Logged",
      description: `₹${amountVal} ${newItemType === 'credit' ? 'received' : 'spent'} on ${selectedDate}.`,
    });
  };

  const removeTransaction = async (id: string) => {
    if (!db || !activeAccount) return;
    const txRef = doc(db, "accounts", activeAccount.id, "transactions", id);
    deleteDoc(txRef).catch(e => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: txRef.path,
        operation: 'delete'
      }));
    });
  };

  if (accountsLoading || (activityLoading && !dayActivity.length)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Synchronizing daily activity...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <Receipt className="h-8 w-8" />
            Daily Activity
          </h1>
          <p className="text-muted-foreground">Review and log all financial movements for a specific date.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border">
          <CalendarIcon size={16} className="text-muted-foreground ml-2" />
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => handleDateChange(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 h-8 text-sm font-bold w-40 cursor-pointer"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Manual Entry</CardTitle>
              <CardDescription className="text-xs">Quickly record income or expenses for this date.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-50 rounded-lg w-fit">
                <Button 
                  variant={newItemType === 'debit' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="h-8 text-[10px] font-bold uppercase tracking-widest px-4"
                  onClick={() => setNewItemType('debit')}
                >
                  Expense
                </Button>
                <Button 
                  variant={newItemType === 'credit' ? 'default' : 'ghost'} 
                  size="sm" 
                  className={cn(
                    "h-8 text-[10px] font-bold uppercase tracking-widest px-4",
                    newItemType === 'credit' && "bg-emerald-600 hover:bg-emerald-700"
                  )}
                  onClick={() => setNewItemType('credit')}
                >
                  Income
                </Button>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input 
                    placeholder="Description (e.g. Morning Coffee)" 
                    value={newItemDesc} 
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    className="h-10 text-sm"
                    disabled={!activeAccount}
                  />
                </div>
                <div className="w-32">
                  <Input 
                    type="number" 
                    placeholder="₹ 0.00" 
                    value={newItemAmount} 
                    onChange={(e) => setNewItemAmount(e.target.value)}
                    className="h-10 text-sm font-bold"
                    disabled={!activeAccount}
                  />
                </div>
                <Button onClick={addTransaction} size="icon" className="h-10 w-10 shrink-0" disabled={!newItemDesc || !newItemAmount || isAdding || !activeAccount}>
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={18} />}
                </Button>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Activity Log: {format(parseISO(selectedDate), "MMM dd")}
                  </h3>
                  <Button variant="ghost" size="sm" className="h-6 text-[9px] font-bold" onClick={() => router.push('/')}>
                    Dashboard <ArrowRight size={10} className="ml-1" />
                  </Button>
                </div>

                {dayActivity?.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center gap-2 opacity-50">
                    <Receipt size={32} className="text-slate-300" />
                    <p className="text-xs font-medium uppercase tracking-widest italic">No activity for this date</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayActivity?.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-4 group hover:bg-slate-50 p-3 rounded-xl border border-transparent hover:border-slate-100 transition-all">
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                          item.type === 'credit' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
                        )}>
                          {item.type === 'credit' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                        </div>
                        <div className="flex-1 space-y-0.5 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{item.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1 py-0 border-slate-200 text-slate-500 uppercase font-black tracking-tighter">
                              {item.category || "General"}
                            </Badge>
                            {item.status === 'pending' && (
                              <Badge variant="outline" className="text-[8px] h-3.5 px-1 py-0 border-amber-200 bg-amber-50 text-amber-700 uppercase font-black tracking-tighter">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className={cn(
                          "text-sm font-black",
                          item.type === 'credit' ? "text-emerald-600" : "text-slate-900"
                        )}>
                          {item.type === 'credit' ? "+" : "-"}₹{Math.abs(item.amount).toLocaleString()}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeTransaction(item.id)}
                          className="h-8 w-8 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <div className="p-6 bg-slate-50 border-b">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Daily Net Flow</p>
              <div className="flex justify-between items-end gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-emerald-600">Inflow</p>
                  <p className="text-xl font-black text-slate-900">₹{totals.inflow.toLocaleString()}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs font-bold text-rose-600">Outflow</p>
                  <p className="text-xl font-black text-slate-900">₹{totals.outflow.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                    <Wallet size={14} className="text-primary" />
                    Sustainable Outflow Limit
                  </p>
                  <p className="text-xs font-black text-slate-900">₹{Math.floor(safeDailyLimit).toLocaleString()}</p>
                </div>
                
                <div className={cn(
                  "p-4 rounded-xl border flex items-start gap-3 transition-all",
                  totals.outflow <= safeDailyLimit 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                    : "bg-rose-50 border-rose-100 text-rose-800"
                )}>
                  {totals.outflow <= safeDailyLimit ? (
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle size={18} className="text-rose-500 shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest">
                      {totals.outflow <= safeDailyLimit ? "Sustainable" : "Liquidity Warning"}
                    </p>
                    <p className="text-[11px] font-medium leading-relaxed opacity-80">
                      {totals.outflow <= safeDailyLimit 
                        ? "Outflow is within your calculated daily survival limit."
                        : "Today's spending has exceeded your sustainable daily liquidity limit."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3 border-t">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Info size={12} /> Insights
                </h3>
                <div className="grid gap-2">
                  <div className="p-3 bg-slate-50 rounded-lg text-[11px] font-medium text-slate-600 flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-500" />
                    Daily Net: ₹{(totals.inflow - totals.outflow).toLocaleString()}
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
