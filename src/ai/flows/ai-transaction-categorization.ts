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
  description: z.string().describe('A detailed description of the transaction, cleaned of OCR noise.'),
  amount: z.number().describe('The absolute numerical value of the transaction.'),
  type: z.enum(['debit', 'credit']).describe('The direction of the transaction: "credit" for income/deposits, "debit" for expenses/withdrawals.'),
  transactionId: z.string().optional().describe('Unique reference number or ID if found in the statement.'),
  category: z.string().describe('The business spending category (e.g., "Software", "Rent", "Revenue", "Utilities").'),
  subCategory: z.string().optional().describe('A more specific sub-category if applicable.'),
});

const AICategorizationOutputSchema = z.object({
  categorizedTransactions: z.array(CategorizedTransactionOutputSchema).describe('A list of all individual transactions found.'),
  summary: z.object({
    openingBalance: z.number().describe('The starting balance of the period.'),
    closingBalance: z.number().describe('The final ending balance shown on the statement.'),
    totalCredits: z.number().describe('Sum of all incoming funds identified.'),
    totalDebits: z.number().describe('Sum of all outgoing funds identified.'),
    statementPeriod: z.string().optional().describe('The date range covered by the statement (e.g., "Oct 2023" or "2023-01-01 to 2023-01-31").'),
    currency: z.string().default('INR').describe('The 3-letter currency code detected.'),
  }).describe('The high-level financial summary extracted from the document.'),
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
  prompt: `You are a professional financial auditor and expert OCR analyst. Your task is to analyze the provided bank statement and extract all data with 100% mathematical integrity.

FOLLOW THIS STEP-BY-STEP PROCESS:

1. **Scan Table**: Identify the transaction table. Look for columns like Date, Description, Withdrawals/Debits, Deposits/Credits, and Balance.
2. **Verification Step**: 
   - Identify the Opening Balance and Closing Balance from the document header or footer.
   - Extract every single transaction row.
   - MATH CHECK: Sum all extracted Credits and subtract all extracted Debits from the Opening Balance. This MUST equal the Closing Balance.
   - If there is a discrepancy, re-examine the OCR text for missed decimals or misread digits (e.g., 5 vs 6).
3. **Data Cleaning**:
   - Clean descriptions: Remove generic codes like "NEFT/RTGS", "CMS/", or long reference numbers. Keep the primary vendor or payer name.
   - Date Format: Convert all dates to YYYY-MM-DD.
4. **Categorization**:
   - Use standard business categories: Sales Revenue, Rent, Utilities, Salaries, Software, Marketing, Travel, Office Supplies, Tax, or Loan Payment.
   - If a transaction is an internal transfer between accounts, categorize as "Transfer".

Document Content:
{{media url=statementDataUri}}

Return the data strictly as JSON matching the AICategorizationOutputSchema. Accuracy is paramount.`,
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
