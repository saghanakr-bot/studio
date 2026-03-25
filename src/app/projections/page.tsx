
"use client";

import { CashFlowForecast } from "@/components/projections/cash-flow-forecast";
import { TrendingUp, Info, ShieldCheck, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ProjectionsPage() {
  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            Cash Flow Projections
          </h1>
          <p className="text-muted-foreground mt-1 text-base">Predictive modeling using ARIMA to forecast business liquidity.</p>
        </div>
      </div>

      <Alert className="bg-blue-50/50 border-blue-100 text-blue-800">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="font-bold">How it works</AlertTitle>
        <AlertDescription className="text-xs">
          Our ARIMA (AutoRegressive Integrated Moving Average) model analyzes your historical daily net cash flow to predict the next 30 days. Predictions improve as you sync more bank statements.
        </AlertDescription>
      </Alert>

      <CashFlowForecast />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-emerald-50/30 border border-emerald-100 flex gap-4 items-start">
          <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="font-bold text-emerald-900">Liquidity Safety</h3>
            <p className="text-xs text-emerald-700/80 mt-1">We maintain a default safety threshold of ₹10,000 or 20% of your current balance when recommending investments.</p>
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-amber-50/30 border border-amber-100 flex gap-4 items-start">
          <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="font-bold text-amber-900">Volatility Analysis</h3>
            <p className="text-xs text-amber-700/80 mt-1">Predictions are marked as "High Risk" if your historical data shows erratic spending patterns or large unplanned debits.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
