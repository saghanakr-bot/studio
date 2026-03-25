
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection } from "@/firebase";
import { collectionGroup, query, orderBy, limit, doc, updateDoc, getDoc, runTransaction } from "firebase/firestore";
import { useMemo, useState } from "react";
import { Loader2, Inbox, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export function RecentTransactions() {
  const db = useFirestore();
  const { toast } = useToast();
  const [clearingId, setClearingId] = useState<string | null>(null);

  const transactionsQuery = useMemo(() => {
    if (!db) return null;
    try {
      return query(
        collectionGroup(db, "transactions"),
        orderBy("date", "desc"),
        limit(10)
      );
    } catch (e) {
      console.error("Failed to create transactions query", e);
      return null;
    }
  }, [db]);

  const { data: transactions, loading, error } = useCollection(transactionsQuery);

  const handleClearTransaction = async (transaction: any) => {
    if (!db || clearingId) return;
    setClearingId(transaction.id);

    try {
      const accountRef = doc(db, "accounts", transaction.accountId);
      const txRef = doc(db, "accounts", transaction.accountId, "transactions", transaction.id);

      await runTransaction(db, async (txn) => {
        const accountDoc = await txn.get(accountRef);
        if (!accountDoc.exists()) {
          throw new Error("Account does not exist!");
        }

        const currentBalance = accountDoc.data().closingBalance || 0;
        const newBalance = currentBalance + (transaction.amount || 0);

        // Update status and balance in one atomic transaction
        txn.update(txRef, { status: "cleared", clearedAt: new Date().toISOString() });
        txn.update(accountRef, { 
          closingBalance: newBalance,
          lastUpdated: new Date().toISOString()
        });
      });

      toast({
        title: "Transaction Cleared",
        description: `Balance updated by ₹${Math.abs(transaction.amount).toLocaleString()}.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error clearing transaction",
        description: err.message || "Failed to update balance.",
      });
      
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `accounts/${transaction.accountId}/transactions/${transaction.id}`,
        operation: 'update',
        requestResourceData: { status: 'cleared' }
      }));
    } finally {
      setClearingId(null);
    }
  };

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
        <p className="text-xs text-muted-foreground/60 mt-1">Upload a statement or scan an invoice to see activity here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {transactions.map((transaction: any) => (
        <div key={transaction.id} className="flex items-center group">
          <Avatar className="h-9 w-9">
            <AvatarFallback className={cn(
              "text-xs font-semibold",
              transaction.type === 'credit' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
            )}>
              {transaction.description?.substring(0, 2).toUpperCase() || "TX"}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none truncate">{transaction.description}</p>
              {transaction.status === 'pending' && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 border-amber-200 bg-amber-50 text-amber-700 font-bold uppercase tracking-wider flex items-center gap-0.5">
                  <Clock size={8} /> Pending
                </Badge>
              )}
            </div>
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
          
          <div className="flex items-center gap-4">
            <div className={cn(
              "font-semibold text-sm",
              transaction.type === 'credit' ? "text-emerald-600" : "text-foreground"
            )}>
              {transaction.type === 'credit' ? "+" : "-"}₹{Math.abs(transaction.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            
            {transaction.status === 'pending' && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 text-xs bg-primary/5 hover:bg-primary hover:text-white border-primary/20 transition-all gap-1"
                disabled={clearingId === transaction.id}
                onClick={() => handleClearTransaction(transaction)}
              >
                {clearingId === transaction.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <CheckCircle size={12} />
                )}
                Clear
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
