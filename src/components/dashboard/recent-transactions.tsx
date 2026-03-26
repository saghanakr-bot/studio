
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection } from "@/firebase";
import { collectionGroup, query, orderBy, limit, doc, runTransaction } from "firebase/firestore";
import { useMemo, useState } from "react";
import { Loader2, Inbox, AlertCircle, CheckCircle, Info, Database } from "lucide-react";
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

  const handleClearTransaction = (transaction: any) => {
    if (!db || clearingId || !transaction.accountId) {
      if (!transaction.accountId) {
        toast({
          variant: "destructive",
          title: "Missing Account Info",
          description: "Cannot clear transaction: Associated account reference not found.",
        });
      }
      return;
    }
    
    setClearingId(transaction.id);

    const accountRef = doc(db, "accounts", transaction.accountId);
    const txRef = doc(db, "accounts", transaction.accountId, "transactions", transaction.id);

    runTransaction(db, async (txn) => {
      const accountDoc = await txn.get(accountRef);
      if (!accountDoc.exists()) {
        throw new Error("Target account does not exist.");
      }

      const currentBalance = Number(accountDoc.data().closingBalance || 0);
      const amount = Number(transaction.amount || 0);
      const newBalance = currentBalance + amount;

      txn.update(txRef, { 
        status: "cleared", 
        clearedAt: new Date().toISOString() 
      });
      
      txn.update(accountRef, { 
        closingBalance: newBalance,
        lastUpdated: new Date().toISOString()
      });

      return newBalance;
    })
    .then((newBalance) => {
      toast({
        title: "Transaction Cleared",
        description: `Status updated and account balance adjusted to ₹${newBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
      });
    })
    .catch(async (err: any) => {
      console.error("Clear Transaction Error:", err);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: txRef.path,
        operation: 'update',
        requestResourceData: { status: 'cleared' }
      }));
      
      toast({
        variant: "destructive",
        title: "Clear Failed",
        description: err.message || "Failed to update balance. Please try again.",
      });
    })
    .finally(() => {
      setClearingId(null);
    });
  };

  const isIndexError = error?.message?.includes("index") || (error as any)?.code === "failed-precondition";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground px-4 bg-amber-50 rounded-xl border border-amber-100">
        <div className="bg-amber-100 p-2.5 rounded-full mb-3 text-amber-600">
          <Database size={24} />
        </div>
        <p className="text-sm font-black text-slate-800 uppercase tracking-widest">
          {isIndexError ? "Database Index Required" : "Access Error"}
        </p>
        <p className="text-[10px] mt-2 max-w-[320px] leading-relaxed font-medium">
          {isIndexError 
            ? "Firestore requires a Composite Index for cross-account transaction sorting. Check the browser console (F12) for the auto-setup link." 
            : "We encountered an issue connecting to your database records."}
        </p>
        {isIndexError && (
          <div className="mt-4 p-3 bg-white/60 rounded-lg text-left w-full border border-amber-200">
            <p className="text-[9px] font-black text-amber-800 uppercase flex items-center gap-1 mb-1">
              <Info size={10} /> To fix this:
            </p>
            <p className="text-[9px] text-amber-700 leading-normal">
              Open your browser console (<strong>F12</strong>), find the red Firebase error, and click the <strong>blue URL</strong> to pre-configure your index in the Firebase Console.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-2xl">
        <div className="bg-slate-100 p-3 rounded-full mb-3 text-slate-400">
          <Inbox className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-600">No Activity Yet</p>
        <p className="text-xs text-slate-400 mt-1 max-w-[240px]">Sync a statement or add a manual entry to see activity here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {transactions.map((transaction: any) => (
        <div key={transaction.id} className="flex items-center group">
          <Avatar className="h-9 w-9">
            <AvatarFallback className={cn(
              "text-xs font-bold",
              transaction.type === 'credit' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
            )}>
              {transaction.description?.substring(0, 2).toUpperCase() || "TX"}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold leading-none truncate text-slate-900">{transaction.description}</p>
              {transaction.status === 'pending' && (
                <Badge variant="outline" className="text-[8px] h-3.5 px-1 font-black uppercase tracking-widest border-amber-200 bg-amber-50 text-amber-700">
                  Pending
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-slate-500 font-medium">
                {transaction.date ? new Date(transaction.date).toLocaleDateString() : 'No date'}
              </p>
              {transaction.category && (
                <Badge variant="secondary" className="text-[9px] h-3.5 px-1 py-0 font-bold bg-slate-100 text-slate-600 border-none">
                  {transaction.category}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={cn(
              "font-black text-sm",
              transaction.type === 'credit' ? "text-emerald-600" : "text-slate-900"
            )}>
              {transaction.type === 'credit' ? "+" : "-"}₹{Math.abs(transaction.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            
            {transaction.status === 'pending' && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 text-[10px] font-bold bg-white hover:bg-primary hover:text-white border-slate-200 transition-all gap-1 rounded-lg"
                disabled={clearingId === transaction.id}
                onClick={() => handleClearTransaction(transaction)}
              >
                {clearingId === transaction.id ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <CheckCircle size={10} />
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
