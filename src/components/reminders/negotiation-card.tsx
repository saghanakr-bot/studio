
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  X, 
  Mail, 
  MessageSquare, 
  Sparkles, 
  Globe, 
  Loader2,
  Copy,
  ExternalLink
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Transaction } from "@/lib/types";
import { generateNegotiationMessage } from "@/ai/flows/generate-negotiation-flow";
import { useToast } from "@/hooks/use-toast";

interface NegotiationCardProps {
  transaction: Transaction;
  onClose: () => void;
}

export function NegotiationCard({ transaction, onClose }: NegotiationCardProps) {
  const [language, setLanguage] = useState<"English" | "Tamil" | "Hindi">("English");
  const [delayDays, setDelayDays] = useState("3 days");
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateNegotiationMessage({
        supplierName: transaction.description.split(":")[0],
        delayDuration: delayDays,
        relationshipType: transaction.relationshipType || "Moderate",
        language,
        amount: Math.abs(transaction.amount)
      });
      setMessage(result.message);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: "Could not create message. Please try again."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    handleGenerate();
  }, [language, delayDays]);

  const handleWhatsApp = () => {
    const phone = transaction.contactInfo?.phone || "";
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  const handleEmail = () => {
    const email = transaction.contactInfo?.email || "";
    const subject = encodeURIComponent(`Payment Update: ${transaction.description}`);
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message);
    toast({ title: "Copied", description: "Message copied to clipboard." });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-lg border-none shadow-2xl relative overflow-hidden rounded-3xl">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-cyan-400 to-primary" />
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 rounded-full"
          onClick={onClose}
        >
          <X size={20} />
        </Button>
        
        <CardHeader className="pt-8 px-8">
          <div className="flex items-center gap-3 mb-2 text-primary">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Sparkles size={24} />
            </div>
            <CardTitle className="text-2xl font-bold">Negotiation Assistant</CardTitle>
          </div>
          <CardDescription>
            AI-crafted messages based on your relationship with <strong>{transaction.description.split(":")[0]}</strong>.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-8 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Delay Period</label>
              <Select value={delayDays} onValueChange={setDelayDays}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3 days">3 Days</SelectItem>
                  <SelectItem value="1 week">1 Week</SelectItem>
                  <SelectItem value="10 days">10 Days</SelectItem>
                  <SelectItem value="Next Month">Next Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Language</label>
              <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-transparent">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-primary" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Tamil">Tamil</SelectItem>
                  <SelectItem value="Hindi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -top-3 left-4 px-2 bg-white text-[10px] font-bold text-primary uppercase tracking-wider z-10 border border-primary/20 rounded">
              Message Preview
            </div>
            <div className="w-full min-h-[160px] p-6 rounded-2xl bg-slate-50 border border-slate-100 text-sm leading-relaxed text-slate-700 italic relative">
              {isGenerating ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 rounded-2xl">
                  <Loader2 className="animate-spin text-primary h-6 w-6" />
                </div>
              ) : (
                <>
                  {message}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute bottom-2 right-2 h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={copyToClipboard}
                  >
                    <Copy size={14} />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <Button 
              className="h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold gap-2 text-white"
              onClick={handleWhatsApp}
              disabled={!transaction.contactInfo?.phone}
            >
              <MessageSquare size={18} />
              WhatsApp
              {!transaction.contactInfo?.phone && <span className="text-[8px] opacity-50 ml-1">(No #)</span>}
            </Button>
            <Button 
              className="h-12 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold gap-2 text-white"
              onClick={handleEmail}
              disabled={!transaction.contactInfo?.email}
            >
              <Mail size={18} />
              Email
              {!transaction.contactInfo?.email && <span className="text-[8px] opacity-50 ml-1">(No Email)</span>}
            </Button>
          </div>
          
          <p className="text-[10px] text-center text-slate-400 font-medium">
            Negotiation helps preserve business credit and trust during tight cash flow periods.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
