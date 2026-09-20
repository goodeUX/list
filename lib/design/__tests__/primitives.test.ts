import { palette, space, radius, fontSize, lineHeight, fontFamily } from '@/lib/design/primitives';

describe('primitives', () => {
  it('anchors each color family at step 500 (except sand)', () => {
    expect(palette.coral[500]).toBe('#FF6B5C');
    expect(palette.teal[500]).toBe('#2FA29B');
    expect(palette.butter[500]).toBe('#FFC24B');
    expect(palette.green[500]).toBe('#4CA167');
    expect(palette.red[500]).toBe('#D2322F');
    expect(palette.sand[900]).toBe('#2B2018');
    expect(palette.sand[50]).toBe('#FFF8EF');
  });

  it('exposes every ramp step 50..900', () => {
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
    for (const fam of [palette.coral, palette.teal, palette.butter, palette.green, palette.red]) {
      for (const s of steps) expect(fam[s as keyof typeof fam]).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('has matching keys for fontSize and lineHeight', () => {
    expect(Object.keys(fontSize)).toEqual(Object.keys(lineHeight));
  });

  it('exposes the spacing, radius and font-family scales', () => {
    expect(space[4]).toBe(16);
    expect(radius.md).toBe(14);
    expect(radius.full).toBe(999);
    expect(fontFamily.displayBold).toBe('Fredoka_700Bold');
    expect(fontFamily.bodyRegular).toBe('NunitoSans_400Regular');
  });
});
