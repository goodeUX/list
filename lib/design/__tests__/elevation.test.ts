import { elevation } from '@/lib/design/elevation';

describe('elevation', () => {
  it('defines e1..e3 with a warm shadow color', () => {
    for (const t of ['e1', 'e2', 'e3'] as const) {
      expect(elevation[t].shadowColor).toBe('#2B2018');
      expect((elevation[t].shadowOffset as { height: number }).height).toBeGreaterThan(0);
      expect(elevation[t].shadowRadius).toBeGreaterThan(0);
      expect(elevation[t].shadowOpacity).toBeGreaterThan(0);
    }
  });

  it('increases depth from e1 to e3', () => {
    expect(elevation.e1.shadowRadius!).toBeLessThan(elevation.e3.shadowRadius!);
  });
});
