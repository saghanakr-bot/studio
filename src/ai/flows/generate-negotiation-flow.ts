
'use server';
/**
 * @fileOverview An AI agent for generating professional payment negotiation messages in multiple languages.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNegotiationInputSchema = z.object({
  supplierName: z.string(),
  delayDuration: z.string().describe('e.g. "3 days", "1 week"'),
  relationshipType: z.enum(['Strict', 'Moderate', 'Flexible', 'Friendly']),
  language: z.enum(['English', 'Tamil', 'Hindi']),
  amount: z.number().optional(),
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
  prompt: `You are a professional business mediator. Generate a polite and professional payment negotiation message.

Context:
- Supplier: {{{supplierName}}}
- Requested Delay: {{{delayDuration}}}
- Relationship Flexibility: {{{relationshipType}}}
- Target Language: {{{language}}}
{{#if amount}}- Amount Involved: {{{amount}}}{{/if}}

Guidelines:
1. Tone: Professional and empathetic. If "Strict", be very formal and apologetic. If "Friendly", be warm but clear.
2. Structure: Acknowledge the delay, state the reason (cash flow constraints), propose the specific new date/duration, and thank them.
3. Translate: Ensure the message is perfectly translated into {{{language}}}.

Output the final message text only in the message field.`,
});

const generateNegotiationFlow = ai.defineFlow(
  {
    name: 'generateNegotiationFlow',
    inputSchema: GenerateNegotiationInputSchema,
    outputSchema: GenerateNegotiationOutputSchema,
  },
  async (input) => {
    const { output } = await negotiationPrompt(input);
    if (!output) throw new Error('AI failed to generate message.');
    return output;
  }
);
