
"use client";

import { SummaryCards } from "@/components/dashboard/summary-cards";
import { MainChart } from "@/components/dashboard/main-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { PaymentRemindersList } from "@/components/dashboard/payment-reminders-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, PlusCircle, Filter, Wallet, ArrowRight, ShieldCheck, Zap, BarChart3, Loader2 } from "lucide-react";
import { NewFinancialEntryModal } from "@/components/dashboard/new-financial-entry-modal";
import { useUser, useAuth } from "@/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({
        title: "Welcome to Payplanr",
        description: "You have successfully signed in.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-16 py-12 md:py-24">
        <div className="flex flex-col items-center text-center gap-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
            <Zap size={14} />
            <span>AI-Powered Cash Flow Management</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">
            Master Your Business <span className="text-primary">Cash Flow</span> with Payplanr
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Extract insights from bank statements, track every transaction, and project your financial future with our AI-driven platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Button size="lg" className="h-14 px-8 text-lg gap-2 bg-primary hover:bg-primary/90" onClick={handleSignIn}>
              Get Started for Free <ArrowRight size={20} />
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
              View Demo
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-none shadow-md bg-white hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                <BarChart3 size={24} />
              </div>
              <CardTitle>AI Statement Analysis</CardTitle>
              <CardDescription>
                Upload PDFs or images. Our AI extracts every transaction and balance automatically.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-md bg-white hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
                <ShieldCheck size={24} />
              </div>
              <CardTitle>Real-Time Tracking</CardTitle>
              <CardDescription>
                See your verified closing balance across all accounts in a single, unified dashboard.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-md bg-white hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-2">
                <Zap size={24} />
              </div>
              <CardTitle>Smart Projections</CardTitle>
              <CardDescription>
                Plan your business growth with automated reminders and historical cash flow analysis.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="bg-slate-900 rounded-3xl p-8 md:p-16 text-white flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <h2 className="text-3xl font-bold">Ready to take control?</h2>
            <p className="text-slate-400 text-lg">
              Join hundreds of businesses using Payplanr to eliminate manual data entry and gain full financial visibility.
            </p>
          </div>
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-white h-14 px-10 text-lg" onClick={handleSignIn}>
            Sign In with Google
          </Button>
        </div>
      </div>
    );
  }

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
          
          <NewFinancialEntryModal 
            trigger={
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <PlusCircle className="mr-2 h-4 w-4" /> New Transaction
              </Button>
            } 
          />
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
