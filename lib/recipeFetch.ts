import {
  parsePageTitleFromHtml,
  parseRecipeFromHtml,
  type ParsedRecipe,
} from '@/lib/recipeImport';

const FETCH_TIMEOUT_MS = 12000;
// A desktop-browser UA reduces bot blocking on some recipe sites.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchAndParseRecipe(url: string): Promise<ParsedRecipe> {
  return parseRecipeFromHtml(await fetchHtml(url));
}

export async function fetchPageTitle(url: string): Promise<string | null> {
  return parsePageTitleFromHtml(await fetchHtml(url));
}
