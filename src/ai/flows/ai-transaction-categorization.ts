
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
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ],
  },
  prompt: `You are a professional financial auditor. Analyze the provided bank statement and extract data with 100% mathematical integrity.

1. **Verify Balances**: Extract Opening and Closing balances. 
2. **Extract Transactions**: List every transaction. MATH CHECK: (Opening Balance + Credits - Debits) MUST equal Closing Balance.
3. **Clean Data**: Remove long numeric reference codes from descriptions. Use YYYY-MM-DD for dates.
4. **Categorize**: Use business categories like Sales, Rent, Software, Marketing, etc.

Document:
{{media url=statementDataUri}}`,
});

const categorizeTransactionsFlow = ai.defineFlow(
  {
    name: 'categorizeTransactionsFlow',
    inputSchema: AICategorizationInputSchema,
    outputSchema: AICategorizationOutputSchema,
  },
  async (input) => {
    const { output } = await categorizeTransactionsPrompt(input);
    if (!output) throw new Error('AI failed to generate a response. Please try again.');
    return output;
  }
);
