
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, TrendingDown, Loader2, Info } from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, collectionGroup } from "firebase/firestore";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SummaryCards() {
  const db = useFirestore();
  
  // Query for all accounts (public demo state)
  const accountsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "accounts"));
  }, [db]);

  const { data: accounts, loading: accountsLoading } = useCollection(accountsQuery);

  // Query for all transactions (public demo state)
  const transactionsQuery = useMemo(() => {
    if (!db) return null;
    return query(collectionGroup(db, "transactions"));
  }, [db]);

  const { data: transactions, loading: transactionsLoading } = useCollection(transactionsQuery);

  // Calculate the sum of all opening balances across statements
  const totalOpening = useMemo(() => {
    if (!accounts || accounts.length === 0) return 0;
    return accounts.reduce((acc, curr: any) => acc + (curr.openingBalance || 0), 0);
  }, [accounts]);

  // Calculate the sum of all closing balances (reported by statements)
  const totalClosing = useMemo(() => {
    if (!accounts || accounts.length === 0) return 0;
    return accounts.reduce((acc, curr: any) => acc + (curr.closingBalance || 0), 0);
  }, [accounts]);

  // Calculate totals for credits (income) and debits (expenses)
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

  // Derived check: Does Opening + Credits - Debits = Closing?
  const calculatedBalance = totalOpening + totalCredits - totalDebits;
  const isBalanced = Math.abs(calculatedBalance - totalClosing) < 0.01;

  // Percentage change based on the opening balance
  const netChange = totalClosing - totalOpening;
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
      <Card className="border-none shadow-sm overflow-hidden relative bg-primary text-primary-foreground">
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <Wallet size={80} />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {hasData && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 opacity-70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {isBalanced 
                        ? "Balance verified: Opening + Credits - Debits matches Closing."
                        : `Discrepancy detected: Calculated ₹${calculatedBalance.toLocaleString()} vs Reported ₹${totalClosing.toLocaleString()}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{totalClosing.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <p className="text-xs opacity-80 mt-1">
            {hasData ? `Verified closing from ${accounts.length} statement(s)` : "No statements synced"}
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
            {hasData ? "Total income extracted" : "Awaiting upload"}
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
            {hasData ? "Total expenses extracted" : "Awaiting upload"}
          </p>
        </CardContent>
      </Card>

      <Card className={cn(
        "border-none shadow-sm transition-colors",
        hasData ? (netChange >= 0 ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground") : "bg-muted text-muted-foreground"
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
            {hasData ? `${percentageChange}% change from opening` : "Upload a statement"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
