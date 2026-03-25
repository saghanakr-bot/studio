
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Loader2 } from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { useMemo } from "react";

export function SummaryCards() {
  const db = useFirestore();
  
  const accountsQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, "accounts");
  }, [db]);

  const { data: accounts, loading } = useCollection(accountsQuery);

  const totalBalance = useMemo(() => {
    if (!accounts) return 0;
    // We sum the closing balances of all accounts/statements synced
    return accounts.reduce((acc, curr) => acc + (curr.closingBalance || 0), 0);
  }, [accounts]);

  const totalOpening = useMemo(() => {
    if (!accounts) return 0;
    return accounts.reduce((acc, curr) => acc + (curr.openingBalance || 0), 0);
  }, [accounts]);

  const netChange = totalBalance - totalOpening;
  const percentageChange = totalOpening !== 0 ? ((netChange / totalOpening) * 100).toFixed(1) : "0";

  if (loading) {
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
          <div className="text-2xl font-bold">₹{totalBalance.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Across {accounts?.length || 0} extracted accounts
          </p>
        </CardContent>
      </Card>
      
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Liquidity Change</CardTitle>
          {netChange >= 0 ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-rose-500" />}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{Math.abs(netChange).toLocaleString()}</div>
          <p className={cn(
            "text-xs flex items-center gap-1 mt-1",
            netChange >= 0 ? "text-emerald-500" : "text-rose-500"
          )}>
            {netChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />} 
            {percentageChange}% from opening
          </p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Opening Summary</CardTitle>
          <TrendingUp className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-600">₹{totalOpening.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Total initial balance
          </p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-primary text-primary-foreground">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Health Status</CardTitle>
          <TrendingUp className="h-4 w-4 text-white" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{netChange >= 0 ? "Positive" : "Negative"}</div>
          <p className="text-xs text-primary-foreground/70">
            Based on statement analysis
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { cn } from "@/lib/utils";
