import { readFile } from 'fs/promises';
import type { QuoteInput } from './types.js';

export async function parseQuoteJson(filePath: string): Promise<QuoteInput> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as QuoteInput;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse quote JSON: ${error.message}`);
    }
    throw new Error('Failed to parse quote JSON: Unknown error');
  }
}
