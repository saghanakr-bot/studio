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

- **Vendor**: Identify the legal name of the entity that issued this document. Look at the header.
- **Total Amount**: Find the 'Grand Total' or 'Total Due'. Ignore sub-totals unless the grand total is missing.
- **Date**: Extract the primary invoice or billing date. Format as YYYY-MM-DD.
- **Description**: Summarize the purpose of the invoice (e.g., "Cloud hosting services", "Consulting fee").
- **Category**: Assign a logical business category (e.g., "Software", "Marketing", "Professional Services").

Document Content:
{{media url=invoiceDataUri}}

Return the result as a JSON object matching ExtractInvoiceOutputSchema. Be extremely careful with the numerical 'amount'.`,
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
