"use client";

import { SummaryCards } from "@/components/dashboard/summary-cards";
import { BusinessHealthScore } from "@/components/dashboard/business-health-score";
import { Button } from "@/components/ui/button";
import { PlusCircle, Info } from "lucide-react";
import { NewFinancialEntryModal } from "@/components/dashboard/new-financial-entry-modal";
import { SmartPrioritization } from "@/components/reminders/smart-prioritization";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Cash Flow Dashboard</h1>
          <p className="text-muted-foreground">Monitor your business liquidity and health score in real-time.</p>
        </div>
        <div className="flex items-center gap-2">
          <NewFinancialEntryModal 
            trigger={
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <PlusCircle className="mr-2 h-4 w-4" /> New Transaction
              </Button>
            } 
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SummaryCards />
        <BusinessHealthScore />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Upcoming Obligations</h2>
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
            <Info size={12} />
            Prioritized by AI
          </div>
        </div>
        
        <Alert className="bg-blue-50/50 border-blue-100 text-blue-800 py-3">
          <AlertDescription className="text-xs">
            We analyze your current balance against upcoming bills to recommend the safest payment order.
          </AlertDescription>
        </Alert>

        <SmartPrioritization />
      </div>
    </div>
  );
}
