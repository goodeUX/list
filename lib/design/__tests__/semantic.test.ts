import { semantic } from '@/lib/design/semantic';
import { palette } from '@/lib/design/primitives';

describe('semantic tokens', () => {
  it('defines identical role keys for light and dark', () => {
    expect(Object.keys(semantic.light).sort()).toEqual(Object.keys(semantic.dark).sort());
  });

  it('maps core roles to the locked values in light mode', () => {
    expect(semantic.light.bg).toBe(palette.sand[50]);
    expect(semantic.light.surface).toBe(palette.sand[0]);
    expect(semantic.light.text).toBe(palette.sand[900]);
    expect(semantic.light.primary).toBe(palette.coral[500]);
    expect(semantic.light.primaryPressed).toBe(palette.coral[600]);
    expect(semantic.light.danger).toBe(palette.red[500]);
    expect(semantic.light.accent).toBe(palette.butter[500]);
    expect(semantic.light.onPrimary).toBe('#FFFFFF');
  });

  it('keeps primary distinct from danger in both modes', () => {
    expect(semantic.light.primary).not.toBe(semantic.light.danger);
    expect(semantic.dark.primary).not.toBe(semantic.dark.danger);
  });
});
