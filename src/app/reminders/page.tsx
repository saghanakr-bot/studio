
"use client";

import { PaymentRemindersList } from "@/components/dashboard/payment-reminders-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BellRing, Settings, Mail, LogIn, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUser, useAuth } from "@/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function RemindersPage() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
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
      <div className="flex flex-col items-center justify-center h-[70vh] text-center gap-6">
        <div className="bg-primary/10 p-4 rounded-full">
          <BellRing className="h-12 w-12 text-primary" />
        </div>
        <div className="max-w-md">
          <h1 className="text-2xl font-bold mb-2">Sign in to view Reminders</h1>
          <p className="text-muted-foreground mb-6">
            Keep track of your upcoming business expenses and never miss a payment deadline.
          </p>
          <Button onClick={handleSignIn} size="lg" className="gap-2">
            <LogIn size={18} /> Sign In with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary uppercase flex items-center gap-3">
            <BellRing className="h-8 w-8 text-accent" /> Smart Reminders
          </h1>
          <p className="text-muted-foreground">Never miss a payment with automated alerts and due-date tracking.</p>
        </div>
        <Button size="lg" className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-5 w-5" /> New Reminder
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Active Reminders</CardTitle>
            <CardDescription>Monitor your upcoming financial commitments.</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentRemindersList />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="email-alerts" className="flex flex-col gap-1 cursor-pointer">
                  <span className="font-semibold flex items-center gap-2">
                    <Mail size={16} /> Email Alerts
                  </span>
                  <span className="font-normal text-xs text-muted-foreground">Get daily summary emails</span>
                </Label>
                <Switch id="email-alerts" defaultChecked />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="app-notif" className="flex flex-col gap-1 cursor-pointer">
                  <span className="font-semibold flex items-center gap-2">
                    <BellRing size={16} /> In-App Push
                  </span>
                  <span className="font-normal text-xs text-muted-foreground">Real-time web notifications</span>
                </Label>
                <Switch id="app-notif" defaultChecked />
              </div>
              <div className="pt-4 border-t">
                <Button variant="outline" size="sm" className="w-full">
                  <Settings className="mr-2 h-4 w-4" /> Advanced Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-accent text-accent-foreground border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Pro Tip</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed opacity-90">
                Reminders are automatically linked to your uploaded statements. When a payment is detected in your transaction history, the reminder will be marked as <strong>Paid</strong>.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
