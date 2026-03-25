"use client";

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Keyboard, 
  Wallet,
  X
} from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

interface NewFinancialEntryModalProps {
  trigger: ReactNode;
}

export function NewFinancialEntryModal({ trigger }: NewFinancialEntryModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        <div className="p-8 bg-background">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-bold text-slate-900 mb-2">New Financial Entry</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm leading-relaxed">
              Scan documents or enter details manually to track your cash flow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Sync Bank Statement */}
            <Link href="/upload" className="block group">
              <div className="flex items-center gap-4 p-5 rounded-xl border border-blue-100 bg-blue-50/30 hover:bg-blue-50 transition-colors">
                <div className="bg-white p-2.5 rounded-lg shadow-sm border border-blue-100 text-blue-600">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-blue-800">Sync Bank Statement</h3>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-600/70 mt-0.5">Update balance & cleared transactions</p>
                </div>
              </div>
            </Link>

            <div className="grid grid-cols-2 gap-4">
              {/* Scan Income */}
              <Link href="/scan?type=income" className="block">
                <button className="w-full flex flex-col items-center justify-center p-5 rounded-xl border border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50 transition-colors text-center h-full">
                  <TrendingUp size={24} className="text-emerald-500 mb-2" />
                  <h3 className="font-bold text-emerald-700 text-sm">Scan Income</h3>
                  <p className="text-[9px] uppercase tracking-wider font-semibold text-emerald-600/60 mt-0.5">Customer Invoice</p>
                </button>
              </Link>

              {/* Scan Bill */}
              <Link href="/scan?type=bill" className="block">
                <button className="w-full flex flex-col items-center justify-center p-5 rounded-xl border border-rose-100 bg-rose-50/20 hover:bg-rose-50 transition-colors text-center h-full">
                  <TrendingDown size={24} className="text-rose-500 mb-2" />
                  <h3 className="font-bold text-rose-700 text-sm">Scan Bill</h3>
                  <p className="text-[9px] uppercase tracking-wider font-semibold text-rose-600/60 mt-0.5">Supplier Invoice</p>
                </button>
              </Link>
            </div>

            <div className="relative py-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100" />
              </div>
              <span className="relative bg-background px-4 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Or Manual</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Manual Transaction */}
              <Link href="/manual/transaction" className="block">
                <button className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200">
                  <Keyboard size={18} className="text-slate-500" />
                  <span className="font-semibold text-slate-700 text-sm">Transaction</span>
                </button>
              </Link>

              {/* Manual Bank Balance */}
              <Link href="/manual/balance" className="block">
                <button className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200">
                  <Wallet size={18} className="text-slate-500" />
                  <span className="font-semibold text-slate-700 text-sm">Bank Balance</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}