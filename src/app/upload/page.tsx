"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle2, Loader2, Sparkles, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { categorizeTransactions, AICategorizationOutput } from "@/ai/flows/ai-transaction-categorization";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<AICategorizationOutput | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processFile = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    
    // Mock input data simulating what would be parsed from a real file
    const mockTransactions = [
      { date: '2024-05-18', description: 'SaaS Platform Monthly', amount: -199.00, type: 'debit' as const, transactionId: 'tx_001' },
      { date: '2024-05-17', description: 'Apple Store - MacBook', amount: -2499.00, type: 'debit' as const, transactionId: 'tx_002' },
      { date: '2024-05-16', description: 'Stripe Payout - Project Alpha', amount: 8500.00, type: 'credit' as const, transactionId: 'tx_003' },
    ];

    const mockRawText = `
      STATEMENT SUMMARY
      Statement Period: May 01, 2024 - May 31, 2024
      Opening Balance: ₹45,230.50
      Closing Balance: ₹51,032.50
      Total Credits: ₹8,500.00
      Total Debits: ₹2,698.00
    `;

    try {
      const response = await categorizeTransactions({ 
        transactions: mockTransactions,
        rawText: mockRawText 
      });
      setResults(response);
      toast({
        title: "Analysis Complete",
        description: `Successfully extracted balances and categorized ${response.categorizedTransactions.length} transactions.`,
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

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Upload Bank Statements</h1>
        <p className="text-muted-foreground">Import your financial data and let Payplanr AI extract balances and organize transactions.</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Select Statement</CardTitle>
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
                  <Loader2 className="h-5 w-5 animate-spin" /> Analyzing Statement...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" /> Analyze Statement
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <Card className="border-none shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500 h-5 w-5" />
                Analysis Results
              </CardTitle>
              <CardDescription>AI-extracted summary and transaction categorization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Statement Summary Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-2 mb-1">
                    <Wallet className="h-3 w-3" /> Opening Balance
                  </p>
                  <p className="text-xl font-bold">₹{results.summary.openingBalance.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3 w-3" /> Closing Balance
                  </p>
                  <p className="text-xl font-bold text-primary">₹{results.summary.closingBalance.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-2 mb-1">
                    <TrendingDown className="h-3 w-3" /> Net Change
                  </p>
                  <p className={cn(
                    "text-xl font-bold",
                    results.summary.closingBalance - results.summary.openingBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {results.summary.closingBalance - results.summary.openingBalance >= 0 ? "+" : ""}
                    ₹{(results.summary.closingBalance - results.summary.openingBalance).toLocaleString()}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Transactions Section */}
              <div>
                <h3 className="text-sm font-semibold mb-4">Categorized Transactions</h3>
                <div className="divide-y">
                  {results.categorizedTransactions.map((tx, i) => (
                    <div key={i} className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.date}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right mr-4">
                          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
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
                          {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setResults(null)}>Reset</Button>
                <Button className="bg-primary hover:bg-primary/90">Confirm All & Update Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
