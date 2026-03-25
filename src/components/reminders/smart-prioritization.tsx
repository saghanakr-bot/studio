
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
  CheckCircle2
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collectionGroup, query, where, orderBy, collection, doc, runTransaction } from "firebase/firestore";
import { useMemo, useState } from "react";
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

  // 1. Get current balance from all accounts
  const accountsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "accounts"));
  }, [db]);
  const { data: accounts } = useCollection(accountsQuery);
  const currentBalance = accounts?.reduce((sum, acc: any) => sum + (acc.closingBalance || 0), 0) || 0;

  // 2. Get pending bills (debits) across all accounts
  const pendingQuery = useMemo(() => {
    if (!db) return null;
    return query(
      collectionGroup(db, "transactions"),
      where("status", "==", "pending"),
      where("type", "==", "debit"),
      orderBy("dueDate", "asc")
    );
  }, [db]);

  const { data: pendingBills, loading } = useCollection<Transaction>(pendingQuery);

  // 3. Logic for prioritization based on urgency, risk, and relationship
  const prioritizedBills = useMemo(() => {
    if (!pendingBills) return [];

    let tempBalance = currentBalance;
    const today = startOfDay(new Date());
    
    return pendingBills.map((bill) => {
      const dueDate = new Date(bill.dueDate || bill.date);
      const diffDays = differenceInDays(dueDate, today);
      
      let priorityScore = 0;
      
      // A. Penalty Risk (High for specific categories)
      const highRiskCategories = ['Electricity', 'Rent', 'Payroll', 'Utilities', 'Taxes'];
      if (highRiskCategories.includes(bill.category || '')) priorityScore += 50;
      
      // B. Relationship Flexibility
      if (bill.relationshipType === 'Strict') priorityScore += 40;
      else if (bill.relationshipType === 'Moderate') priorityScore += 20;
      else if (bill.relationshipType === 'Friendly') priorityScore -= 20;

      // C. Due Date Urgency
      if (diffDays < 0) priorityScore += 100; // Overdue is critical
      else if (diffDays === 0) priorityScore += 80; // Due today
      else if (diffDays <= 3) priorityScore += 60; // Due very soon
      else if (diffDays <= 7) priorityScore += 30; // Due this week

      const isFeasible = tempBalance >= Math.abs(bill.amount);
      
      // D. Suggested Action Logic
      let suggestedAction: 'Pay Now' | 'Delay' | 'Partial Payment' | 'Negotiate' = 'Pay Now';
      
      if (!isFeasible) {
        if (bill.relationshipType === 'Friendly') {
          suggestedAction = 'Partial Payment';
        } else if (bill.relationshipType === 'Flexible' || bill.relationshipType === 'Moderate') {
          suggestedAction = 'Negotiate';
        } else {
          suggestedAction = 'Delay';
        }
      }

      if (isFeasible) {
        tempBalance -= Math.abs(bill.amount);
      }

      return {
        ...bill,
        priorityScore,
        isFeasible,
        suggestedAction,
        daysLeft: diffDays
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [pendingBills, currentBalance]);

  const handlePayNow = async (bill: any) => {
    if (!db || processingId || !bill.accountId) return;
    
    setProcessingId(bill.id);

    const accountRef = doc(db, "accounts", bill.accountId);
    const txRef = doc(db, "accounts", bill.accountId, "transactions", bill.id);

    try {
      await runTransaction(db, async (txn) => {
        const accountDoc = await txn.get(accountRef);
        if (!accountDoc.exists()) {
          throw new Error("Source account does not exist.");
        }

        const currentAccBalance = Number(accountDoc.data().closingBalance || 0);
        const amount = Number(bill.amount || 0);
        const newBalance = currentAccBalance + amount; // amount is negative for bills

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
        title: "Payment Successful",
        description: `Successfully paid ${bill.description}. Account balance updated.`,
      });
    } catch (err: any) {
      console.error("Payment Error:", err);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: txRef.path,
        operation: 'update',
        requestResourceData: { status: 'cleared' }
      }));
      
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: err.message || "Failed to process payment. Please try again.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return (
    <div className="grid grid-cols-1 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 bg-slate-50 animate-pulse rounded-2xl border" />
      ))}
    </div>
  );

  if (!pendingBills || pendingBills.length === 0) {
    return (
      <Card className="border-none shadow-sm bg-slate-50/50 py-12 flex flex-col items-center text-center">
        <Inbox className="h-10 w-10 text-slate-300 mb-4" />
        <h3 className="font-bold text-slate-800">No Pending Obligations</h3>
        <p className="text-xs text-slate-500 max-w-[240px] mt-1">Your cash flow is currently unencumbered.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4">
        {prioritizedBills.map((bill) => (
          <Card key={bill.id} className={cn(
            "border-none shadow-sm overflow-hidden group transition-all hover:shadow-md",
            bill.isFeasible ? "bg-white" : "bg-rose-50/20 border border-rose-100/50"
          )}>
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border",
                    bill.priorityScore > 100 ? "bg-rose-100 text-rose-600 border-rose-200" : 
                    bill.priorityScore > 50 ? "bg-amber-100 text-amber-600 border-amber-200" : 
                    "bg-blue-100 text-blue-600 border-blue-200"
                  )}>
                    {bill.priorityScore > 100 ? <ShieldAlert size={24} /> : <Clock size={24} />}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 line-clamp-1">{bill.description}</h3>
                    <div className="flex items-center gap-3">
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                        bill.daysLeft < 0 ? "text-rose-600" : "text-muted-foreground"
                      )}>
                        <Calendar size={10} />
                        {bill.daysLeft < 0 ? `${Math.abs(bill.daysLeft)} days overdue` : 
                         bill.daysLeft === 0 ? "Due today" : `${bill.daysLeft} days left`}
                      </p>
                      <Badge variant="secondary" className="text-[9px] h-4 font-bold border-none bg-slate-100 text-slate-600">
                        {bill.category || "General"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col justify-between items-center md:items-end gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-black text-slate-900">₹{Math.abs(bill.amount).toLocaleString()}</div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      {bill.relationshipType} Relationship
                    </p>
                  </div>
                  
                  {bill.isFeasible ? (
                    <Button 
                      size="sm"
                      className="h-8 px-4 text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white uppercase transition-all gap-2 rounded-full"
                      onClick={() => handlePayNow(bill)}
                      disabled={processingId === bill.id}
                    >
                      {processingId === bill.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Check size={12} />
                      )}
                      Pay Now
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 px-4 text-[10px] font-black border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white uppercase transition-all gap-2"
                      onClick={() => setActiveNegotiation(bill)}
                    >
                      {bill.suggestedAction} <ArrowRight size={12} />
                    </Button>
                  )}
                </div>
              </div>

              {!bill.isFeasible && (
                <div className="mt-4 p-3 bg-white/50 rounded-xl border border-rose-100 flex items-start gap-3">
                  <AlertTriangle size={14} className="text-rose-500 mt-0.5" />
                  <p className="text-[10px] text-rose-800 leading-relaxed">
                    Balance check failed. Recommendation: <strong>{bill.suggestedAction}</strong> to maintain liquidity and trust.
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
