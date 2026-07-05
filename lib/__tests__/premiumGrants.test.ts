jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('@/lib/firebase', () => ({
  db: {},
}));

import { doc, onSnapshot } from 'firebase/firestore';

import { normalizePremiumGrantEmail, subscribeToPremiumGrant } from '@/lib/premiumGrants';

test('lowercases and trims the email to match grant doc ids', () => {
  expect(normalizePremiumGrantEmail('  Geoff@Example.COM ')).toBe('geoff@example.com');
});

test('empty and missing emails normalize to null', () => {
  expect(normalizePremiumGrantEmail('')).toBeNull();
  expect(normalizePremiumGrantEmail('   ')).toBeNull();
  expect(normalizePremiumGrantEmail(null)).toBeNull();
  expect(normalizePremiumGrantEmail(undefined)).toBeNull();
});

test('the error path resolves to no grant', () => {
  const unsubscribe = jest.fn();
  (onSnapshot as jest.Mock).mockImplementation((_ref, _onNext, onError) => {
    onError(new Error('permission denied'));
    return unsubscribe;
  });

  const onChange = jest.fn();
  const result = subscribeToPremiumGrant('geoff@example.com', onChange);

  expect(onChange).toHaveBeenCalledWith(false);
  expect(typeof result).toBe('function');
});

test('a missing email short-circuits without touching firestore', () => {
  (doc as jest.Mock).mockClear();
  (onSnapshot as jest.Mock).mockClear();

  const onChange = jest.fn();
  const result = subscribeToPremiumGrant(null, onChange);

  expect(onChange).toHaveBeenCalledWith(false);
  expect(doc).not.toHaveBeenCalled();
  expect(onSnapshot).not.toHaveBeenCalled();
  expect(typeof result).toBe('function');
});

test('the happy-path subscription returns an unsubscribe function', () => {
  const unsubscribe = jest.fn();
  (onSnapshot as jest.Mock).mockImplementation((_ref, onNext) => {
    onNext({ exists: () => true });
    return unsubscribe;
  });

  const onChange = jest.fn();
  const result = subscribeToPremiumGrant('geoff@example.com', onChange);

  expect(onChange).toHaveBeenCalledWith(true);
  expect(result).toBe(unsubscribe);
});
