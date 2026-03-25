"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Wallet, 
  Loader2, 
  CheckCircle2,
  Building2,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function ManualBalancePage() {
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [accountName, setAccountName] = useState("Main Business Account");
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [currency, setCurrency] = useState("INR");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    const opBal = parseFloat(openingBalance) || 0;
    const clBal = parseFloat(closingBalance) || 0;

    setIsSyncing(true);

    try {
      const accountRef = doc(collection(db, "accounts"));
      const accountData = {
        name: accountName,
        openingBalance: opBal,
        closingBalance: clBal,
        currency: currency,
        lastUpdated: new Date().toISOString(),
      };

      await setDoc(accountRef, accountData).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: accountRef.path,
          operation: 'create',
          requestResourceData: accountData,
        }));
      });

      toast({
        title: "Balance Updated",
        description: `New account "${accountName}" added with ₹${clBal.toLocaleString()} balance.`,
      });

      router.push("/");
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Update Error",
        description: "Failed to update balance manually.",
      });
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8 pb-12">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
          <Wallet size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Manual Bank Balance</h1>
          <p className="text-muted-foreground">Set your initial or current bank balances manually.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Establish a new account record or update your current standing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Building2 size={14} /> Account Name</Label>
                <Input required placeholder="e.g. HDFC Business Checking" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground"><TrendingUp size={14} /> Opening Balance</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 font-bold text-primary"><TrendingDown size={14} /> Current Balance</Label>
                  <Input required type="number" step="0.01" placeholder="0.00" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="pt-6 border-t">
              <Button type="submit" className="w-full bg-primary h-12 gap-2" disabled={isSyncing}>
                {isSyncing ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating...</> : <><CheckCircle2 className="h-5 w-5" /> Save Account Balance</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}