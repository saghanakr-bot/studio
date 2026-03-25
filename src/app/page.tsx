
"use client";

import { SummaryCards } from "@/components/dashboard/summary-cards";
import { MainChart } from "@/components/dashboard/main-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { PaymentRemindersList } from "@/components/dashboard/payment-reminders-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, PlusCircle, Filter } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Cash Flow Dashboard</h1>
          <p className="text-muted-foreground">Monitor your business liquidity and upcoming commitments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" /> New Transaction
          </Button>
        </div>
      </div>

      <SummaryCards />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Cash Flow History</CardTitle>
            <CardDescription>
              Historical analysis of monthly liquidity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MainChart />
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Upcoming Payments</CardTitle>
            <CardDescription>
              Obligations due in the next 14 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentRemindersList limit={5} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Summary of your most recent activity.
              </CardDescription>
            </div>
            <Button variant="link" className="text-primary font-semibold">View all activity</Button>
          </CardHeader>
          <CardContent>
            <RecentTransactions />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
