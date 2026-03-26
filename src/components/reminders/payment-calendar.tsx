
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from "date-fns";
import { useFirestore, useCollection } from "@/firebase";
import { collectionGroup, query } from "firebase/firestore";
import { Transaction } from "@/lib/types";

export function PaymentCalendar() {
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const db = useFirestore();
  const router = useRouter();

  // Set initial month on client to avoid hydration mismatch
  useEffect(() => {
    setCurrentMonth(new Date());
  }, []);

  const transactionsQuery = useMemo(() => {
    if (!db) return null;
    return query(collectionGroup(db, "transactions"));
  }, [db]);

  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const days = useMemo(() => {
    if (!currentMonth) return [];
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const nextMonth = () => currentMonth && setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => currentMonth && setCurrentMonth(subMonths(currentMonth, 1));

  const getDayTransactions = (day: Date) => {
    return transactions?.filter(tx => tx.date && isSameDay(new Date(tx.date), day)) || [];
  };

  const handleDateClick = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    router.push(`/expenses?date=${dateStr}`);
  };

  if (!currentMonth) return <div className="min-h-[400px] bg-slate-50/50 animate-pulse rounded-xl" />;

  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-8">
        <div>
          <CardTitle className="text-2xl font-bold">Payment Calendar</CardTitle>
          <CardDescription>Click a date to track detailed daily expenses.</CardDescription>
        </div>
        <div className="flex items-center gap-4 border rounded-lg p-1">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[100px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-t border-l">
          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
            <div key={day} className="py-3 text-center text-[10px] font-bold text-muted-foreground/60 tracking-widest border-r border-b">
              {day}
            </div>
          ))}
          {days.map((day, i) => {
            const dayTransactions = getDayTransactions(day);
            const isSelectedMonth = isSameMonth(day, currentMonth);
            const hasData = dayTransactions.length > 0;
            
            return (
              <div 
                key={day.toString()} 
                onClick={() => handleDateClick(day)}
                className={cn(
                  "min-h-[120px] p-2 border-r border-b transition-all cursor-pointer group hover:bg-slate-50 relative",
                  !isSelectedMonth ? "bg-muted/10 opacity-30" : "bg-background",
                  isToday(day) && "bg-blue-50/30"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "text-sm font-bold h-6 w-6 flex items-center justify-center rounded-full transition-colors",
                    isToday(day) ? "bg-blue-600 text-white" : "text-foreground group-hover:text-primary"
                  )}>
                    {format(day, "d")}
                  </span>
                  {hasData && (
                    <ArrowRight className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <div className="flex flex-col gap-1 overflow-hidden">
                  {dayTransactions.slice(0, 3).map((tx) => (
                    <div 
                      key={tx.id} 
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded flex items-center justify-between font-bold",
                        tx.type === 'credit' 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      )}
                    >
                      <span className="truncate">₹{Math.abs(tx.amount).toLocaleString()}</span>
                    </div>
                  ))}
                  {dayTransactions.length > 3 && (
                    <span className="text-[8px] font-bold text-muted-foreground pl-1">
                      +{dayTransactions.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
