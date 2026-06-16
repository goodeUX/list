export const MATERIAL_SYMBOL_FONT = 'MaterialSymbolsOutlined';

const MATERIAL_SYMBOL_CODEPOINTS: Partial<Record<string, number>> = {
  person_edit: 0xf4fa,
};

export function getMaterialSymbolGlyph(name: string): string {
  const codepoint = MATERIAL_SYMBOL_CODEPOINTS[name];
  return codepoint !== undefined ? String.fromCodePoint(codepoint) : name;
}
