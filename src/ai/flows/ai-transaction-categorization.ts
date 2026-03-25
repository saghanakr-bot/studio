
'use server';
/**
 * @fileOverview An AI agent for categorizing bank statement transactions and extracting statement summaries from PDFs or Images.
 *
 * - categorizeTransactions - A function that handles the AI-powered extraction and categorization.
 * - AICategorizationInput - The input type for the categorizeTransactions function.
 * - AICategorizationOutput - The return type for the categorizeTransactions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AICategorizationInputSchema = z.object({
  statementDataUri: z
    .string()
    .describe(
      "A bank statement file, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AICategorizationInput = z.infer<typeof AICategorizationInputSchema>;

const CategorizedTransactionOutputSchema = z.object({
  date: z.string().describe('The date of the transaction in YYYY-MM-DD format.'),
  description: z.string().describe('A detailed description of the transaction.'),
  amount: z.number().describe('The amount of the transaction. Positive for income, negative for expense.'),
  type: z.enum(['debit', 'credit']).describe('The type of transaction (debit or credit).'),
  transactionId: z.string().optional().describe('Unique identifier for the transaction if available.'),
  category: z.string().describe('The categorized spending category (e.g., "Groceries", "Utilities", "Rent", "Salary", "Software Subscription", "Office Supplies", "Travel", "Dining", "Loan Payment", "Sales Revenue", "Service Fees").'),
  subCategory: z.string().optional().describe('A more specific sub-category if applicable.'),
});

const AICategorizationOutputSchema = z.object({
  categorizedTransactions: z.array(CategorizedTransactionOutputSchema).describe('A list of bank statement transactions extracted from the document.'),
  summary: z.object({
    closingBalance: z.number().describe('The ending balance found on the statement footer.'),
    statementPeriod: z.string().optional().describe('The date range of the statement.'),
    currency: z.string().default('INR').describe('The currency detected in the statement.'),
  }).describe('Financial summary extracted from the statement.'),
});
export type AICategorizationOutput = z.infer<typeof AICategorizationOutputSchema>;

export async function categorizeTransactions(input: AICategorizationInput): Promise<AICategorizationOutput> {
  return categorizeTransactionsFlow(input);
}

const categorizeTransactionsPrompt = ai.definePrompt({
  name: 'categorizeTransactionsPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: AICategorizationInputSchema },
  output: { schema: AICategorizationOutputSchema },
  prompt: `You are an expert financial assistant specialized in analyzing business bank statements.
You will be provided with a bank statement in PDF or Image format.

Your tasks:
1. Extract ALL transactions listed in the document.
2. Categorize each transaction into an appropriate business spending or income category.
3. Extract the statement's Closing Balance.
4. Identify the statement period and currency.

Common business categories include:
- **Income**: Sales Revenue, Service Fees, Loan Disbursement, Interest Income
- **Operating Expenses**: Rent, Utilities, Salaries & Wages, Office Supplies, Software Subscriptions, Marketing, Advertising, Travel, Business Meals
- **Asset Purchases**: Equipment, Vehicles
- **Debt Payments**: Loan Principal, Interest Expense
- **Owner's Equity**: Owner's Draw
- **Taxes**: Payroll Tax, Income Tax

Statement File:
{{media url=statementDataUri}}

Please return a JSON object matching the structure of AICategorizationOutputSchema. Extract dates accurately in YYYY-MM-DD format.`,
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
