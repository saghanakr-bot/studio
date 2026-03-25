
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
  type: z.enum(['income', 'bill']).describe('Whether this is an income invoice or an expense bill.'),
});
export type ExtractInvoiceInput = z.infer<typeof ExtractInvoiceInputSchema>;

const ExtractInvoiceOutputSchema = z.object({
  date: z.string().describe('The date on the document in YYYY-MM-DD format.'),
  description: z.string().describe('A brief description of what was purchased or sold.'),
  vendor: z.string().describe('The name of the vendor or customer.'),
  amount: z.number().describe('The total amount of the invoice/bill.'),
  category: z.string().describe('A suggested business category (e.g., "Software", "Consulting", "Rent").'),
  currency: z.string().default('INR').describe('The currency detected.'),
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
  prompt: `You are a financial data entry specialist. 
Extract the key details from the provided document. It is a business {{type}}.

Document File:
{{media url=invoiceDataUri}}

Please return a JSON object with the date (YYYY-MM-DD), description, vendor name, total amount, and a suitable category. Be precise with the amount and date.`,
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
