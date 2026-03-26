
"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useFirestore, useCollection } from "@/firebase";
import { collection, collectionGroup, query } from "firebase/firestore";
import { Loader2, Activity, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { subDays, isAfter, startOfDay } from "date-fns";

export function BusinessHealthScore() {
  const db = useFirestore();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  // 1. Fetch Data
  const accountsQuery = useMemo(() => (db ? query(collection(db, "accounts")) : null), [db]);
  const transactionsQuery = useMemo(() => (db ? query(collectionGroup(db, "transactions")) : null), [db]);

  const { data: accounts, loading: accountsLoading } = useCollection(accountsQuery);
  const { data: transactions, loading: txLoading } = useCollection(transactionsQuery);

  const healthData = useMemo(() => {
    if (!accounts || !transactions || !now) return null;

    // A. Inputs
    const currentBalance = accounts.reduce((sum, acc: any) => sum + (acc.closingBalance || 0), 0);
    
    const thirtyDaysAgo = subDays(now, 30);
    const totalMonthlyExpenses = transactions
      .filter((tx: any) => tx.type === 'debit' && tx.status === 'cleared' && isAfter(new Date(tx.date), thirtyDaysAgo))
      .reduce((sum, tx: any) => sum + Math.abs(tx.amount), 0);

    const pendingDebits = transactions.filter((tx: any) => tx.type === 'debit' && tx.status === 'pending');
    const totalUpcomingObligations = pendingDebits.reduce((sum, tx: any) => sum + Math.abs(tx.amount), 0);
    
    const today = startOfDay(now);
    const overduePaymentsCount = pendingDebits.filter((tx: any) => {
      const dueDate = tx.dueDate ? new Date(tx.dueDate) : new Date(tx.date);
      return dueDate < today;
    }).length;

    // B. Runway Calculation
    let runwayDays: number | null = null;
    if (totalMonthlyExpenses > 0) {
      const dailyExpense = totalMonthlyExpenses / 30;
      runwayDays = currentBalance / dailyExpense;
    } else if (currentBalance > 0) {
      runwayDays = 365; // Cap at a year if no expenses
    }

    // C. Individual Scores (0-100)
    
    // 1. Liquidity Score (40%)
    const liquidityRatio = totalUpcomingObligations > 0 ? currentBalance / totalUpcomingObligations : (currentBalance > 0 ? 2 : 0);
    let liquidityScore = 0;
    if (liquidityRatio >= 1) liquidityScore = 100;
    else if (liquidityRatio >= 0.5) liquidityScore = 60 + ((liquidityRatio - 0.5) / 0.5) * 30;
    else liquidityScore = 20 + (liquidityRatio / 0.5) * 30;

    // 2. Runway Score (25%)
    let runwayScore = 0;
    if (runwayDays === null) runwayScore = 0;
    else if (runwayDays > 30) runwayScore = 100;
    else if (runwayDays >= 15) runwayScore = 70;
    else if (runwayDays >= 5) runwayScore = 40;
    else runwayScore = 20;

    // 3. Obligation Score (20%)
    const obligationRatio = currentBalance > 0 ? totalUpcomingObligations / currentBalance : (totalUpcomingObligations > 0 ? 2 : 0);
    let obligationScore = 0;
    if (obligationRatio < 0.5) obligationScore = 100;
    else if (obligationRatio < 1) obligationScore = 70;
    else obligationScore = 30;

    // 4. Risk Score (15%)
    let riskScore = 0;
    if (overduePaymentsCount === 0) riskScore = 100;
    else if (overduePaymentsCount <= 2) riskScore = 60;
    else riskScore = 20;

    // D. Final Score
    const finalScore = Math.round(
      (0.4 * liquidityScore) + 
      (0.25 * runwayScore) + 
      (0.2 * obligationScore) + 
      (0.15 * riskScore)
    );

    let status = "Risky";
    let colorClass = "text-rose-600";
    let bgClass = "bg-rose-500";
    let borderClass = "border-rose-100";
    
    if (finalScore >= 80) {
      status = "Healthy";
      colorClass = "text-emerald-600";
      bgClass = "bg-emerald-500";
      borderClass = "border-emerald-100";
    } else if (finalScore >= 50) {
      status = "Moderate";
      colorClass = "text-amber-600";
      bgClass = "bg-amber-500";
      borderClass = "border-amber-100";
    }

    return {
      score: finalScore,
      status,
      colorClass,
      bgClass,
      borderClass,
      runwayDays,
      overdueCount: overduePaymentsCount,
      hasData: accounts.length > 0
    };
  }, [accounts, transactions, now]);

  if (accountsLoading || txLoading || !now) {
    return (
      <Card className="border-none shadow-sm h-[200px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!healthData || !healthData.hasData) {
    return (
      <Card className="border-none shadow-sm bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center gap-2">
            Business Health Score <Info size={14} className="text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <Activity size={32} className="text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground font-medium">Insufficient Data</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Sync a statement to calculate health.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-none shadow-sm overflow-hidden", healthData.borderClass)}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center gap-2">
            Business Health Score
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info size={14} className="text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] text-[10px]">
                  Real-time index based on Liquidity (40%), Runway (25%), Obligations (20%), and Risk (15%).
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <CardDescription className="text-[10px] mt-1">Based on latest activity and obligations.</CardDescription>
        </div>
        <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1", healthData.colorClass, "bg-white border shadow-sm")}>
          {healthData.status === 'Healthy' && <CheckCircle2 size={10} />}
          {healthData.status === 'Risky' && <AlertCircle size={10} />}
          {healthData.status}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-baseline gap-2 mb-4">
          <span className={cn("text-4xl font-black", healthData.colorClass)}>{healthData.score}</span>
          <span className="text-sm font-bold text-muted-foreground">/ 100</span>
        </div>
        
        <Progress value={healthData.score} className="h-2 mb-6" indicatorClassName={healthData.bgClass} />
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Estimated Runway</p>
            <p className="text-xs font-bold text-slate-700">
              {healthData.runwayDays === null ? 'N/A' : (healthData.runwayDays > 90 ? '90+ Days' : `${Math.floor(healthData.runwayDays)} Days`)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Risk Indicators</p>
            <p className={cn("text-xs font-bold", healthData.overdueCount > 0 ? "text-rose-600" : "text-emerald-600")}>
              {healthData.overdueCount === 0 ? 'No Overdue Bills' : `${healthData.overdueCount} Overdue Item(s)`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
