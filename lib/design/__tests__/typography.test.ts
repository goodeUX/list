import { typography } from '@/lib/design/typography';

describe('typography', () => {
  it('exposes every token with family, size and line height', () => {
    const tokens = ['display', 'h1', 'h2', 'title', 'bodyL', 'body', 'bodyS', 'label', 'caption'] as const;
    for (const t of tokens) {
      expect(typography[t].fontFamily).toBeTruthy();
      expect(typography[t].fontSize).toBeGreaterThan(0);
      expect(typography[t].lineHeight).toBeGreaterThan(0);
    }
  });

  it('uses Fredoka for headings and Nunito Sans for body', () => {
    expect(typography.h1.fontFamily).toBe('Fredoka_700Bold');
    expect(typography.h2.fontFamily).toBe('Fredoka_600SemiBold');
    expect(typography.body.fontFamily).toBe('NunitoSans_400Regular');
    expect(typography.label.fontFamily).toBe('NunitoSans_600SemiBold');
  });
});
