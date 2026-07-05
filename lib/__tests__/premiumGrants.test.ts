jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('@/lib/firebase', () => ({
  db: {},
}));

import { normalizePremiumGrantEmail } from '@/lib/premiumGrants';

test('lowercases and trims the email to match grant doc ids', () => {
  expect(normalizePremiumGrantEmail('  Geoff@Example.COM ')).toBe('geoff@example.com');
});

test('empty and missing emails normalize to null', () => {
  expect(normalizePremiumGrantEmail('')).toBeNull();
  expect(normalizePremiumGrantEmail('   ')).toBeNull();
  expect(normalizePremiumGrantEmail(null)).toBeNull();
  expect(normalizePremiumGrantEmail(undefined)).toBeNull();
});
