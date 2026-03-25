'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase, FirebaseInstances } from './index';
import { FirebaseProvider } from './provider';
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [instances, setInstances] = useState<FirebaseInstances | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const result = initializeFirebase();
    if (result) {
      setInstances(result);
    }
    setIsLoaded(true);
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  if (!isLoaded) return null;

  if (!instances) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p>Firebase could not be initialized. This is usually due to missing environment variables.</p>
              <div className="bg-slate-900 text-slate-50 p-3 rounded-md text-xs font-mono overflow-x-auto">
                NEXT_PUBLIC_FIREBASE_API_KEY is missing
              </div>
              <p className="text-xs">Ensure you have updated your <code>.env</code> file or Vercel Environment Variables and restart the preview.</p>
            </AlertDescription>
          </Alert>
          <Button 
            onClick={handleReload} 
            className="w-full h-12 gap-2 shadow-lg"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4" />
            Reload App
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FirebaseProvider
      app={instances.app}
      db={instances.db}
      auth={instances.auth}
    >
      {children}
    </FirebaseProvider>
  );
}
