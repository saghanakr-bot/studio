
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Upload, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Building2,
  Tag,
  Clock,
  Mail,
  Phone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { extractInvoice, ExtractInvoiceOutput } from "@/ai/flows/extract-invoice-flow";
import { cn } from "@/lib/utils";
import { useFirestore } from "@/firebase";
import { collection, doc, setDoc, query, orderBy, limit, getDocs } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

function ScanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get("type") as "income" | "bill" || "bill";
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<ExtractInvoiceOutput | null>(null);
  const [relationshipType, setRelationshipType] = useState<string>("Moderate");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dueDate, setDueDate] = useState("");
  
  const { toast } = useToast();
  const db = useFirestore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFile = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const dataUri = await fileToDataUri(file);
      const response = await extractInvoice({ invoiceDataUri: dataUri, type });
      setResult(response);
      setDueDate(response.date); // Default due date to invoice date, user can refine
      toast({
        title: "Extraction Complete",
        description: `Identified ${type} of ₹${response.amount.toLocaleString()}.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Extraction failed",
        description: "Could not read the document. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const syncToDashboard = async () => {
    if (!result || !db) return;
    setIsSyncing(true);

    try {
      const accountsRef = collection(db, "accounts");
      const accountsQuery = query(accountsRef, orderBy("lastUpdated", "desc"), limit(1));
      const accountsSnapshot = await getDocs(accountsQuery);
      
      let accountId = "";
      if (!accountsSnapshot.empty) {
        accountId = accountsSnapshot.docs[0].id;
      } else {
        const newAccountRef = doc(accountsRef);
        accountId = newAccountRef.id;
        await setDoc(newAccountRef, {
          name: "Main Business Account",
          openingBalance: 0,
          closingBalance: 0,
          currency: "INR",
          lastUpdated: new Date().toISOString(),
        });
      }

      const txAmount = type === "income" ? result.amount : -result.amount;
      const txRef = doc(collection(db, "accounts", accountId, "transactions"));
      
      const txData = {
        date: result.date,
        dueDate: dueDate || result.date,
        description: `${result.vendor}: ${result.description}`,
        amount: txAmount,
        type: type === "income" ? "credit" : "debit",
        category: result.category,
        accountId: accountId,
        status: "pending",
        relationshipType,
        contactInfo: { email, phone },
        createdAt: new Date().toISOString()
      };

      setDoc(txRef, txData).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: txRef.path,
          operation: 'create',
          requestResourceData: txData
        }));
      });

      toast({
        title: "Saved as Pending",
        description: `Entry added to your obligation tracker.`,
      });

      router.push("/");
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Sync Error",
        description: "Failed to save the transaction.",
      });
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8 pb-12">
      <div className="flex items-center gap-4">
        <div className={cn(
          "p-3 rounded-xl",
          type === 'income' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
        )}>
          {type === 'income' ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary capitalize">Scan {type}</h1>
          <p className="text-muted-foreground">Store as pending to track and prioritize your cash flow.</p>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Document Upload</CardTitle>
          <CardDescription>Upload a photo or PDF of your {type}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={cn(
            "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all",
            file ? "border-primary/50 bg-primary/5" : "border-muted-foreground/20 hover:border-primary/30"
          )}>
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-primary font-semibold text-lg">Select File</span> or drag here
              </Label>
              <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="application/pdf,image/*" />
            </div>
            {file && <div className="mt-4 text-sm font-medium text-muted-foreground">{file.name}</div>}
          </div>

          <Button className="w-full h-12 text-lg gap-2" disabled={!file || isProcessing} onClick={processFile}>
            {isProcessing ? <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing...</> : <><Sparkles className="h-5 w-5" /> Extract Data</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-none shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="text-emerald-500 h-5 w-5" /> Extracted Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Building2 size={14} /> Vendor/Client</Label>
                <Input value={result.vendor} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Calendar size={14} /> Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-rose-600 font-bold"><TrendingDown size={14} /> Amount</Label>
                <Input value={`₹${result.amount.toLocaleString()}`} disabled className="bg-muted/50 font-bold" />
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
                <Input type="email" placeholder="supplier@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Phone size={14} /> WhatsApp Number</Label>
                <Input placeholder="+919988..." value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            
            <div className="pt-4 border-t flex flex-col gap-3">
              <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-xs">
                <Clock size={16} className="shrink-0 mt-0.5" />
                <p>This will be saved as <strong>Pending</strong>. It won't affect balance until cleared, but will be used for smart prioritization.</p>
              </div>
              <Button className="w-full bg-primary h-12" disabled={isSyncing} onClick={syncToDashboard}>
                {isSyncing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : `Confirm & Track ${type === 'income' ? 'Income' : 'Bill'}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin" /></div>}>
      <ScanContent />
    </Suspense>
  );
}
