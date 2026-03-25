
export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category?: string;
  subCategory?: string;
  status: 'cleared' | 'pending';
  priority?: 'high' | 'medium' | 'low';
  flexibility?: 'flexible' | 'fixed' | 'friendly';
};

export type PaymentReminder = {
  id: string;
  title: string;
  dueDate: string;
  amount: number;
  status: 'upcoming' | 'overdue' | 'paid';
  category: string;
};

export type AccountBalance = {
  accountName: string;
  balance: number;
  lastUpdated: string;
  accountType: 'checking' | 'savings' | 'credit';
};

export type CashFlowData = {
  date: string;
  income: number;
  expense: number;
  balance: number;
};
