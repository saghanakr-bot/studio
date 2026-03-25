
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, TrendingUp, Wallet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Financial Reports</h1>
          <p className="text-muted-foreground text-base">In-depth analysis of your business performance.</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" /> Export All
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit & Loss</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹0.00</div>
            <p className="text-xs text-muted-foreground mt-1">Net profit for this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">General</div>
            <p className="text-xs text-muted-foreground mt-1">Highest spending area</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax Liability</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹0.00</div>
            <p className="text-xs text-muted-foreground mt-1">Estimated GST/VAT</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardHeader className="text-center py-12">
          <PieChart className="mx-auto h-12 w-12 text-muted-foreground/20 mb-4" />
          <CardTitle>Coming Soon: Dynamic Reporting</CardTitle>
          <CardDescription>
            Detailed charts and category breakdowns will appear here as you sync more data.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
