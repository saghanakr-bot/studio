'use server';
/**
 * @fileOverview An AI agent for extracting data from single invoices or bills.
 *
 * - extractInvoice - A function that handles the AI-powered extraction.
 * - ExtractInvoiceInput - The input type for the extractInvoice function.
 * - ExtractInvoiceOutput - The return type for the extractInvoice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractInvoiceInputSchema = z.object({
  invoiceDataUri: z
    .string()
    .describe(
      "A photo or PDF of an invoice or bill, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  type: z.enum(['income', 'bill']).describe('Whether this is an income invoice (money coming in) or an expense bill (money going out).'),
});
export type ExtractInvoiceInput = z.infer<typeof ExtractInvoiceInputSchema>;

const ExtractInvoiceOutputSchema = z.object({
  date: z.string().describe('The issue date on the document in YYYY-MM-DD format.'),
  description: z.string().describe('A concise summary of the items or services listed.'),
  vendor: z.string().describe('The name of the company or individual who issued the document.'),
  amount: z.number().describe('The final total amount due, including taxes.'),
  category: z.string().describe('A suggested business category for bookkeeping.'),
  currency: z.string().default('INR').describe('The 3-letter currency code detected.'),
  taxAmount: z.number().optional().describe('The total tax amount identified (GST, VAT, etc.).'),
});
export type ExtractInvoiceOutput = z.infer<typeof ExtractInvoiceOutputSchema>;

export async function extractInvoice(input: ExtractInvoiceInput): Promise<ExtractInvoiceOutput> {
  return extractInvoiceFlow(input);
}

const extractInvoicePrompt = ai.definePrompt({
  name: 'extractInvoicePrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: ExtractInvoiceInputSchema },
  output: { schema: ExtractInvoiceOutputSchema },
  prompt: `You are an expert bookkeeping assistant. Extract precise financial data from this {{type}} document.

ANALYSIS GUIDELINES:
1. **Vendor/Client Identification**: Look at the prominent logo or header text. For bills, this is the company charging you. For income, this is your company's name or the client's name.
2. **Date Extraction**: Look for "Invoice Date", "Billing Date", or just "Date". Use YYYY-MM-DD format.
3. **Total Amount Verification**: 
   - Locate the 'Grand Total', 'Total Due', or 'Amount Payable'.
   - Verify if this total includes tax. Extract the tax amount separately if listed.
   - If there are multiple line items, ensure their sum matches the sub-total before tax.
4. **Description**: Summarize the primary nature of the transaction in 5-7 words.

Document Content:
{{media url=invoiceDataUri}}

Return the result as a JSON object matching ExtractInvoiceOutputSchema. If a field is missing, provide a logical default based on context (e.g., category "General Expense" if unclear).`,
});

const extractInvoiceFlow = ai.defineFlow(
  {
    name: 'extractInvoiceFlow',
    inputSchema: ExtractInvoiceInputSchema,
    outputSchema: ExtractInvoiceOutputSchema,
  },
  async (input) => {
    const { output } = await extractInvoicePrompt(input);
    return output!;
  }
);
