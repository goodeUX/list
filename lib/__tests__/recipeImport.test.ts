import { extractSharedUrl } from '@/lib/recipeImport';
import { parseRecipeFromHtml, parsePageTitleFromHtml } from '@/lib/recipeImport';
import { ingredientToEntry } from '@/lib/recipeImport';

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

describe('ingredientToEntry', () => {
  it('splits quantity from name and trims prep notes after a comma', () => {
    expect(ingredientToEntry('2 cups flour, sifted')).toEqual({
      name: 'flour',
      quantity: { kind: 'cup', base: 2 },
    });
    expect(ingredientToEntry('1 onion, finely chopped')).toEqual({
      name: 'onion',
      quantity: { kind: 'count', base: 1 },
    });
  });

  it('handles ASCII fractions and cooking units', () => {
    expect(ingredientToEntry('1/2 tsp salt')).toEqual({
      name: 'salt',
      quantity: { kind: 'tsp', base: 0.5 },
    });
  });

  it('normalizes unicode vulgar fractions', () => {
    expect(ingredientToEntry('½ tsp vanilla')).toEqual({
      name: 'vanilla',
      quantity: { kind: 'tsp', base: 0.5 },
    });
    expect(ingredientToEntry('1½ cups milk')).toEqual({
      name: 'milk',
      quantity: { kind: 'cup', base: 1.5 },
    });
  });

  it('keeps a name with no quantity', () => {
    expect(ingredientToEntry('salt and pepper to taste')).toEqual({
      name: 'salt and pepper to taste',
      quantity: null,
    });
  });
});

describe('parseRecipeFromHtml / parsePageTitleFromHtml edge cases', () => {
  it('reads an og:title containing an apostrophe', () => {
    expect(
      parsePageTitleFromHtml('<meta property="og:title" content="Mom\'s Apple Pie">'),
    ).toBe("Mom's Apple Pie");
  });

  it('reads an og:title with content before property', () => {
    expect(
      parsePageTitleFromHtml('<meta content="Reversed Title" property="og:title">'),
    ).toBe('Reversed Title');
  });

  it('captures a microdata ingredient with nested markup', () => {
    const html = `
    <div itemscope itemtype="https://schema.org/Recipe">
      <h1 itemprop="name">Nested Soup</h1>
      <li itemprop="recipeIngredient"><span>2 cups</span> flour</li>
    </div>`;
    expect(parseRecipeFromHtml(html)).toEqual({
      title: 'Nested Soup',
      ingredients: ['2 cups flour'],
    });
  });

  it('decodes HTML entities in ingredient text', () => {
    const html = `
    <div itemscope itemtype="https://schema.org/Recipe">
      <li itemprop="recipeIngredient">salt &amp; pepper</li>
      <li itemprop="recipeIngredient">&frac12; cup milk</li>
    </div>`;
    expect(parseRecipeFromHtml(html).ingredients).toEqual([
      'salt & pepper',
      '1/2 cup milk',
    ]);
  });

  it('parses JSON-LD with a charset parameter on the script type', () => {
    const html = `<script type="application/ld+json; charset=utf-8">
      {"@type":"Recipe","name":"Charset Cake","recipeIngredient":["1 egg"]}</script>`;
    expect(parseRecipeFromHtml(html)).toEqual({
      title: 'Charset Cake',
      ingredients: ['1 egg'],
    });
  });

  it('falls through to microdata when JSON-LD Recipe has no ingredients', () => {
    const html = `
    <script type="application/ld+json">
      {"@type":"Recipe","name":"JSON Name","recipeIngredient":[]}</script>
    <div itemscope itemtype="https://schema.org/Recipe">
      <li itemprop="recipeIngredient">1 onion</li>
    </div>`;
    expect(parseRecipeFromHtml(html)).toEqual({
      title: 'JSON Name',
      ingredients: ['1 onion'],
    });
  });
});
