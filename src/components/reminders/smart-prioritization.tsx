
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  AlertTriangle, 
  Check, 
  Inbox,
  ArrowRight,
  ShieldAlert,
  Clock,
  Loader2,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collectionGroup, query, where, orderBy, collection, doc, runTransaction } from "firebase/firestore";
import { useMemo, useState, useEffect } from "react";
import { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NegotiationCard } from "./negotiation-card";
import { startOfDay, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export function SmartPrioritization() {
  const db = useFirestore();
  const { toast } = useToast();
  const [activeNegotiation, setActiveNegotiation] = useState<Transaction | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(startOfDay(new Date()));
  }, []);

  // 1. Get current balance from all accounts
  const accountsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "accounts"));
  }, [db]);
  const { data: accounts } = useCollection(accountsQuery);
  const currentBalance = accounts?.reduce((sum, acc: any) => sum + (acc.closingBalance || 0), 0) || 0;

  // 2. Get ALL pending transactions (Income & Bills) across all accounts
  const pendingQuery = useMemo(() => {
    if (!db) return null;
    return query(
      collectionGroup(db, "transactions"),
      where("status", "==", "pending"),
      orderBy("dueDate", "asc")
    );
  }, [db]);

  const { data: pendingItems, loading } = useCollection<Transaction>(pendingQuery);

  // 3. Logic for prioritization and feasibility
  const prioritizedItems = useMemo(() => {
    if (!pendingItems || !today) return [];

    let tempBalance = currentBalance;
    
    return pendingItems.map((item) => {
      const dueDate = new Date(item.dueDate || item.date);
      const diffDays = differenceInDays(dueDate, today);
      
      let priorityScore = 0;
      const isIncome = item.type === 'credit';

      if (isIncome) {
        if (diffDays < 0) priorityScore += 80;
        else if (diffDays <= 3) priorityScore += 40;
        tempBalance += Math.abs(item.amount);
      } else {
        const highRiskCategories = ['Electricity', 'Rent', 'Payroll', 'Utilities', 'Taxes'];
        if (highRiskCategories.includes(item.category || '')) priorityScore += 50;
        
        if (item.relationshipType === 'Strict') priorityScore += 40;
        else if (item.relationshipType === 'Moderate') priorityScore += 20;
        else if (item.relationshipType === 'Friendly') priorityScore -= 20;

        if (diffDays < 0) priorityScore += 100;
        else if (diffDays === 0) priorityScore += 80;
        else if (diffDays <= 3) priorityScore += 60;
      }

      const isFeasible = isIncome || tempBalance >= Math.abs(item.amount);
      
      let suggestedAction: 'Pay Now' | 'Delay' | 'Partial Payment' | 'Negotiate' | 'Mark Received' | 'Follow Up' = 'Pay Now';
      
      if (isIncome) {
        suggestedAction = diffDays < 0 ? 'Follow Up' : 'Mark Received';
      } else {
        if (!isFeasible) {
          if (item.relationshipType === 'Friendly') suggestedAction = 'Partial Payment';
          else if (item.relationshipType === 'Flexible' || item.relationshipType === 'Moderate') suggestedAction = 'Negotiate';
          else suggestedAction = 'Delay';
        }
      }

      if (!isIncome && isFeasible) {
        tempBalance -= Math.abs(item.amount);
      }

      return {
        ...item,
        priorityScore,
        isFeasible,
        suggestedAction,
        daysLeft: diffDays,
        isIncome
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [pendingItems, currentBalance, today]);

  const handleClear = async (item: any) => {
    if (!db || processingId || !item.accountId) return;
    
    setProcessingId(item.id);

    const accountRef = doc(db, "accounts", item.accountId);
    const txRef = doc(db, "accounts", item.accountId, "transactions", item.id);

    try {
      await runTransaction(db, async (txn) => {
        const accountDoc = await txn.get(accountRef);
        if (!accountDoc.exists()) {
          throw new Error("Source account does not exist.");
        }

        const currentAccBalance = Number(accountDoc.data().closingBalance || 0);
        const amount = Number(item.amount || 0);
        const newBalance = currentAccBalance + amount; 

        txn.update(txRef, { 
          status: "cleared", 
          clearedAt: new Date().toISOString() 
        });
        
        txn.update(accountRef, { 
          closingBalance: newBalance,
          lastUpdated: new Date().toISOString()
        });

        return newBalance;
      });

      toast({
        title: item.isIncome ? "Payment Received" : "Payment Successful",
        description: `Successfully updated ${item.description}. Account balance adjusted.`,
      });
    } catch (err: any) {
      console.error("Transaction Error:", err);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: txRef.path,
        operation: 'update',
        requestResourceData: { status: 'cleared' }
      }));
      
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: err.message || "Failed to process transaction. Please try again.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading || !today) return (
    <div className="grid grid-cols-1 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 bg-slate-50 animate-pulse rounded-2xl border" />
      ))}
    </div>
  );

  if (!pendingItems || pendingItems.length === 0) {
    return (
      <Card className="border-none shadow-sm bg-slate-50/50 py-12 flex flex-col items-center text-center">
        <Inbox className="h-10 w-10 text-slate-300 mb-4" />
        <h3 className="font-bold text-slate-800">No Pending Items</h3>
        <p className="text-xs text-slate-500 max-w-[240px] mt-1">Your financial schedule is currently clear.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4">
        {prioritizedItems.map((item) => (
          <Card key={item.id} className={cn(
            "border-none shadow-sm overflow-hidden group transition-all hover:shadow-md",
            item.isIncome ? "bg-emerald-50/10 border border-emerald-100/30" : (item.isFeasible ? "bg-white" : "bg-rose-50/20 border border-rose-100/50")
          )}>
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border",
                    item.isIncome ? "bg-emerald-100 text-emerald-600 border-emerald-200" : (
                      item.priorityScore > 100 ? "bg-rose-100 text-rose-600 border-rose-200" : 
                      item.priorityScore > 50 ? "bg-amber-100 text-amber-600 border-amber-200" : 
                      "bg-blue-100 text-blue-600 border-blue-200"
                    )
                  )}>
                    {item.isIncome ? <TrendingUp size={24} /> : (item.priorityScore > 100 ? <ShieldAlert size={24} /> : <Clock size={24} />)}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 line-clamp-1">{item.description}</h3>
                    <div className="flex items-center gap-3">
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                        item.daysLeft < 0 ? "text-rose-600" : "text-muted-foreground"
                      )}>
                        <Calendar size={10} />
                        {item.daysLeft < 0 ? `${Math.abs(item.daysLeft)} days overdue` : 
                         item.daysLeft === 0 ? "Due today" : `${item.daysLeft} days left`}
                      </p>
                      <Badge variant="secondary" className={cn(
                        "text-[9px] h-4 font-bold border-none",
                        item.isIncome ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {item.category || "General"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col justify-between items-center md:items-end gap-2 shrink-0">
                  <div className="text-right">
                    <div className={cn(
                      "text-lg font-black",
                      item.isIncome ? "text-emerald-600" : "text-slate-900"
                    )}>
                      {item.isIncome ? "+" : "-"}₹{Math.abs(item.amount).toLocaleString()}
                    </div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      {item.isIncome ? 'Customer' : `${item.relationshipType} Supplier`}
                    </p>
                  </div>
                  
                  {item.isFeasible ? (
                    <Button 
                      size="sm"
                      className={cn(
                        "h-8 px-4 text-[10px] font-black uppercase transition-all gap-2 rounded-full text-white",
                        item.isIncome ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary hover:bg-primary/90"
                      )}
                      onClick={() => handleClear(item)}
                      disabled={processingId === item.id}
                    >
                      {processingId === item.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        item.isIncome ? <TrendingUp size={12} /> : <Check size={12} />
                      )}
                      {item.isIncome ? "Mark Received" : "Pay Now"}
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 px-4 text-[10px] font-black border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white uppercase transition-all gap-2"
                      onClick={() => setActiveNegotiation(item)}
                    >
                      {item.suggestedAction} <ArrowRight size={12} />
                    </Button>
                  )}
                </div>
              </div>

              {!item.isFeasible && !item.isIncome && (
                <div className="mt-4 p-3 bg-white/50 rounded-xl border border-rose-100 flex items-start gap-3">
                  <AlertTriangle size={14} className="text-rose-500 mt-0.5" />
                  <p className="text-[10px] text-rose-800 leading-relaxed">
                    Liquidity risk detected. Action: <strong>{item.suggestedAction}</strong> to avoid overdraft or penalty.
                  </p>
                </div>
              )}
              
              {item.isIncome && item.daysLeft < 0 && (
                <div className="mt-4 p-3 bg-white/50 rounded-xl border border-emerald-100 flex items-start gap-3">
                  <ArrowUpRight size={14} className="text-emerald-500 mt-0.5" />
                  <p className="text-[10px] text-emerald-800 leading-relaxed">
                    This income is overdue. Consider sending a friendly payment reminder to your customer.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {activeNegotiation && (
        <NegotiationCard 
          transaction={activeNegotiation} 
          onClose={() => setActiveNegotiation(null)} 
        />
      )}
    </div>
  );
}
