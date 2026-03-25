
"use client";

import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, query, where, limit as firestoreLimit } from "firebase/firestore";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle, CheckCircle2, Loader2, BellOff } from "lucide-react";

export function PaymentRemindersList({ limit }: { limit?: number }) {
  const db = useFirestore();
  const { user } = useUser();

  // In a real app, reminders might be in their own collection.
  // For now, we'll check if the user has any synced accounts to determine if we show mock or real empty states.
  const accountsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(collection(db, "accounts"), where("userId", "==", user.uid), firestoreLimit(1));
  }, [db, user]);

  const { data: accounts, loading } = useCollection(accountsQuery);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasData = accounts && accounts.length > 0;

  // Since we don't have a reminders collection yet, we show an empty state if no accounts exist
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="bg-muted p-2 rounded-full mb-2">
          <BellOff className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No reminders active</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Upload a statement to generate smart alerts.</p>
      </div>
    );
  }

  // Placeholder for when we have actual data syncing
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground italic">No upcoming reminders detected in your last statement.</p>
      </div>
    </div>
  );
}
