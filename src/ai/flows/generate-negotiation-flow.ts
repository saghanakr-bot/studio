'use server';
/**
 * @fileOverview An AI agent for generating professional payment negotiation messages in multiple languages.
 *
 * - generateNegotiationMessage - A function that handles the AI-powered message generation.
 * - GenerateNegotiationInput - The input type for the generateNegotiationMessage function.
 * - GenerateNegotiationOutput - The return type for the generateNegotiationMessage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateNegotiationInputSchema = z.object({
  supplierName: z.string().describe('The name of the supplier or client to negotiate with.'),
  delayDuration: z.string().describe('The requested delay period, e.g. "3 days", "1 week".'),
  relationshipType: z.enum(['Strict', 'Moderate', 'Flexible', 'Friendly']).describe('The existing business relationship flexibility.'),
  language: z.enum(['English', 'Tamil', 'Hindi']).describe('The target language for the message.'),
  amount: z.number().optional().describe('The amount of money involved in the transaction.'),
});
export type GenerateNegotiationInput = z.infer<typeof GenerateNegotiationInputSchema>;

const GenerateNegotiationOutputSchema = z.object({
  message: z.string().describe('The generated negotiation message in the target language.'),
});
export type GenerateNegotiationOutput = z.infer<typeof GenerateNegotiationOutputSchema>;

export async function generateNegotiationMessage(input: GenerateNegotiationInput): Promise<GenerateNegotiationOutput> {
  return generateNegotiationFlow(input);
}

const negotiationPrompt = ai.definePrompt({
  name: 'generateNegotiationPrompt',
  input: { schema: GenerateNegotiationInputSchema },
  output: { schema: GenerateNegotiationOutputSchema },
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ],
  },
  system: `You are a professional business mediator and expert linguist. 
Your goal is to generate polite, professional, and empathetic payment negotiation messages.

Guidelines:
1. Tone Adjustment: 
   - If relationship is "Strict", be very formal, concise, and deeply apologetic.
   - If "Friendly", be warm and appreciative of the partnership, while remaining clear about the delay.
   - For "Moderate" and "Flexible", maintain a standard professional balance.
2. Structure: Acknowledge the upcoming payment, state the reason for delay (cash flow constraints), propose the specific new duration ({{{delayDuration}}}), and thank them for their understanding.
3. Language: The final message MUST be perfectly translated into the requested language ({{{language}}}).
4. Constraints: Output the final message text ONLY in the message field. Do not include any meta-commentary.`,
  prompt: `Generate a payment negotiation message for the following context:

- Supplier: {{{supplierName}}}
- Requested Delay: {{{delayDuration}}}
- Relationship Flexibility: {{{relationshipType}}}
- Target Language: {{{language}}}
{{#if amount}}- Amount Involved: ₹{{{amount}}}{{/if}}`,
});

const generateNegotiationFlow = ai.defineFlow(
  {
    name: 'generateNegotiationFlow',
    inputSchema: GenerateNegotiationInputSchema,
    outputSchema: GenerateNegotiationOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await negotiationPrompt(input);
      if (!output || !output.message) {
        throw new Error('AI returned an empty or invalid response.');
      }
      return output;
    } catch (error) {
      console.error('Genkit Negotiation Flow Error:', error);
      throw new Error('Failed to generate negotiation message. Please try again.');
    }
  }
);
