"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Sparkles, 
  AlertTriangle, 
  Check, 
  Wallet, 
  TrendingDown, 
  Loader2,
  Inbox,
  ArrowRight
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collectionGroup, query, where, orderBy, collection } from "firebase/firestore";
import { useMemo, useState } from "react";
import { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NegotiationCard } from "./negotiation-card";

export function SmartPrioritization() {
  const db = useFirestore();
  const [activeNegotiation, setActiveNegotiation] = useState<Transaction | null>(null);

  // 1. Get current balance
  const accountsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "accounts"));
  }, [db]);
  const { data: accounts } = useCollection(accountsQuery);
  const currentBalance = accounts?.reduce((sum, acc: any) => sum + (acc.closingBalance || 0), 0) || 0;

  // 2. Get pending bills
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

  // 3. Logic for prioritization
  const prioritizedBills = useMemo(() => {
    if (!pendingBills) return [];

    let tempBalance = currentBalance;
    
    return pendingBills.map((bill) => {
      const today = new Date();
      const dueDate = new Date(bill.dueDate || bill.date);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let priorityScore = 0;
      
      if (['Electricity', 'Rent', 'Payroll', 'Utilities'].includes(bill.category || '')) priorityScore += 50;
      
      if (bill.relationshipType === 'Strict') priorityScore += 40;
      else if (bill.relationshipType === 'Moderate') priorityScore += 20;
      else if (bill.relationshipType === 'Friendly') priorityScore -= 20;

      if (diffDays <= 0) priorityScore += 100;
      else if (diffDays <= 3) priorityScore += 60;
      else if (diffDays <= 7) priorityScore += 30;

      const isFeasible = tempBalance >= Math.abs(bill.amount);
      const suggestedAction = !isFeasible 
        ? (bill.relationshipType === 'Friendly' ? 'Partial Payment' : 'Negotiate Delay')
        : 'Pay Now';

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

  if (loading) return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />
      ))}
    </div>
  );

  if (!pendingBills || pendingBills.length === 0) {
    return (
      <Card className="border-none shadow-sm bg-muted/20 py-12 flex flex-col items-center text-center">
        <Inbox className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <h3 className="font-bold text-slate-800">Clear Skies</h3>
        <p className="text-sm text-muted-foreground max-w-[240px] mt-1">No pending bills detected. Your cash flow looks stable!</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {prioritizedBills.map((bill) => (
          <Card key={bill.id} className={cn(
            "border-none shadow-sm overflow-hidden group transition-all hover:shadow-md",
            bill.isFeasible ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-rose-500"
          )}>
            <CardContent className="p-5 flex flex-col h-full justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{bill.description}</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                      <Calendar size={10} />
                      {bill.daysLeft < 0 ? `${Math.abs(bill.daysLeft)} days overdue` : `${bill.daysLeft} days left`}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900">₹{Math.abs(bill.amount).toLocaleString()}</div>
                    <Badge variant="outline" className="text-[8px] uppercase font-black border-none p-0 tracking-widest text-muted-foreground/60">
                      {bill.category || "General"}
                    </Badge>
                  </div>
                </div>

                {!bill.isFeasible && (
                  <div className="bg-rose-50 rounded-lg p-2.5 mb-3 border border-rose-100/50">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={12} className="text-rose-500 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-rose-700 font-medium leading-tight">
                        Insufficient balance. Action: <span className="font-bold uppercase underline decoration-rose-300">{bill.suggestedAction}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <Badge className={cn(
                  "text-[8px] font-black uppercase border-none px-1.5 h-4",
                  bill.priorityScore > 100 ? "bg-rose-600 text-white" : bill.priorityScore > 50 ? "bg-amber-500 text-white" : "bg-blue-500 text-white"
                )}>
                  {bill.priorityScore > 100 ? "Critical" : bill.priorityScore > 50 ? "High" : "Normal"}
                </Badge>
                
                {bill.isFeasible ? (
                  <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                    Safe <Check size={12} />
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-[9px] font-black text-primary hover:text-primary hover:bg-primary/5 uppercase gap-1"
                    onClick={() => setActiveNegotiation(bill)}
                  >
                    Negotiate <ArrowRight size={10} />
                  </Button>
                )}
              </div>
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
