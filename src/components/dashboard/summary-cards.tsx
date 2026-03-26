
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Loader2, Info, AlertCircle, Database, RefreshCw } from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, getDocs, deleteDoc, collectionGroup } from "firebase/firestore";
import { useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function SummaryCards() {
  const db = useFirestore();
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);
  
  const accountsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "accounts"));
  }, [db]);

  const { data: accounts, loading: accountsLoading, error: accountsError } = useCollection(accountsQuery);

  const totals = useMemo(() => {
    if (!accounts || accounts.length === 0) return { opening: 0, closing: 0, net: 0, count: 0 };
    return accounts.reduce((acc, curr: any) => {
      acc.opening += (curr.openingBalance || 0);
      acc.closing += (curr.closingBalance || 0);
      acc.count += 1;
      return acc;
    }, { opening: 0, closing: 0, net: 0, count: 0 });
  }, [accounts]);

  const handleResetData = async () => {
    if (!db) return;
    setIsResetting(true);
    
    try {
      const txSnapshot = await getDocs(collectionGroup(db, "transactions"));
      const txDeletes = txSnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(txDeletes);

      const accountsSnapshot = await getDocs(collection(db, "accounts"));
      const accountDeletes = accountsSnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(accountDeletes);

      toast({
        title: "Account Reset",
        description: "All liquidity data has been reset to 0.",
      });
    } catch (error) {
      console.error("Reset Error:", error);
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: "Could not clear data.",
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (accountsLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="border-none shadow-sm h-32 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      </div>
    );
  }

  if (accountsError) {
    return (
      <div className="bg-destructive/10 p-6 rounded-xl border border-destructive/20 text-destructive space-y-3">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-bold">Connection or Permission Error</p>
        </div>
        <p className="text-xs opacity-80 leading-relaxed">
          The app couldn't reach Firestore. Please ensure you have:
          <br />1. Created a Firestore database in your project.
          <br />2. Published the security rules.
        </p>
      </div>
    );
  }

  const hasData = accounts && accounts.length > 0;

  return (
    <div className="grid gap-4 md:grid-cols-1">
      <Card className="border-none shadow-sm overflow-hidden relative bg-primary text-primary-foreground">
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <Wallet size={80} />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider">Total Business Liquidity</CardTitle>
          <div className="flex items-center gap-2">
            {hasData && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleResetData}
                disabled={isResetting}
                className="h-6 w-6 text-primary-foreground/50 hover:text-primary-foreground hover:bg-white/10"
              >
                {isResetting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              </Button>
            )}
            <Wallet className="h-4 w-4" />
            {hasData && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 opacity-70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Aggregated closing balance from all your synced records.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl md:text-4xl font-black">₹{totals.closing.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <p className="text-xs opacity-80 mt-2 font-medium">
            {hasData ? `Verified from ${totals.count} account record(s)` : "Awaiting data sync"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
