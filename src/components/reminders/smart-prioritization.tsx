
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
  Inbox
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
      // Priority Score Logic
      // Urgency: Days left
      const today = new Date();
      const dueDate = new Date(bill.dueDate || bill.date);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let priorityScore = 0;
      
      // Category risk
      if (['Electricity', 'Rent', 'Payroll', 'Utilities'].includes(bill.category || '')) priorityScore += 50;
      
      // Relationship
      if (bill.relationshipType === 'Strict') priorityScore += 40;
      else if (bill.relationshipType === 'Moderate') priorityScore += 20;
      else if (bill.relationshipType === 'Friendly') priorityScore -= 20;

      // Due date urgency
      if (diffDays <= 0) priorityScore += 100; // Overdue
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
    <div className="flex flex-col gap-6">
      <div className="h-48 bg-muted animate-pulse rounded-2xl" />
      <div className="h-48 bg-muted animate-pulse rounded-2xl" />
    </div>
  );

  if (!pendingBills || pendingBills.length === 0) {
    return (
      <Card className="border-none shadow-sm bg-muted/20 py-16 flex flex-col items-center text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="font-bold text-slate-800">Clear Skies</h3>
        <p className="text-sm text-muted-foreground max-w-[200px] mt-1">No pending bills detected. You're all caught up!</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Smart Prioritization</h2>
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl mt-2">
          <Wallet size={16} className="text-blue-600" />
          <p className="text-xs font-bold text-blue-700">Available: ₹{currentBalance.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {prioritizedBills.map((bill) => (
          <Card key={bill.id} className={cn(
            "border-none shadow-sm overflow-hidden group transition-all hover:ring-2",
            bill.isFeasible ? "hover:ring-emerald-100" : "hover:ring-rose-100"
          )}>
            <div className={cn(
              "h-1.5 w-full",
              bill.priorityScore > 100 ? "bg-rose-500" : bill.priorityScore > 50 ? "bg-orange-500" : "bg-blue-500"
            )} />
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 leading-snug">{bill.description}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    <Calendar size={12} />
                    Due: {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'N/A'}
                    <span className={cn(
                      "ml-1",
                      bill.daysLeft < 0 ? "text-rose-600" : "text-slate-400"
                    )}>
                      ({bill.daysLeft < 0 ? `${Math.abs(bill.daysLeft)} days overdue` : `${bill.daysLeft} days left`})
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900">₹{Math.abs(bill.amount).toLocaleString()}</div>
                  <Badge variant="outline" className="text-[9px] uppercase font-black border-none px-0 tracking-widest text-muted-foreground/50">
                    {bill.relationshipType || "Moderate"} Relationship
                  </Badge>
                </div>
              </div>

              {!bill.isFeasible && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-white rounded-lg text-rose-500 shadow-sm border border-rose-100">
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-rose-700">Cash Shortage Detected</h4>
                      <p className="text-[10px] text-rose-600/80 leading-relaxed mt-1">
                        Current balance cannot cover this payment. Delay recommended to avoid overdraft.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3 h-8 text-[10px] font-bold border-rose-200 bg-white text-rose-600 hover:bg-rose-50 gap-2 rounded-lg"
                        onClick={() => setActiveNegotiation(bill)}
                      >
                        <Sparkles size={14} /> {bill.suggestedAction}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Priority:</span>
                  <Badge className={cn(
                    "text-[9px] font-black uppercase border-none px-2",
                    bill.priorityScore > 100 ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {bill.priorityScore > 100 ? "Critical" : bill.priorityScore > 50 ? "High" : "Standard"}
                  </Badge>
                </div>
                {bill.isFeasible ? (
                  <div className="text-emerald-500 flex items-center gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Ready to Pay</span>
                    <Check size={16} />
                  </div>
                ) : (
                  <TrendingDown className="text-rose-400 h-4 w-4" />
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
