
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Keyboard, 
  Loader2, 
  Calendar,
  Building2,
  Tag,
  Mail,
  Phone,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useFirestore } from "@/firebase";
import { collection, doc, setDoc, query, orderBy, limit, getDocs } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function ManualTransactionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [type, setType] = useState<"income" | "bill">("bill");
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState("General");
  const [relationshipType, setRelationshipType] = useState("Moderate");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid positive number.",
      });
      return;
    }

    setIsSyncing(true);

    try {
      // Find or create a default account for the manual transaction
      const accountsRef = collection(db, "accounts");
      const accountsQuery = query(accountsRef, orderBy("lastUpdated", "desc"), limit(1));
      const accountsSnapshot = await getDocs(accountsQuery);
      
      let accountId = "";
      if (!accountsSnapshot.empty) {
        accountId = accountsSnapshot.docs[0].id;
      } else {
        const newAccountRef = doc(accountsRef);
        accountId = newAccountRef.id;
        const defaultAccount = {
          name: "Main Business Account",
          openingBalance: 0,
          closingBalance: 0,
          currency: "INR",
          lastUpdated: new Date().toISOString(),
        };
        // Initiate creation (non-blocking as per guidelines)
        setDoc(newAccountRef, defaultAccount).catch(e => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: newAccountRef.path,
            operation: 'create',
            requestResourceData: defaultAccount
          }));
        });
      }

      const txAmount = type === "income" ? numAmount : -numAmount;
      const txRef = doc(collection(db, "accounts", accountId, "transactions"));
      
      const txData = {
        date,
        dueDate,
        description: `${vendor}${description ? ': ' + description : ''}`,
        amount: txAmount,
        type: type === "income" ? "credit" : "debit",
        category,
        accountId: accountId,
        status: "pending",
        relationshipType,
        contactInfo: { email, phone },
        createdAt: new Date().toISOString()
      };

      // Initiate transaction creation (non-blocking)
      setDoc(txRef, txData).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: txRef.path,
          operation: 'create',
          requestResourceData: txData
        }));
      });

      toast({
        title: "Transaction Saved",
        description: `Entry added as Pending. Clear it on the dashboard to update balance.`,
      });

      router.push("/");
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "Failed to initiate manual entry.",
      });
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8 pb-12">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
          <Keyboard size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Manual Transaction</h1>
          <p className="text-muted-foreground">Enter transaction details manually for tracking.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Fill in the financial specifics of this entry.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2 col-span-2">
                <Label>Transaction Type</Label>
                <div className="flex gap-4">
                  <Button 
                    type="button"
                    variant={type === 'income' ? 'default' : 'outline'} 
                    className={cn("flex-1 gap-2", type === 'income' && "bg-emerald-600 hover:bg-emerald-700")}
                    onClick={() => setType('income')}
                  >
                    <TrendingUp size={16} /> Income
                  </Button>
                  <Button 
                    type="button"
                    variant={type === 'bill' ? 'default' : 'outline'} 
                    className={cn("flex-1 gap-2", type === 'bill' && "bg-rose-600 hover:bg-rose-700")}
                    onClick={() => setType('bill')}
                  >
                    <TrendingDown size={16} /> Bill / Expense
                  </Button>
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <Label className="flex items-center gap-2"><Building2 size={14} /> Vendor / Client Name</Label>
                <Input required placeholder="e.g. Acme Corp or Electricity Board" value={vendor} onChange={(e) => setVendor(e.target.value)} />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Short Description</Label>
                <Input placeholder="e.g. Monthly Rent or Project Payment" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-bold"><TrendingDown size={14} /> Amount (₹)</Label>
                <Input required type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Tag size={14} /> Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Rent">Rent</SelectItem>
                    <SelectItem value="Electricity">Electricity</SelectItem>
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Payroll">Payroll</SelectItem>
                    <SelectItem value="Sales">Sales Revenue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Calendar size={14} /> Transaction Date</Label>
                <Input required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Calendar size={14} /> Due Date</Label>
                <Input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Tag size={14} /> Relationship</Label>
                <Select value={relationshipType} onValueChange={setRelationshipType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Strict">Strict (No delay)</SelectItem>
                    <SelectItem value="Moderate">Moderate (Small delay)</SelectItem>
                    <SelectItem value="Flexible">Flexible (Negotiable)</SelectItem>
                    <SelectItem value="Friendly">Friendly (Partial ok)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Mail size={14} /> Contact Email</Label>
                <Input type="email" placeholder="contact@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="space-y-2 col-span-2">
                <Label className="flex items-center gap-2"><Phone size={14} /> WhatsApp Number</Label>
                <Input placeholder="+91..." value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            
            <div className="pt-6 border-t">
              <Button type="submit" className="w-full bg-primary h-12" disabled={isSyncing}>
                {isSyncing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : `Confirm & Add ${type === 'income' ? 'Income' : 'Bill'}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
