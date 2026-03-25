"use client";

import { mockReminders } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle, CheckCircle2 } from "lucide-react";

export function PaymentRemindersList({ limit }: { limit?: number }) {
  const reminders = limit ? mockReminders.slice(0, limit) : mockReminders;

  return (
    <div className="space-y-6">
      {reminders.map((reminder) => (
        <div key={reminder.id} className="flex items-start gap-4 group">
          <div className={cn(
            "mt-1 p-2 rounded-lg",
            reminder.status === 'overdue' ? "bg-rose-50 text-rose-600" : 
            reminder.status === 'upcoming' ? "bg-amber-50 text-amber-600" : 
            "bg-emerald-50 text-emerald-600"
          )}>
            {reminder.status === 'overdue' ? <AlertCircle size={18} /> : 
             reminder.status === 'upcoming' ? <Calendar size={18} /> : 
             <CheckCircle2 size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                {reminder.title}
              </p>
              <p className="text-sm font-bold">₹{reminder.amount.toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                Due {new Date(reminder.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              <Badge 
                variant={reminder.status === 'overdue' ? 'destructive' : 'secondary'}
                className="text-[9px] h-3.5 px-1 py-0 uppercase tracking-wider"
              >
                {reminder.status}
              </Badge>
            </div>
          </div>
        </div>
      ))}
      
      {reminders.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground italic">No upcoming reminders</p>
        </div>
      )}
    </div>
  );
}
