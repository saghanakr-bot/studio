
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection } from "@/firebase";
import { collectionGroup, query, orderBy, limit } from "firebase/firestore";
import { useMemo } from "react";
import { Loader2, Inbox, AlertCircle } from "lucide-react";

export function RecentTransactions() {
  const db = useFirestore();

  const transactionsQuery = useMemo(() => {
    if (!db) return null;
    // Note: collectionGroup requires an index to be manually created in the Firebase Console.
    try {
      return query(
        collectionGroup(db, "transactions"),
        orderBy("date", "desc"),
        limit(5)
      );
    } catch (e) {
      console.error("Failed to create transactions query", e);
      return null;
    }
  }, [db]);

  const { data: transactions, loading, error } = useCollection(transactionsQuery);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground px-4">
        <AlertCircle className="h-8 w-8 mb-3 opacity-20" />
        <p className="text-sm font-medium">Transaction query requires indexing.</p>
        <p className="text-xs mt-1 max-w-[280px]">If you just uploaded data, it may take a few minutes for Firestore to process global queries.</p>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-muted p-3 rounded-full mb-3">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">No Transactions Found</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Upload a statement to see recent activity here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {transactions.map((transaction: any) => (
        <div key={transaction.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarFallback className={cn(
              "text-xs font-semibold",
              transaction.type === 'credit' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
            )}>
              {transaction.description?.substring(0, 2).toUpperCase() || "TX"}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1 flex-1 min-w-0">
            <p className="text-sm font-medium leading-none truncate">{transaction.description}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {transaction.date ? new Date(transaction.date).toLocaleDateString() : 'Unknown date'}
              </p>
              {transaction.category && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1 py-0 font-normal">
                  {transaction.category}
                </Badge>
              )}
            </div>
          </div>
          <div className={cn(
            "ml-auto font-semibold text-sm",
            transaction.type === 'credit' ? "text-emerald-600" : "text-foreground"
          )}>
            {transaction.type === 'credit' ? "+" : "-"}₹{Math.abs(transaction.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      ))}
    </div>
  );
}
