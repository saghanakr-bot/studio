
"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  Wallet,
  Receipt,
  Calendar as CalendarIcon,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  Building,
  Handshake,
  Mail,
  Phone,
  Info,
  Database,
  ExternalLink
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, where, doc, setDoc, deleteDoc, orderBy, limit, collectionGroup, getDocs } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Badge } from "@/components/ui/badge";

function ExpenseTrackerContent() {
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [newItemType, setNewItemType] = useState<"debit" | "credit">("debit");
  const [isAdding, setIsAdding] = useState(false);
  const [accountNames, setAccountNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const dateParam = searchParams.get("date");
    const initialDate = dateParam && isValid(parseISO(dateParam)) 
      ? dateParam 
      : format(new Date(), "yyyy-MM-dd");
    setSelectedDate(initialDate);
  }, [searchParams]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const params = new URLSearchParams(searchParams);
    params.set("date", newDate);
    router.push(`/expenses?${params.toString()}`);
  };

  useEffect(() => {
    if (!db) return;
    getDocs(collection(db, "accounts")).then(snapshot => {
      const mapping: Record<string, string> = {};
      snapshot.forEach(doc => mapping[doc.id] = doc.data().name);
      setAccountNames(mapping);
    });
  }, [db]);

  const accountsQuery = useMemo(() => (db ? query(collection(db, "accounts"), orderBy("lastUpdated", "desc"), limit(1)) : null), [db]);
  const { data: accounts, loading: accountsLoading } = useCollection(accountsQuery);

  const activeAccount = accounts?.[0];
  const totalLiquidity = useMemo(() => accounts?.reduce((sum, acc: any) => sum + (acc.closingBalance || 0), 0) || 0, [accounts]);
  const safeDailyLimit = useMemo(() => totalLiquidity / 30, [totalLiquidity]);

  const dailyTransactionsQuery = useMemo(() => {
    if (!db || !selectedDate) return null;
    return query(
      collectionGroup(db, "transactions"),
      where("date", "==", selectedDate)
    );
  }, [db, selectedDate]);

  const { data: dayActivity, loading: activityLoading, error: activityError } = useCollection(dailyTransactionsQuery);

  const totals = useMemo(() => {
    return dayActivity?.reduce((acc, item: any) => {
      const val = Math.abs(item.amount);
      if (item.type === 'credit') acc.inflow += val;
      else acc.outflow += val;
      return acc;
    }, { inflow: 0, outflow: 0 }) || { inflow: 0, outflow: 0 };
  }, [dayActivity]);

  const addTransaction = async () => {
    if (!newItemDesc || !newItemAmount || !db || !activeAccount || !selectedDate) {
      if (!activeAccount) {
        toast({
          variant: "destructive",
          title: "Account Required",
          description: "Please add a bank account first via the Dashboard.",
        });
      }
      return;
    }
    
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
      category: "Manual Log",
      accountId: activeAccount.id,
      createdAt: new Date().toISOString()
    };

    setDoc(txRef, txData)
      .then(() => {
        toast({
          title: "Log Entry Added",
          description: `₹${amountVal} recorded for ${selectedDate}.`,
        });
      })
      .catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: txRef.path,
          operation: 'create',
          requestResourceData: txData
        }));
      })
      .finally(() => {
        setNewItemDesc("");
        setNewItemAmount("");
        setIsAdding(false);
      });
  };

  const removeTransaction = async (item: any) => {
    if (!db || !item.accountId) return;
    const txRef = doc(db, "accounts", item.accountId, "transactions", item.id);
    deleteDoc(txRef).catch(e => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: txRef.path,
        operation: 'delete'
      }));
    });
  };

  if (accountsLoading || !selectedDate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Loading activities...</p>
      </div>
    );
  }

  const isIndexError = activityError?.message?.includes("index") || (activityError as any)?.code === "failed-precondition";

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <Receipt className="h-8 w-8" />
            Daily Activity
          </h1>
          <p className="text-muted-foreground">Detailed historical view of inflows and outflows.</p>
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
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-4 bg-slate-50/50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity size={18} className="text-primary" />
                Detailed Activity Log: {format(parseISO(selectedDate), "MMMM dd, yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {activityLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-200" />
                </div>
              ) : activityError ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6 bg-rose-50 rounded-2xl border border-rose-100">
                  <Database className="h-8 w-8 text-rose-500 mb-3 opacity-40" />
                  <p className="text-sm font-black text-rose-800 uppercase tracking-widest">
                    {isIndexError ? "Database Index Required" : "Connection Error"}
                  </p>
                  <p className="text-[11px] text-rose-600 mt-2 leading-relaxed max-w-sm font-medium">
                    {isIndexError 
                      ? "Firestore requires a Composite Index for collectionGroup queries by date. Please open your browser console (F12) and click the provided link to create it." 
                      : "Failed to retrieve transactions. Please ensure you are online and have proper database access."}
                  </p>
                  {isIndexError && (
                    <div className="mt-4 p-3 bg-white/50 rounded-lg border border-rose-200 text-left">
                      <p className="text-[10px] font-bold text-rose-700 flex items-center gap-2 mb-1">
                        <Info size={12} /> How to fix:
                      </p>
                      <ol className="text-[10px] text-rose-600 space-y-1 list-decimal ml-4">
                        <li>Press <strong>F12</strong> or <strong>Ctrl+Shift+I</strong> to open Developer Tools.</li>
                        <li>Go to the <strong>Console</strong> tab.</li>
                        <li>Click the <strong>blue link</strong> in the red error message.</li>
                        <li>Click <strong>"Create Index"</strong> in the Firebase Console.</li>
                      </ol>
                    </div>
                  )}
                </div>
              ) : dayActivity?.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-3 opacity-40">
                  <div className="bg-slate-100 p-4 rounded-full">
                    <Receipt size={32} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest italic">No activity found for this date.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dayActivity?.map((item: any) => (
                    <div key={item.id} className="flex flex-col gap-3 group hover:bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-all relative">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm",
                          item.type === 'credit' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-white text-slate-600 border-slate-100"
                        )}>
                          {item.type === 'credit' ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-black text-slate-900 truncate">{item.description}</p>
                            <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-bold bg-slate-100 text-slate-500 uppercase">
                              {item.category || "General"}
                            </Badge>
                            {item.status === 'pending' && (
                              <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-amber-200 bg-amber-50 text-amber-700 font-bold uppercase">
                                Pending
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-[10px] font-medium text-slate-500">
                            <span className="flex items-center gap-1">
                              <Building size={10} className="text-slate-400" />
                              {item.accountId ? (accountNames[item.accountId] || "Account " + item.accountId.slice(-4)) : "Unknown Account"}
                            </span>
                            {item.relationshipType && (
                              <span className="flex items-center gap-1">
                                <Handshake size={10} className="text-slate-400" />
                                {item.relationshipType} Relations
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              {item.contactInfo?.email && <Mail size={10} className="text-primary" />}
                              {item.contactInfo?.phone && <Phone size={10} className="text-emerald-500" />}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={cn(
                            "text-lg font-black",
                            item.type === 'credit' ? "text-emerald-600" : "text-slate-900"
                          )}>
                            {item.type === 'credit' ? "+" : "-"}₹{Math.abs(item.amount).toLocaleString()}
                          </div>
                          {item.dueDate && item.dueDate !== item.date && (
                            <p className="text-[9px] font-bold text-rose-500 uppercase mt-0.5">Due: {format(parseISO(item.dueDate), "MMM dd")}</p>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeTransaction(item)}
                          className="h-8 w-8 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all absolute top-2 right-2"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-6 border-t mt-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Quick Add Entry</h3>
                <div className="flex gap-2 mb-4 p-1 bg-slate-50 rounded-lg w-fit">
                  <Button 
                    variant={newItemType === 'debit' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-7 text-[9px] font-bold uppercase tracking-widest px-3"
                    onClick={() => setNewItemType('debit')}
                  >
                    Expense
                  </Button>
                  <Button 
                    variant={newItemType === 'credit' ? 'default' : 'ghost'} 
                    size="sm" 
                    className={cn(
                      "h-7 text-[9px] font-bold uppercase tracking-widest px-3",
                      newItemType === 'credit' && "bg-emerald-600 hover:bg-emerald-700"
                    )}
                    onClick={() => setNewItemType('credit')}
                  >
                    Income
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Input 
                    placeholder="Brief description..." 
                    value={newItemDesc} 
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    className="h-10 text-sm shadow-inner bg-slate-50 border-none"
                    disabled={!activeAccount}
                  />
                  <Input 
                    type="number" 
                    placeholder="₹ 0" 
                    value={newItemAmount} 
                    onChange={(e) => setNewItemAmount(e.target.value)}
                    className="h-10 w-24 text-sm font-bold shadow-inner bg-slate-50 border-none text-center"
                    disabled={!activeAccount}
                  />
                  <Button onClick={addTransaction} size="icon" className="h-10 w-10 shrink-0" disabled={!newItemDesc || !newItemAmount || isAdding || !activeAccount}>
                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={18} />}
                  </Button>
                </div>
                {!activeAccount && (
                  <p className="text-[10px] text-rose-500 font-bold mt-2 uppercase flex items-center gap-1">
                    <AlertTriangle size={12} /> Sync a bank statement or add an account balance to start logging.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <div className="p-6 bg-slate-50 border-b">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Daily Performance</p>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Inflow</p>
                    <p className="text-xl font-black text-slate-900">₹{totals.inflow.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Total Outflow</p>
                    <p className="text-xl font-black text-slate-900">₹{totals.outflow.toLocaleString()}</p>
                  </div>
                </div>
                <div className="pt-4 border-t flex justify-between items-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Daily Flow</p>
                  <p className={cn(
                    "text-sm font-black",
                    totals.inflow - totals.outflow >= 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {totals.inflow - totals.outflow >= 0 ? "+" : "-"}₹{Math.abs(totals.inflow - totals.outflow).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                    <Wallet size={14} className="text-primary" />
                    Sustainable Limit
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
                    <p className="text-[10px] font-medium leading-relaxed opacity-80">
                      {totals.outflow <= safeDailyLimit 
                        ? "Spending on this date was within your recommended daily safety margin."
                        : "Outflow on this date exceeded your calculated sustainability threshold."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3 border-t">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Info size={12} /> Insight Hub
                </h3>
                <div className="grid gap-2">
                  <div className="p-3 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity size={14} className="text-primary" />
                      Total Items
                    </div>
                    <span>{dayActivity?.length || 0}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full text-[10px] font-bold h-8 text-primary group" onClick={() => router.push('/history')}>
                    View Global Settled History <ArrowRight size={10} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ExpenseTrackerPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Loading Activity Tracker...</p>
      </div>
    }>
      <ExpenseTrackerContent />
    </Suspense>
  );
}
