
"use client";

import { PaymentCalendar } from "@/components/reminders/payment-calendar";
import { SmartPrioritization } from "@/components/reminders/smart-prioritization";
import { Button } from "@/components/ui/button";
import { Plus, BellRing, Mail, ShieldCheck, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewFinancialEntryModal } from "@/components/dashboard/new-financial-entry-modal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RemindersPage() {
  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            Financial Health & Reminders
          </h1>
          <p className="text-muted-foreground mt-1 text-base">Predictive cash flow management and obligation tracking.</p>
        </div>
        <div className="flex gap-3">
          <NewFinancialEntryModal 
            trigger={
              <Button className="bg-primary h-11 px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                <Plus className="mr-2 h-5 w-5" /> New Reminder
              </Button>
            } 
          />
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-12 items-start">
        {/* Left Column: Calendar & Info */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <Alert className="bg-blue-50 border-blue-100 text-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-xs font-bold">Intelligent Planning</AlertTitle>
            <AlertDescription className="text-xs">
              Expected income is automatically factored into your bill feasibility check. Customer payments help unlock "Risky" obligations.
            </AlertDescription>
          </Alert>
          
          <PaymentCalendar />
          
          <Card className="border-none shadow-sm bg-blue-50/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                <ShieldCheck size={20} /> Smart Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8">
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-blue-100">
                <Label htmlFor="email-alerts" className="flex flex-col gap-1 cursor-pointer">
                  <span className="font-bold text-slate-800 flex items-center gap-2">
                    <Mail size={16} /> Email Alerts
                  </span>
                  <span className="font-normal text-xs text-muted-foreground">Daily cash flow summaries</span>
                </Label>
                <Switch id="email-alerts" defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-blue-100">
                <Label htmlFor="app-notif" className="flex flex-col gap-1 cursor-pointer">
                  <span className="font-bold text-slate-800 flex items-center gap-2">
                    <BellRing size={16} /> Push Notifications
                  </span>
                  <span className="font-normal text-xs text-muted-foreground">Real-time payment risks</span>
                </Label>
                <Switch id="app-notif" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Smart Prioritization (Unified Income & Bills) */}
        <div className="lg:col-span-4 sticky top-8">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 px-1">Upcoming Items</h2>
            <SmartPrioritization />
          </div>
        </div>
      </div>
    </div>
  );
}

