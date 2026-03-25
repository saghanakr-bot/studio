'use server';
/**
 * @fileOverview An AI agent for categorizing bank statement transactions.
 *
 * - categorizeTransactions - A function that handles the AI-powered categorization of bank transactions.
 * - AICategorizationInput - The input type for the categorizeTransactions function.
 * - AICategorizationOutput - The return type for the categorizeTransactions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TransactionInputSchema = z.object({
  date: z.string().describe('The date of the transaction in YYYY-MM-DD format.'),
  description: z.string().describe('A detailed description of the transaction.'),
  amount: z.number().describe('The amount of the transaction. Positive for income, negative for expense.'),
  type: z.enum(['debit', 'credit']).describe('The type of transaction (debit or credit).'),
  transactionId: z.string().optional().describe('Unique identifier for the transaction.'),
});

const AICategorizationInputSchema = z.object({
  transactions: z.array(TransactionInputSchema).describe('A list of bank statement transactions to categorize.'),
});
export type AICategorizationInput = z.infer<typeof AICategorizationInputSchema>;

const CategorizedTransactionOutputSchema = z.object({
  date: z.string().describe('The date of the transaction in YYYY-MM-DD format.'),
  description: z.string().describe('A detailed description of the transaction.'),
  amount: z.number().describe('The amount of the transaction. Positive for income, negative for expense.'),
  type: z.enum(['debit', 'credit']).describe('The type of transaction (debit or credit).'),
  transactionId: z.string().optional().describe('Unique identifier for the transaction.'),
  category: z.string().describe('The categorized spending category (e.g., "Groceries", "Utilities", "Rent", "Salary", "Software Subscription", "Office Supplies", "Travel", "Dining", "Loan Payment", "Sales Revenue", "Service Fees").'),
  subCategory: z.string().optional().describe('A more specific sub-category if applicable.'),
});

const AICategorizationOutputSchema = z.object({
  categorizedTransactions: z.array(CategorizedTransactionOutputSchema).describe('A list of bank statement transactions with added categories.'),
});
export type AICategorizationOutput = z.infer<typeof AICategorizationOutputSchema>;

export async function categorizeTransactions(input: AICategorizationInput): Promise<AICategorizationOutput> {
  return categorizeTransactionsFlow(input);
}

const categorizeTransactionsPrompt = ai.definePrompt({
  name: 'categorizeTransactionsPrompt',
  input: { schema: AICategorizationInputSchema },
  output: { schema: AICategorizationOutputSchema },
  prompt: `You are an expert financial assistant specialized in categorizing business transactions.
You will be provided with a list of raw bank statement transactions. Your task is to categorize each transaction into an appropriate business spending or income category.

Common categories for businesses include, but are not limited to:
- **Income**: Sales Revenue, Service Fees, Loan Disbursement, Interest Income, Capital Contribution
- **Operating Expenses**: Rent, Utilities, Salaries & Wages, Office Supplies, Software Subscriptions, Marketing, Advertising, Travel, Business Meals, Professional Services (Legal, Accounting), Insurance, Repairs & Maintenance, Shipping, Fuel, Bank Fees
- **Asset Purchases**: Equipment, Vehicles, Real Estate
- **Debt Payments**: Loan Principal, Interest Expense
- **Owner's Equity**: Owner's Draw
- **Taxes**: Payroll Tax, Income Tax

Analyze the 'description', 'amount', and 'type' fields for each transaction to determine the most fitting primary 'category'.
If a more specific 'subCategory' can be inferred, include it.
If a transaction description is too generic, try to infer based on typical business expenses and the amount.

Here are the transactions to categorize:
{{{JSON.stringify transactions}}}

Please return the categorized transactions in a JSON object with a single key 'categorizedTransactions' which is an array of objects, matching the structure of CategorizedTransactionOutputSchema. Each object in the array should include all original fields plus the 'category' and optionally 'subCategory' fields.
`,
});

const categorizeTransactionsFlow = ai.defineFlow(
  {
    name: 'categorizeTransactionsFlow',
    inputSchema: AICategorizationInputSchema,
    outputSchema: AICategorizationOutputSchema,
  },
  async (input) => {
    const { output } = await categorizeTransactionsPrompt(input);
    return output!;
  }
);
