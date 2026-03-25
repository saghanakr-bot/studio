"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from "lucide-react";
import { mockBalances } from "@/lib/mock-data";

export function SummaryCards() {
  const totalBalance = mockBalances.reduce((acc, curr) => acc + curr.balance, 0);

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
            Across {mockBalances.length} accounts
          </p>
        </CardContent>
      </Card>
      
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          <ArrowUpRight className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹18,450.00</div>
          <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
            <ArrowUpRight className="h-3 w-3" /> +12.5% from last month
          </p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
          <ArrowDownRight className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹12,120.00</div>
          <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
            <ArrowDownRight className="h-3 w-3" /> +4.2% from last month
          </p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-primary text-primary-foreground">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Profit Margin</CardTitle>
          <TrendingUp className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">34.3%</div>
          <p className="text-xs text-primary-foreground/70">
            Healthy business performance
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
