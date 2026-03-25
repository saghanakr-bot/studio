
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collectionGroup, query, where, orderBy, limit } from "firebase/firestore";
import { useMemo } from "react";
import { Loader2, Inbox } from "lucide-react";

export function RecentTransactions() {
  const db = useFirestore();
  const { user } = useUser();

  const transactionsQuery = useMemo(() => {
    if (!db || !user) return null;
    // We use collectionGroup to find all "transactions" sub-collections belonging to this user
    return query(
      collectionGroup(db, "transactions"),
      where("userId", "==", user.uid),
      orderBy("date", "desc"),
      limit(5)
    );
  }, [db, user]);

  const { data: transactions, loading } = useCollection(transactionsQuery);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
              {transaction.description.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1 flex-1 min-w-0">
            <p className="text-sm font-medium leading-none truncate">{transaction.description}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {new Date(transaction.date).toLocaleDateString()}
              </p>
              <Badge variant="secondary" className="text-[10px] h-4 px-1 py-0 font-normal">
                {transaction.category}
              </Badge>
            </div>
          </div>
          <div className={cn(
            "ml-auto font-semibold text-sm",
            transaction.type === 'credit' ? "text-emerald-600" : "text-foreground"
          )}>
            {transaction.type === 'credit' ? "+" : "-"}₹{Math.abs(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      ))}
    </div>
  );
}
