import { type ParsedEntry } from './parseItemEntries';
import {
  KNOWN_UNIT_TOKENS,
  parseNumber,
  parseQuantity,
  type Quantity,
} from './quantity';

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

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&frac12;/g, '1/2')
    .replace(/&frac14;/g, '1/4')
    .replace(/&frac34;/g, '3/4')
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

function cleanText(text: string): string {
  return decodeEntities(stripHtml(text)).replace(/\s+/g, ' ').trim();
}

function extractJsonLdNodes(html: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  const regex =
    /<script[^>]*type=["']application\/ld\+json[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const visit = (node: unknown) => {
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (node && typeof node === 'object') {
        const obj = node as Record<string, unknown>;
        nodes.push(obj);
        if (Array.isArray(obj['@graph'])) {
          obj['@graph'].forEach(visit);
        }
      }
    };
    visit(parsed);
  }

  return nodes;
}

function isRecipeType(type: unknown): boolean {
  if (typeof type === 'string') {
    return type.toLowerCase() === 'recipe';
  }
  if (Array.isArray(type)) {
    return type.some(
      (entry) => typeof entry === 'string' && entry.toLowerCase() === 'recipe',
    );
  }
  return false;
}

function toIngredientList(value: unknown): string[] {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  return list
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => cleanText(entry))
    .filter((entry) => entry.length > 0);
}

