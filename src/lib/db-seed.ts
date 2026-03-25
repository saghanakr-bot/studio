
'use client';

import { Firestore, collection, doc, setDoc } from 'firebase/firestore';
import { subDays, format } from 'date-fns';

export async function seedDemoData(db: Firestore) {
  const accountId = "demo-business-account";
  const accountRef = doc(db, "accounts", accountId);

  // 1. Create a Demo Account
  const accountData = {
    name: "HDFC Business - Main",
    openingBalance: 50000,
    closingBalance: 72450.50,
    currency: "INR",
    statementPeriod: "Current Month",
    lastUpdated: new Date().toISOString(),
  };

  await setDoc(accountRef, accountData);

  // 2. Generate 30 days of transactions for ARIMA modeling
  const transactions = [];
  const today = new Date();

  for (let i = 30; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = format(date, "yyyy-MM-dd");
    
    // Random Revenue (Credit)
    if (Math.random() > 0.4) {
      transactions.push({
        date: dateStr,
        description: "Client Payment: Project " + (30 - i),
        amount: Math.floor(Math.random() * 5000) + 2000,
        type: "credit",
        category: "Sales",
        status: "cleared",
        accountId: accountId
      });
    }

    // Random Expenses (Debit)
    if (Math.random() > 0.3) {
      transactions.push({
        date: dateStr,
        description: "Vendor: Service Fees " + i,
        amount: -(Math.floor(Math.random() * 3000) + 1000),
        type: "debit",
        category: "Software",
        status: "cleared",
        accountId: accountId
      });
    }
  }

  // 3. Add some Pending Obligations (Upcoming Payments)
  const pendingData = [
    {
      date: format(subDays(today, 1), "yyyy-MM-dd"),
      dueDate: format(subDays(today, 1), "yyyy-MM-dd"),
      description: "Electricity Board (Overdue)",
      amount: -4500,
      type: "debit",
      category: "Utilities",
      status: "pending",
      relationshipType: "Strict",
      accountId: accountId
    },
    {
      date: format(today, "yyyy-MM-dd"),
      dueDate: format(addDays(today, 3), "yyyy-MM-dd"),
      description: "AWS Cloud Services",
      amount: -12000,
      type: "debit",
      category: "Software",
      status: "pending",
      relationshipType: "Moderate",
      accountId: accountId
    },
    {
      date: format(today, "yyyy-MM-dd"),
      dueDate: format(addDays(today, 10), "yyyy-MM-dd"),
      description: "Office Rent",
      amount: -25000,
      type: "debit",
      category: "Rent",
      status: "pending",
      relationshipType: "Friendly",
      accountId: accountId
    }
  ];

  function addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  // Push all transactions
  const allTx = [...transactions, ...pendingData];
  
  const txPromises = allTx.map(tx => {
    const txRef = doc(collection(db, "accounts", accountId, "transactions"));
    return setDoc(txRef, tx);
  });

  await Promise.all(txPromises);
}
