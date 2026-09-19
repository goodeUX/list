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
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
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
    /itemprop=["']recipeIngredient["'][^>]*>([\s\S]*?)<\//gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const text = cleanText(match[1]);
    if (text) {
      ingredients.push(text);
    }
  }

  let title: string | null = null;
  const nameMatch = html.match(/itemprop=["']name["'][^>]*>([\s\S]*?)<\//i);
  if (nameMatch) {
    title = cleanText(nameMatch[1]) || null;
  }

  return { title, ingredients };
}

export function parseRecipeFromHtml(html: string): ParsedRecipe {
  for (const node of extractJsonLdNodes(html)) {
    if (isRecipeType(node['@type'])) {
      const ingredients = toIngredientList(node['recipeIngredient']);
      const name = typeof node['name'] === 'string' ? cleanText(node['name'] as string) : '';
      return { title: name || null, ingredients };
    }
  }

  return parseRecipeFromMicrodata(html);
}

export function parsePageTitleFromHtml(html: string): string | null {
  const og = html.match(
    /<meta[^>]+(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["']/i,
  );
  if (og) {
    return cleanText(og[1]) || null;
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
