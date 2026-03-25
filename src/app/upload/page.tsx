"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { categorizeTransactions } from "@/ai/flows/ai-transaction-categorization";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processFile = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    
    const mockInputData = [
      { date: '2024-05-18', description: 'SaaS Platform Monthly', amount: -199.00, type: 'debit' as const, transactionId: 'tx_001' },
      { date: '2024-05-17', description: 'Apple Store - MacBook', amount: -2499.00, type: 'debit' as const, transactionId: 'tx_002' },
      { date: '2024-05-16', description: 'Stripe Payout - Project Alpha', amount: 8500.00, type: 'credit' as const, transactionId: 'tx_003' },
    ];

    try {
      const response = await categorizeTransactions({ transactions: mockInputData });
      setResults(response.categorizedTransactions);
      toast({
        title: "Categorization Complete",
        description: `Successfully processed ${response.categorizedTransactions.length} transactions with AI.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error processing transactions",
        description: "There was a problem with the AI categorization service.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Upload Bank Statements</h1>
        <p className="text-muted-foreground">Import your financial data and let Payplanr AI organize your spending.</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Select File</CardTitle>
            <CardDescription>Supported formats: CSV, OFX, QFX (Max 10MB)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className={cn(
                "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all",
                file ? "border-primary/50 bg-primary/5" : "border-muted-foreground/20 hover:border-primary/30"
              )}
            >
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-primary font-semibold text-lg">Click to upload</span> or drag and drop
                  <p className="text-sm text-muted-foreground mt-1">Your business data is securely encrypted</p>
                </Label>
                <Input 
                  id="file-upload" 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange} 
                  accept=".csv,.ofx,.qfx"
                />
              </div>
              {file && (
                <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-background border rounded-lg shadow-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <button onClick={() => setFile(null)} className="ml-2 text-muted-foreground hover:text-destructive">×</button>
                </div>
              )}
            </div>

            <Button 
              className="w-full bg-primary hover:bg-primary/90 h-12 text-lg gap-2" 
              disabled={!file || isProcessing}
              onClick={processFile}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Processing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" /> Analyze & Categorize
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card className="border-none shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500 h-5 w-5" />
                Categorization Results
              </CardTitle>
              <CardDescription>Review the AI-suggested categories for your uploaded transactions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {results.map((tx, i) => (
                  <div key={i} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{tx.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right mr-4">
                        <Badge variant="outline" className="bg-accent/10 border-accent/30 text-accent-foreground">
                          {tx.category}
                        </Badge>
                        {tx.subCategory && (
                          <p className="text-[10px] text-muted-foreground uppercase mt-1">
                            {tx.subCategory}
                          </p>
                        )}
                      </div>
                      <div className={cn(
                        "font-bold min-w-[80px] text-right",
                        tx.amount > 0 ? "text-emerald-600" : ""
                      )}>
                        {tx.amount > 0 ? "+" : ""}₹{tx.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline">Reset</Button>
                <Button className="bg-primary hover:bg-primary/90">Confirm All & Save</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
