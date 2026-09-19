import { extractSharedUrl } from '@/lib/recipeImport';
import { parseRecipeFromHtml, parsePageTitleFromHtml } from '@/lib/recipeImport';

const jsonLdRecipe = `
<html><head>
<title>Pancakes - Example</title>
<meta property="og:title" content="Fluffy Pancakes">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Recipe","name":"Fluffy Pancakes",
"recipeIngredient":["2 cups flour, sifted","1 tbsp sugar","1/2 tsp salt"]}
</script>
</head><body></body></html>`;

const graphRecipe = `
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
 {"@type":"WebPage","name":"Page"},
 {"@type":["Recipe","Thing"],"name":"Graph Cake","recipeIngredient":["3 eggs","200g sugar"]}
]}
</script>`;

const microdataRecipe = `
<div itemscope itemtype="https://schema.org/Recipe">
  <h1 itemprop="name">Micro Soup</h1>
  <li itemprop="recipeIngredient">1 onion</li>
  <li itemprop="recipeIngredient">2 cups stock</li>
</div>`;

describe('extractSharedUrl', () => {
  it('returns a bare URL', () => {
    expect(extractSharedUrl('https://example.com/recipe')).toBe(
      'https://example.com/recipe',
    );
  });

  it('pulls the URL out of shared "title + link" text', () => {
    expect(
      extractSharedUrl('Best Pancakes https://example.com/pancakes'),
    ).toBe('https://example.com/pancakes');
  });

  it('trims trailing punctuation/whitespace', () => {
    expect(extractSharedUrl('see https://example.com/x).')).toBe(
      'https://example.com/x',
    );
  });

  it('returns null when there is no URL', () => {
    expect(extractSharedUrl('just some text')).toBeNull();
    expect(extractSharedUrl('')).toBeNull();
  });
});

describe('parseRecipeFromHtml', () => {
  it('reads ingredients and name from JSON-LD', () => {
    expect(parseRecipeFromHtml(jsonLdRecipe)).toEqual({
      title: 'Fluffy Pancakes',
      ingredients: ['2 cups flour, sifted', '1 tbsp sugar', '1/2 tsp salt'],
    });
  });

  it('finds a Recipe inside @graph and array @type', () => {
    expect(parseRecipeFromHtml(graphRecipe)).toEqual({
      title: 'Graph Cake',
      ingredients: ['3 eggs', '200g sugar'],
    });
  });

  it('falls back to microdata', () => {
    expect(parseRecipeFromHtml(microdataRecipe)).toEqual({
      title: 'Micro Soup',
      ingredients: ['1 onion', '2 cups stock'],
    });
  });

  it('returns empty ingredients when there is no recipe', () => {
    expect(parseRecipeFromHtml('<html><body>no recipe</body></html>')).toEqual({
      title: null,
      ingredients: [],
    });
  });
});

describe('parsePageTitleFromHtml', () => {
  it('prefers og:title', () => {
    expect(parsePageTitleFromHtml(jsonLdRecipe)).toBe('Fluffy Pancakes');
  });

  it('falls back to <title>', () => {
    expect(parsePageTitleFromHtml('<title>Just Title</title>')).toBe('Just Title');
  });

  it('returns null when nothing is present', () => {
    expect(parsePageTitleFromHtml('<html><body>x</body></html>')).toBeNull();
  });
});
