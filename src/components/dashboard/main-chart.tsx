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
import { mockCashFlowHistory } from "@/lib/mock-data";

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
  return (
    <div className="h-[350px] w-full pt-4">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockCashFlowHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
              className="text-xs font-medium fill-muted-foreground"
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              className="text-xs font-medium fill-muted-foreground"
              tickFormatter={(value) => `₹${value/1000}k`}
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
