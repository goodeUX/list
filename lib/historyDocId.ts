export function historyDocId(name: string): string {
  const sanitized = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[/\\]/g, '_')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);

  if (!sanitized || sanitized === '.' || sanitized === '..') {
    return 'item';
  }

  return sanitized;
}
