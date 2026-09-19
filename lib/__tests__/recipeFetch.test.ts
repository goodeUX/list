import { fetchAndParseRecipe } from '@/lib/recipeFetch';

describe('fetchAndParseRecipe', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches HTML and returns parsed ingredients', async () => {
    const html = `<script type="application/ld+json">
      {"@type":"Recipe","name":"T","recipeIngredient":["1 egg"]}</script>`;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(html),
    }) as unknown as typeof fetch;

    await expect(fetchAndParseRecipe('https://example.com/r')).resolves.toEqual({
      title: 'T',
      ingredients: ['1 egg'],
    });
  });

  it('throws on a non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve(''),
    }) as unknown as typeof fetch;

    await expect(fetchAndParseRecipe('https://example.com/missing')).rejects.toThrow();
  });
});
