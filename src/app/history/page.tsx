
"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useFirestore, useCollection } from "@/firebase";
import { collectionGroup, query, where, orderBy } from "firebase/firestore";
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader2, 
  Inbox,
  Calendar,
  Tag
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function TransactionHistoryPage() {
  const db = useFirestore();

  const historyQuery = useMemo(() => {
    if (!db) return null;
    return query(
      collectionGroup(db, "transactions"),
      where("status", "==", "cleared"),
      orderBy("date", "desc")
    );
  }, [db]);

  const { data: history, loading } = useCollection(historyQuery);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <History className="h-8 w-8" />
            Transaction History
          </h1>
          <p className="text-muted-foreground">A detailed record of all your settled financial activities.</p>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="text-lg">Past Activity</CardTitle>
          <CardDescription>All cleared income and obligations.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Retrieving History...</p>
            </div>
          ) : !history || history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <Inbox className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="font-bold text-slate-800">No History Records</h3>
              <p className="text-sm text-slate-500 max-w-xs mt-1">
                Your past transactions will appear here once they are marked as cleared from the dashboard.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {history.map((tx: any) => (
                <div key={tx.id} className="p-4 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                      tx.type === 'credit' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
                    )}>
                      {tx.type === 'credit' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900 leading-none group-hover:text-primary transition-colors">{tx.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                          <Calendar size={10} />
                          {tx.date ? format(new Date(tx.date), "MMM dd, yyyy") : 'N/A'}
                        </span>
                        <Badge variant="secondary" className="text-[9px] h-4 font-bold bg-slate-100 text-slate-600 border-none">
                          <Tag size={8} className="mr-1" />
                          {tx.category || "General"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-black",
                      tx.type === 'credit' ? "text-emerald-600" : "text-slate-900"
                    )}>
                      {tx.type === 'credit' ? "+" : "-"}₹{Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
