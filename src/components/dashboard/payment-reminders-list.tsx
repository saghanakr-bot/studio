"use client";

import { useFirestore, useCollection } from "@/firebase";
import { collectionGroup, query, where, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { useMemo } from "react";
import { Loader2, BellOff, Calendar, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format, isAfter, isBefore, addDays, startOfDay } from "date-fns";

export function PaymentRemindersList({ limit = 5 }: { limit?: number }) {
  const db = useFirestore();

  const remindersQuery = useMemo(() => {
    if (!db) return null;
    try {
      // Fetch pending debits (bills/expenses) across all accounts
      return query(
        collectionGroup(db, "transactions"),
        where("status", "==", "pending"),
        where("type", "==", "debit"),
        orderBy("dueDate", "asc"),
        firestoreLimit(limit)
      );
    } catch (e) {
      console.error("Reminders query failed", e);
      return null;
    }
  }, [db, limit]);

  const { data: reminders, loading, error } = useCollection(remindersQuery);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center px-4 bg-rose-50 rounded-xl border border-rose-100">
        <AlertCircle className="h-8 w-8 text-rose-500 mb-2 opacity-50" />
        <p className="text-sm font-bold text-rose-800">Index Required</p>
        <p className="text-[10px] text-rose-600 mt-1">This view requires a composite index. Click the link in your browser console to create it.</p>
      </div>
    );
  }

  if (!reminders || reminders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-slate-100 p-3 rounded-full mb-3 text-slate-400">
          <BellOff className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-600">No Upcoming Payments</p>
        <p className="text-xs text-slate-400 mt-1 max-w-[200px]">You're all caught up! Pending bills will appear here once scanned or added.</p>
      </div>
    );
  }

  const today = startOfDay(new Date());

  return (
    <div className="space-y-4">
      {reminders.map((reminder: any) => {
        const dueDate = reminder.dueDate ? new Date(reminder.dueDate) : new Date(reminder.date);
        const isOverdue = isBefore(dueDate, today);
        const isUrgent = isBefore(dueDate, addDays(today, 3)) && !isOverdue;

        return (
          <div key={reminder.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-2.5 rounded-lg border",
                isOverdue ? "bg-rose-50 border-rose-100 text-rose-600" : 
                isUrgent ? "bg-amber-50 border-amber-100 text-amber-600" : 
                "bg-blue-50 border-blue-100 text-blue-600"
              )}>
                <Calendar size={18} />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-900 truncate max-w-[150px] md:max-w-none">{reminder.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-slate-500">
                    Due: {format(dueDate, "MMM dd, yyyy")}
                  </span>
                  {isOverdue && (
                    <Badge variant="destructive" className="text-[8px] h-3 px-1 font-black uppercase tracking-tighter">Overdue</Badge>
                  )}
                  {isUrgent && (
                    <Badge variant="outline" className="text-[8px] h-3 px-1 border-amber-200 bg-amber-50 text-amber-700 font-black uppercase tracking-tighter">Urgent</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-slate-900">₹{Math.abs(reminder.amount).toLocaleString()}</p>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">{reminder.category || 'Expense'}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
