import { extractSharedUrl } from '@/lib/recipeImport';

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
