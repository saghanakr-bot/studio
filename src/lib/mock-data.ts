
import { Transaction, PaymentReminder, AccountBalance, CashFlowData } from './types';

export const mockBalances: AccountBalance[] = [
  { accountName: 'Business Checking', balance: 45230.50, lastUpdated: '2024-05-15', accountType: 'checking' },
  { accountName: 'Operational Savings', balance: 12400.00, lastUpdated: '2024-05-15', accountType: 'savings' },
  { accountName: 'Corporate Credit Card', balance: -2150.75, lastUpdated: '2024-05-14', accountType: 'credit' },
];

export const mockTransactions: Transaction[] = [
  { id: '1', date: '2024-05-14', description: 'Amazon Web Services', amount: -245.00, type: 'debit', category: 'Software Subscription', status: 'cleared' },
  { id: '2', date: '2024-05-12', description: 'Client Payment - Acme Corp', amount: 4500.00, type: 'credit', category: 'Sales Revenue', status: 'cleared' },
  { id: '3', date: '2024-05-10', description: 'Office Rent - May', amount: -3200.00, type: 'debit', category: 'Rent', status: 'cleared' },
  { id: '4', date: '2024-05-08', description: 'Starbucks Coffee', amount: -12.50, type: 'debit', category: 'Dining', status: 'cleared' },
  { id: '5', date: '2024-05-05', description: 'Google Ads', amount: -500.00, type: 'debit', category: 'Marketing', status: 'cleared' },
];

export const mockReminders: PaymentReminder[] = [
  { id: 'r1', title: 'Office Electricity Bill', dueDate: '2024-05-20', amount: 150.00, status: 'upcoming', category: 'Utilities' },
  { id: 'r2', title: 'Payroll Q2', dueDate: '2024-05-25', amount: 12000.00, status: 'upcoming', category: 'Salaries' },
  { id: 'r3', title: 'Software License Renewal', dueDate: '2024-05-14', amount: 89.99, status: 'overdue', category: 'Software Subscription' },
];

export const mockCashFlowHistory: CashFlowData[] = [
  { date: '2024-01-01', income: 15000, expense: 12000, balance: 3000 },
  { date: '2024-02-01', income: 18000, expense: 13000, balance: 8000 },
  { date: '2024-03-01', income: 22000, expense: 14000, balance: 16000 },
  { date: '2024-04-01', income: 17000, expense: 15000, balance: 18000 },
  { date: '2024-05-01', income: 19000, expense: 12500, balance: 24500 },
];
