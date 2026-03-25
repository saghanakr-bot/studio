
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, TrendingDown, Loader2, Info, AlertCircle } from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SummaryCards() {
  const db = useFirestore();
  
  const accountsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "accounts"));
  }, [db]);

  const { data: accounts, loading: accountsLoading, error: accountsError } = useCollection(accountsQuery);

  // We calculate balances based on the account metadata to avoid blocking on transaction collection groups
  const totals = useMemo(() => {
    if (!accounts || accounts.length === 0) return { opening: 0, closing: 0, net: 0, count: 0 };
    return accounts.reduce((acc, curr: any) => {
      acc.opening += (curr.openingBalance || 0);
      acc.closing += (curr.closingBalance || 0);
      acc.count += 1;
      return acc;
    }, { opening: 0, closing: 0, net: 0, count: 0 });
  }, [accounts]);

  const netChange = totals.closing - totals.opening;
  const percentageChange = totals.opening !== 0 ? ((netChange / totals.opening) * 100).toFixed(1) : "0";

  if (accountsLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border-none shadow-sm h-32 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </Card>
        ))}
      </div>
    );
  }

  if (accountsError) {
    return (
      <div className="bg-destructive/10 p-6 rounded-xl border border-destructive/20 text-destructive flex items-center gap-3">
        <AlertCircle className="h-5 w-5" />
        <p className="text-sm font-medium">Failed to load financial data. Please check your connection or database permissions.</p>
      </div>
    );
  }

  const hasData = accounts && accounts.length > 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-none shadow-sm overflow-hidden relative bg-primary text-primary-foreground">
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <Wallet size={80} />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {hasData && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 opacity-70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Aggregated closing balance from your synced records.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{totals.closing.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <p className="text-xs opacity-80 mt-1">
            {hasData ? `Verified from ${totals.count} record(s)` : "No data synced"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Change</CardTitle>
          <div className={cn("p-1 rounded-full", netChange >= 0 ? "bg-emerald-100" : "bg-rose-100")}>
            {netChange >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : <TrendingDown className="h-3 w-3 text-rose-600" />}
          </div>
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", netChange >= 0 ? "text-emerald-600" : "text-rose-600")}>
            ₹{Math.abs(netChange).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {hasData ? "Total movement" : "Awaiting sync"}
          </p>
        </CardContent>
      </Card>

      <Card className={cn(
        "border-none shadow-sm transition-colors",
        hasData ? (netChange >= 0 ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground") : "bg-muted text-muted-foreground"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Growth %</CardTitle>
          {netChange >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {hasData ? `${percentageChange}%` : "0.0%"}
          </div>
          <p className={cn("text-xs", hasData ? "opacity-80" : "text-muted-foreground")}>
            {hasData ? `Performance over period` : "Awaiting data"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
