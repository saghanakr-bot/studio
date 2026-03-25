
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { mockTransactions } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function RecentTransactions() {
  return (
    <div className="space-y-6">
      {mockTransactions.map((transaction) => (
        <div key={transaction.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarFallback className={cn(
              "text-xs font-semibold",
              transaction.type === 'credit' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
            )}>
              {transaction.description.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1 flex-1 min-w-0">
            <p className="text-sm font-medium leading-none truncate">{transaction.description}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {new Date(transaction.date).toLocaleDateString()}
              </p>
              <Badge variant="secondary" className="text-[10px] h-4 px-1 py-0 font-normal">
                {transaction.category}
              </Badge>
            </div>
          </div>
          <div className={cn(
            "ml-auto font-semibold text-sm",
            transaction.amount > 0 ? "text-emerald-600" : "text-foreground"
          )}>
            {transaction.amount > 0 ? "+" : ""}{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      ))}
    </div>
  );
}
