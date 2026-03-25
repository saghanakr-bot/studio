"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Building2,
  Tag
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { extractInvoice, ExtractInvoiceOutput } from "@/ai/flows/extract-invoice-flow";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection } from "@/firebase";
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
      // 1. Find the primary account or create one
      const accountsRef = collection(db, "accounts");
      const accountsQuery = query(accountsRef, orderBy("lastUpdated", "desc"), limit(1));
      const accountsSnapshot = await getDocs(accountsQuery);
      
      let accountId = "";
      let currentBalance = 0;
      
      if (!accountsSnapshot.empty) {
        const accountDoc = accountsSnapshot.docs[0];
        accountId = accountDoc.id;
        currentBalance = accountDoc.data().closingBalance || 0;
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

      // 2. Calculate new balance
      const changeAmount = type === "income" ? result.amount : -result.amount;
      const newBalance = currentBalance + changeAmount;

      // 3. Update account balance (non-blocking pattern)
      const accountUpdateRef = doc(db, "accounts", accountId);
      setDoc(accountUpdateRef, { 
        closingBalance: newBalance,
        lastUpdated: new Date().toISOString() 
      }, { merge: true }).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: accountUpdateRef.path,
          operation: 'update',
          requestResourceData: { closingBalance: newBalance }
        }));
      });

      // 4. Create the transaction
      const txRef = doc(collection(db, "accounts", accountId, "transactions"));
      const txData = {
        date: result.date,
        description: `${result.vendor}: ${result.description}`,
        amount: changeAmount,
        type: type === "income" ? "credit" : "debit",
        category: result.category,
        accountId: accountId,
        status: "cleared"
      };

      setDoc(txRef, txData).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: txRef.path,
          operation: 'create',
          requestResourceData: txData
        }));
      });

      toast({
        title: "Success",
        description: `Balance updated. Redirecting to dashboard...`,
      });

      router.push("/");
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Sync Error",
        description: "Failed to update your accounts.",
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
          <p className="text-muted-foreground">Upload an invoice or bill to update your cash flow instantly.</p>
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
            {file && (
              <div className="mt-4 text-sm font-medium text-muted-foreground">{file.name}</div>
            )}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Building2 size={12} /> Vendor/Client</p>
                <p className="font-semibold">{result.vendor}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Calendar size={12} /> Date</p>
                <p className="font-semibold">{result.date}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><TrendingUp size={12} /> Amount</p>
                <p className={cn("text-xl font-bold", type === 'income' ? "text-emerald-600" : "text-rose-600")}>
                  {type === 'income' ? "+" : "-"}₹{result.amount.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Tag size={12} /> Category</p>
                <p className="font-semibold">{result.category}</p>
              </div>
            </div>
            
            <div className="pt-4 border-t flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                Syncing will {type === 'income' ? 'increase' : 'decrease'} your total balance by ₹{result.amount.toLocaleString()}.
              </p>
              <Button className="w-full bg-primary h-12" disabled={isSyncing} onClick={syncToDashboard}>
                {isSyncing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Updating Balance...</> : `Confirm & Sync ${type === 'income' ? 'Income' : 'Bill'}`}
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
