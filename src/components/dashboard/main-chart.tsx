
"use client";

import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  ResponsiveContainer, 
  XAxis, 
  YAxis 
} from "recharts";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartConfig
} from "@/components/ui/chart";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { useMemo } from "react";
import { Loader2, TrendingUp } from "lucide-react";

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--primary))",
  },
  expense: {
    label: "Expense",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig;

export function MainChart() {
  const db = useFirestore();

  const accountsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "accounts"), orderBy("lastUpdated", "asc"));
  }, [db]);

  const { data: accounts, loading } = useCollection(accountsQuery);

  // Transform accounts into historical chart data
  const chartData = useMemo(() => {
    if (!accounts || accounts.length === 0) return [];
    
    return accounts.map(acc => ({
      date: acc.lastUpdated,
      income: acc.closingBalance > acc.openingBalance ? acc.closingBalance - acc.openingBalance : 0,
      expense: acc.openingBalance > acc.closingBalance ? acc.openingBalance - acc.closingBalance : 0,
    }));
  }, [accounts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[350px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] text-center border-2 border-dashed rounded-lg">
        <div className="bg-muted p-3 rounded-full mb-3">
          <TrendingUp className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">No Historical Data</p>
        <p className="text-xs text-muted-foreground/60 mt-1 px-8">Your cash flow history will appear here once statements are uploaded.</p>
      </div>
    );
  }

  return (
    <div className="h-[350px] w-full pt-4">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              className="text-xs font-medium fill-muted-foreground"
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              className="text-xs font-medium fill-muted-foreground"
              tickFormatter={(value) => `₹${value.toLocaleString()}`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area 
              type="monotone" 
              dataKey="income" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorIncome)" 
            />
            <Area 
              type="monotone" 
              dataKey="expense" 
              stroke="hsl(var(--accent))" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorExpense)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