function parseRecipeFromMicrodata(html: string): ParsedRecipe {
  const ingredients: string[] = [];
  const regex =
    /<(\w+)[^>]*itemprop=["']recipeIngredient["'][^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const text = cleanText(match[2]);
    if (text) {
      ingredients.push(text);
    }
  }

  let title: string | null = null;
  const nameMatch = html.match(
    /<(\w+)[^>]*itemprop=["']name["'][^>]*>([\s\S]*?)<\/\1>/i,
  );
  if (nameMatch) {
    title = cleanText(nameMatch[2]) || null;
  }

  return { title, ingredients };
}

export function parseRecipeFromHtml(html: string): ParsedRecipe {
  let jsonLdTitle: string | null = null;
  for (const node of extractJsonLdNodes(html)) {
    if (isRecipeType(node['@type'])) {
      const ingredients = toIngredientList(node['recipeIngredient']);
      const name = typeof node['name'] === 'string' ? cleanText(node['name'] as string) : '';
      if (ingredients.length > 0) {
        return { title: name || null, ingredients };
      }
      if (!jsonLdTitle && name) {
        jsonLdTitle = name;
      }
    }
  }
  const micro = parseRecipeFromMicrodata(html);
  return { title: micro.title ?? jsonLdTitle, ingredients: micro.ingredients };
}

export function parsePageTitleFromHtml(html: string): string | null {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    if (!/(?:property|name)=["']og:title["']/i.test(tag)) {
      continue;
    }
    const content = tag.match(/content=(["'])([\s\S]*?)\1/i);
    if (content) {
      const value = cleanText(content[2]);
      if (value) {
        return value;
      }
    }
  }

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) {
    return cleanText(title[1]) || null;
  }

  for (const node of extractJsonLdNodes(html)) {
    if (typeof node['name'] === 'string') {
      const name = cleanText(node['name'] as string);
      if (name) {
        return name;
      }
    }
  }

  return null;
}

const VULGAR_FRACTIONS: Record<string, string> = {
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
};

function normalizeVulgarFractions(text: string): string {
  let out = '';
  for (const char of text) {
    const replacement = VULGAR_FRACTIONS[char];
    if (replacement) {
      // "1½" -> "1 1/2" so it reads as a mixed number.
      if (out.length > 0 && /\d/.test(out[out.length - 1])) {
        out += ' ';
      }
      out += replacement;
    } else {
      out += char;
    }
  }
  return out;
}

// Imperial mass units -> grams per unit, for converting to metric on display.
const IMPERIAL_MASS: Record<string, number> = {
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
};

// Leading junk on an ingredient line: bullets, dashes, slashes, commas, spaces.
const LEADING_JUNK = /^[\s/,–—\-•*]+/;

// Remove parenthetical notes, e.g. "rice (rinsed, drained)" -> "rice". Repeats
// to handle nesting, and drops any unclosed "(" through to the end of the line.
function stripParentheticals(text: string): string {
  let previous: string;
  let out = text;
  do {
    previous = out;
    out = out.replace(/\([^()]*\)/g, ' ');
  } while (out !== previous);

  const open = out.indexOf('(');
  if (open !== -1) {
    out = out.slice(0, open);
  }
  return out.replace(/\)/g, ' ').replace(/\s+/g, ' ').trim();
}

interface QuantityCandidate {
  quantity: Quantity;
  imperial: boolean;
}

// Prefer weight over everything, metric weight over imperial, then volume,
// then cooking units, then a bare count.
function candidateRank(candidate: QuantityCandidate): number {
  const { kind } = candidate.quantity;
  if (kind === 'mass') {
    return candidate.imperial ? 4 : 5;
  }
  if (kind === 'volume') {
    return 3;
  }
  if (kind === 'cup' || kind === 'tbsp' || kind === 'tsp') {
    return 2;
  }
  return 1; // count
}

const LEADING_NUMBER = String.raw`\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?`;
const QUANTITY_TOKEN = new RegExp(`^(${LEADING_NUMBER})(\\s*)([a-zA-Z]+)?`);

/**
 * Read one or more "/"-separated quantity tokens from the front of an
 * ingredient line and pick the best (weight/metric preferred). Imperial
 * weights are converted to grams. Returns the chosen quantity and the leftover
 * name text.
 */
function extractIngredientQuantity(text: string): {
  quantity: Quantity | null;
  name: string;
} {
  let rest = text.replace(LEADING_JUNK, '');
  const candidates: QuantityCandidate[] = [];
  let first = true;

  while (rest.length > 0) {
    if (!first) {
      const separator = rest.match(/^\s*[/,]\s*/);
      if (!separator) {
        break;
      }
      rest = rest.slice(separator[0].length);
    }

    const match = rest.match(QUANTITY_TOKEN);
    if (!match) {
      break;
    }

    const value = parseNumber(match[1]);
    if (value === null) {
      break;
    }

    const spaced = match[2].length > 0;
    const unit = (match[3] ?? '').toLowerCase();

    if (!unit) {
      candidates.push({ quantity: { kind: 'count', base: value }, imperial: false });
      rest = rest.slice(match[0].length);
    } else if (KNOWN_UNIT_TOKENS.has(unit)) {
      const quantity = parseQuantity(`${match[1]}${unit}`);
      if (!quantity) {
        break;
      }
      candidates.push({ quantity, imperial: false });
      rest = rest.slice(match[0].length);
    } else if (IMPERIAL_MASS[unit] !== undefined) {
      candidates.push({
        quantity: { kind: 'mass', base: Math.round(value * IMPERIAL_MASS[unit]) },
        imperial: true,
      });
      rest = rest.slice(match[0].length);
    } else if (spaced) {
      // Unknown word after the number (e.g. "5 slices") — treat the number as a
      // count and leave the word as part of the name.
      candidates.push({ quantity: { kind: 'count', base: value }, imperial: false });
      rest = rest.slice(match[1].length + match[2].length);
      break;
    } else {
      // Letters attached to the number that aren't a unit (e.g. "3rd") — not a
      // quantity; the whole remaining text is the name.
      break;
    }

    first = false;
  }

  let chosen: QuantityCandidate | null = null;
  for (const candidate of candidates) {
    if (!chosen || candidateRank(candidate) > candidateRank(chosen)) {
      chosen = candidate;
    }
  }

  return { quantity: chosen?.quantity ?? null, name: rest.trim() };
}

export function ingredientToEntry(line: string): ParsedEntry {
  const normalized = normalizeVulgarFractions(cleanText(line));
  const withoutNotes = stripParentheticals(normalized);
  const { quantity, name } = extractIngredientQuantity(withoutNotes);
  const trimmedName = name.split(',')[0].replace(LEADING_JUNK, '').trim();
  return { name: trimmedName, quantity };
}
