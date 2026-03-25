"use client";

import { SummaryCards } from "@/components/dashboard/summary-cards";
import { BusinessHealthScore } from "@/components/dashboard/business-health-score";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { NewFinancialEntryModal } from "@/components/dashboard/new-financial-entry-modal";

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

      <div className="mt-8 p-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center bg-slate-50/50">
        <div className="p-4 bg-white rounded-full shadow-sm mb-4">
          <PlusCircle className="h-8 w-8 text-primary/40" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Your Activity Hub</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-2">
          As you add transactions and sync statements, detailed insights and projections will automatically appear here.
        </p>
      </div>
    </div>
  );
}
