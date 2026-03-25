
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, query, where, collectionGroup } from "firebase/firestore";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export function SummaryCards() {
  const db = useFirestore();
  const { user } = useUser();
  
  // Query for all accounts to get verified balances
  const accountsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(collection(db, "accounts"), where("userId", "==", user.uid));
  }, [db, user]);

  const { data: accounts, loading: accountsLoading } = useCollection(accountsQuery);

  // Query for all transactions to calculate detailed credit/debit totals
  const transactionsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(collectionGroup(db, "transactions"), where("userId", "==", user.uid));
  }, [db, user]);

  const { data: transactions, loading: transactionsLoading } = useCollection(transactionsQuery);

  const totalBalance = useMemo(() => {
    if (!accounts || accounts.length === 0) return 0;
    return accounts.reduce((acc, curr) => acc + (curr.closingBalance || 0), 0);
  }, [accounts]);

  const totalOpening = useMemo(() => {
    if (!accounts || accounts.length === 0) return 0;
    return accounts.reduce((acc, curr) => acc + (curr.openingBalance || 0), 0);
  }, [accounts]);

  const { totalCredits, totalDebits } = useMemo(() => {
    if (!transactions || transactions.length === 0) return { totalCredits: 0, totalDebits: 0 };
    return transactions.reduce((acc, tx: any) => {
      const amount = Math.abs(tx.amount || 0);
      if (tx.type === 'credit') {
        acc.totalCredits += amount;
      } else {
        acc.totalDebits += amount;
      }
      return acc;
    }, { totalCredits: 0, totalDebits: 0 });
  }, [transactions]);

  const netChange = totalBalance - totalOpening;
  const percentageChange = totalOpening !== 0 ? ((netChange / totalOpening) * 100).toFixed(1) : "0";

  if (accountsLoading || transactionsLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-none shadow-sm h-32 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </Card>
        ))}
      </div>
    );
  }

  const hasData = accounts && accounts.length > 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-none shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-3 text-primary/10">
          <Wallet size={80} />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <p className="text-xs text-muted-foreground">
            {hasData ? `Current liquidity across ${accounts.length} accounts` : "No accounts synced yet"}
          </p>
        </CardContent>
      </Card>
      
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">₹{totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {hasData ? "Total money in" : "Awaiting statement upload"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
          <TrendingDown className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-rose-600">₹{totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {hasData ? "Total money out" : "Awaiting statement upload"}
          </p>
        </CardContent>
      </Card>

      <Card className={cn(
        "border-none shadow-sm transition-colors",
        hasData ? (netChange >= 0 ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground") : "bg-muted text-muted-foreground"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Growth</CardTitle>
          {netChange >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {hasData ? `${netChange >= 0 ? "+" : "-"}₹${Math.abs(netChange).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "No Data"}
          </div>
          <p className={cn("text-xs", hasData ? "opacity-80" : "text-muted-foreground")}>
            {hasData ? `${percentageChange}% change from opening` : "Upload a statement to begin"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
