import { extractLeadingQuantity, type ParsedEntry } from './parseItemEntries';

export interface ParsedRecipe {
  title: string | null;
  ingredients: string[];
}

export function extractSharedUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/i);
  if (!match) {
    return null;
  }
  // Drop trailing punctuation that commonly rides along in shared text.
  return match[0].replace(/[.,)\]}>'"]+$/, '');
}
