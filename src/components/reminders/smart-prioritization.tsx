
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, Check, Sparkles, AlertTriangle } from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collectionGroup, query, where, orderBy, limit } from "firebase/firestore";
import { useMemo } from "react";
import { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SmartPrioritization() {
  const db = useFirestore();

  const pendingQuery = useMemo(() => {
    if (!db) return null;
    return query(
      collectionGroup(db, "transactions"),
      where("status", "==", "pending"),
      orderBy("date", "asc"),
      limit(5)
    );
  }, [db]);

  const { data: pendingTransactions, loading } = useCollection<Transaction>(pendingQuery);

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-48 bg-muted rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Smart Prioritization</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">AI-driven payment strategy based on cash flow.</p>
      </div>

      <div className="flex flex-col gap-6">
        {pendingTransactions?.length === 0 ? (
          <Card className="border-none shadow-sm bg-muted/30 py-12 flex flex-col items-center text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">No pending obligations to prioritize.</p>
          </Card>
        ) : (
          pendingTransactions?.map((tx) => (
            <Card key={tx.id} className="border-none shadow-sm overflow-hidden group">
              <div className="h-1.5 w-full bg-orange-400" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 leading-snug">
                      {tx.description}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Calendar size={12} />
                      Due: {tx.date ? new Date(tx.date).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-rose-600">
                      ₹{Math.abs(tx.amount).toLocaleString()}
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 border-none px-0">
                      {tx.flexibility || "FLEXIBLE"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none text-[10px] font-bold px-2 py-0.5">
                    {tx.priority?.toUpperCase() || "HIGH"}
                  </Badge>
                </div>

                {/* AI Insight Box */}
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-white rounded-lg text-rose-500 shadow-sm border border-rose-100">
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-rose-700">Insufficient Funds</h4>
                      <p className="text-xs text-rose-600/80 leading-relaxed mt-1">
                        This payment will cause a cash shortage. Negotiation recommended.
                      </p>
                      <Button variant="outline" size="sm" className="mt-3 h-8 text-xs font-bold border-rose-200 bg-white text-rose-600 hover:bg-rose-50 gap-2 rounded-lg">
                        <Sparkles size={14} /> Negotiate
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Action:</span>
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Negotiate Delay</span>
                  </div>
                  <div className="text-slate-400 group-hover:text-emerald-500 transition-colors">
                    <Check size={18} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
