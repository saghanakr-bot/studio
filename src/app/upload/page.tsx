
"use client";

import { useState } from "react";
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
  Wallet, 
  Image as ImageIcon, 
  File
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { categorizeTransactions, AICategorizationOutput } from "@/ai/flows/ai-transaction-categorization";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useFirestore } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [results, setResults] = useState<AICategorizationOutput | null>(null);
  const { toast } = useToast();
  const db = useFirestore();
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please upload a file smaller than 10MB.",
        });
        return;
      }
      setFile(selectedFile);
      setResults(null);
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
      const response = await categorizeTransactions({ statementDataUri: dataUri });
      setResults(response);
      toast({
        title: "Analysis Complete",
        description: `Extracted balance and ${response.categorizedTransactions.length} transactions.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error processing transactions",
        description: "There was a problem with the AI analysis service.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const syncToDashboard = () => {
    if (!results || !db) {
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: "Missing statement data. Please process a file first.",
      });
      return;
    }
    
    setIsSyncing(true);
    
    // Create a new account entry for this statement
    const accountRef = doc(collection(db, "accounts"));
    const accountData = {
      name: file?.name || "Extracted Statement",
      openingBalance: results.summary.openingBalance || 0,
      closingBalance: results.summary.closingBalance || 0,
      currency: results.summary.currency || "INR",
      statementPeriod: results.summary.statementPeriod || "Unknown",
      lastUpdated: new Date().toISOString(),
    };
    
    // Fire off account creation (non-blocking)
    setDoc(accountRef, accountData)
      .catch(async (e: any) => {
        const permissionError = new FirestorePermissionError({
          path: `accounts/${accountRef.id}`,
          operation: 'create',
          requestResourceData: accountData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });

    // Fire off all transactions (non-blocking)
    results.categorizedTransactions.forEach((tx) => {
      const txRef = doc(collection(db, "accounts", accountRef.id, "transactions"));
      
      const txData: any = {
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
        accountId: accountRef.id,
      };

      if (tx.transactionId) txData.transactionId = tx.transactionId;
      if (tx.subCategory) txData.subCategory = tx.subCategory;

      setDoc(txRef, txData).catch(async (e) => {
        const permissionError = new FirestorePermissionError({
          path: `accounts/${accountRef.id}/transactions/${txRef.id}`,
          operation: 'create',
          requestResourceData: txData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
    });

    toast({
      title: "Syncing Started",
      description: "Redirecting to dashboard...",
    });
    
    router.push("/");
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="h-8 w-8 text-primary" />;
    if (file.type.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-primary" />;
    if (file.type === 'application/pdf') return <FileText className="h-8 w-8 text-primary" />;
    return <File className="h-8 w-8 text-primary" />;
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Sync Bank Statement</h1>
        <p className="text-muted-foreground">Import PDFs or images to extract balances and organize transactions automatically.</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Select Statement</CardTitle>
            <CardDescription>Supported formats: PDF, PNG, JPG (Max 10MB)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn(
              "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all",
              file ? "border-primary/50 bg-primary/5" : "border-muted-foreground/20 hover:border-primary/30"
            )}>
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                {getFileIcon()}
              </div>
              <div className="text-center">
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-primary font-semibold text-lg">Click to upload</span> or drag and drop
                </Label>
                <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="application/pdf,image/*" />
              </div>
              {file && (
                <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-background border rounded-lg shadow-sm">
                  <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                  <button onClick={() => setFile(null)} className="ml-2 text-muted-foreground hover:text-destructive text-lg font-bold">×</button>
                </div>
              )}
            </div>

            <Button className="w-full bg-primary h-12 text-lg gap-2" disabled={!file || isProcessing} onClick={processFile}>
              {isProcessing ? <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing...</> : <><Sparkles className="h-5 w-5" /> Extract & Analyze</>}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <Card className="border-none shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle2 className="text-emerald-500 h-5 w-5" /> Analysis Results</CardTitle>
              <CardDescription>Extracted data for {results.summary.statementPeriod || "Statement Period"}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-2 mb-1"><TrendingUp className="h-3 w-3" /> Closing Balance</p>
                  <p className="text-xl font-bold text-primary">{(results.summary.currency || "INR")} {results.summary.closingBalance.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-2 mb-1"><TrendingDown className="h-3 w-3" /> Net Change</p>
                  <p className={cn("text-xl font-bold", results.summary.closingBalance - results.summary.openingBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {results.summary.closingBalance - results.summary.openingBalance >= 0 ? "+" : ""}
                    {(results.summary.currency || "INR")} {(results.summary.closingBalance - results.summary.openingBalance).toLocaleString()}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><FileText className="h-4 w-4" /> Extracted Transactions ({results.categorizedTransactions.length})</h3>
                <div className="divide-y max-h-[400px] overflow-y-auto pr-2">
                  {results.categorizedTransactions.map((tx, i) => (
                    <div key={i} className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.date}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="bg-primary/5 text-primary">{tx.category}</Badge>
                        <div className={cn("font-bold min-w-[80px] text-right", tx.type === 'credit' ? "text-emerald-600" : "")}>
                          {tx.type === 'credit' ? "+" : ""}{(results.summary.currency || "INR")} {Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setResults(null); setFile(null); }}>Clear</Button>
                <Button className="bg-primary" disabled={isSyncing} onClick={syncToDashboard}>
                  {isSyncing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Syncing...</> : "Confirm & Sync to Dashboard"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
