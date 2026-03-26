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
  ChevronRight,
  User,
  RefreshCw
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Transaction } from "@/lib/types";
import { generateNegotiationMessage } from "@/ai/flows/generate-negotiation-flow";
import { useToast } from "@/hooks/use-toast";

interface NegotiationCardProps {
  transaction: Transaction;
  onClose: () => void;
}

export function NegotiationCard({ transaction, onClose }: NegotiationCardProps) {
  const [activeMode, setActiveMode] = useState<"ai" | "custom">("ai");
  const [language, setLanguage] = useState<"English" | "Tamil" | "Hindi">("English");
  const [delayDays, setDelayDays] = useState("3 days");
  const [aiMessage, setAiMessage] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateNegotiationMessage({
        supplierName: transaction.description.split(":")[0] || "Supplier",
        delayDuration: delayDays,
        relationshipType: transaction.relationshipType || "Moderate",
        language,
        amount: Math.abs(transaction.amount)
      });
      setAiMessage(result.message);
    } catch (error) {
      console.error("AI Generation Error:", error);
      toast({
        variant: "destructive",
        title: "AI Generation failed",
        description: "Could not create message. Please check your API key or connection."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (activeMode === 'ai' && !aiMessage && !isGenerating) {
      handleGenerate();
    }
  }, [activeMode]);

  useEffect(() => {
    if (activeMode === 'ai' && aiMessage) {
      handleGenerate();
    }
  }, [language, delayDays]);

  const currentMessage = activeMode === 'ai' ? aiMessage : customMessage;

  const getWhatsAppUrl = () => {
    const phone = transaction.contactInfo?.phone || "";
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(currentMessage)}`;
  };

  const getEmailUrl = () => {
    const email = transaction.contactInfo?.email || "";
    const subject = `Payment Update: ${transaction.description.split(":")[0] || "Transaction"}`;
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(currentMessage)}`;
  };

  const copyToClipboard = () => {
    if (!currentMessage) return;
    navigator.clipboard.writeText(currentMessage);
    toast({ title: "Copied", description: "Message copied to clipboard." });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-lg border-none shadow-2xl relative overflow-hidden rounded-3xl bg-white">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-primary to-emerald-500" />
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 rounded-full"
          onClick={onClose}
        >
          <X size={20} />
        </Button>
        
        <CardHeader className="pt-8 px-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Sparkles size={24} />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Negotiation Hub</CardTitle>
          </div>
          <CardDescription className="text-slate-500">
            Communicate professionally with <strong>{transaction.description.split(":")[0] || "Recipient"}</strong>.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-8 flex flex-col gap-6">
          <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-slate-100 rounded-xl">
              <TabsTrigger value="ai" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                <Sparkles size={14} className="text-primary" /> AI Assistant
              </TabsTrigger>
              <TabsTrigger value="custom" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                <User size={14} className="text-slate-600" /> Custom
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Extension</label>
                  <Select value={delayDays} onValueChange={setDelayDays}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100">
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
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100">
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
                <div className="absolute -top-2.5 left-4 px-2 bg-white text-[9px] font-bold text-primary uppercase tracking-widest z-10 border border-primary/20 rounded">
                  AI Generated Message
                </div>
                <div className="w-full min-h-[160px] p-6 rounded-2xl bg-slate-50 border border-slate-100 text-sm leading-relaxed text-slate-700 italic relative overflow-hidden">
                  {isGenerating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 rounded-2xl gap-3">
                      <Loader2 className="animate-spin text-primary h-6 w-6" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Crafting Message...</p>
                    </div>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap">{aiMessage || "Click regenerate to create a message..."}</div>
                      <div className="absolute bottom-2 right-2 flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-primary"
                          onClick={handleGenerate}
                          title="Regenerate"
                        >
                          <RefreshCw size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-primary"
                          onClick={copyToClipboard}
                          title="Copy"
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Message</label>
                  <Textarea 
                    placeholder="Type your manual negotiation message here..."
                    className="min-h-[200px] rounded-2xl bg-slate-50 border-slate-100 resize-none focus-visible:ring-primary shadow-inner"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              Send Via <ChevronRight size={10} />
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                asChild={!!transaction.contactInfo?.phone && !!currentMessage && !isGenerating}
                className="h-12 bg-[#25D366] hover:bg-[#128C7E] rounded-xl font-bold gap-3 text-white shadow-lg shadow-emerald-500/20"
                disabled={!transaction.contactInfo?.phone || isGenerating || !currentMessage}
              >
                {transaction.contactInfo?.phone && currentMessage && !isGenerating ? (
                  <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full h-full gap-3">
                    <MessageSquare size={18} />
                    WhatsApp
                  </a>
                ) : (
                  <>
                    <MessageSquare size={18} />
                    WhatsApp
                    {!transaction.contactInfo?.phone && <span className="text-[8px] opacity-60">(No #)</span>}
                  </>
                )}
              </Button>
              <Button 
                asChild={!!transaction.contactInfo?.email && !!currentMessage && !isGenerating}
                className="h-12 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold gap-3 text-white shadow-lg shadow-blue-500/20"
                disabled={!transaction.contactInfo?.email || isGenerating || !currentMessage}
              >
                {transaction.contactInfo?.email && currentMessage && !isGenerating ? (
                  <a href={getEmailUrl()} className="flex items-center justify-center w-full h-full gap-3">
                    <Mail size={18} />
                    Email
                  </a>
                ) : (
                  <>
                    <Mail size={18} />
                    Email
                    {!transaction.contactInfo?.email && <span className="text-[8px] opacity-60">(No Mail)</span>}
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <p className="text-[9px] text-center text-slate-400 font-medium italic">
            Proactive communication preserves business trust and credit integrity.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
