
import { config } from 'dotenv';
config();

import '@/ai/flows/ai-transaction-categorization.ts';
import '@/ai/flows/extract-invoice-flow.ts';
import '@/ai/flows/generate-negotiation-flow.ts';
