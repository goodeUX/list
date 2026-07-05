import { getAuthErrorMessage, isEmailTakenError } from '@/lib/authErrors';

test('maps existing email/password codes', () => {
  expect(getAuthErrorMessage({ code: 'auth/invalid-credential' })).toBe(
    'Incorrect email or password.',
  );
  expect(getAuthErrorMessage({ code: 'auth/weak-password' })).toBe(
    'Password should be at least 6 characters.',
  );
});

test('maps new social auth codes', () => {
  expect(
    getAuthErrorMessage({ code: 'auth/account-exists-with-different-credential' }),
  ).toBe(
    'That email already uses a different sign-in method — log in the way you originally signed up.',
  );
  expect(getAuthErrorMessage({ code: 'auth/play-services-unavailable' })).toBe(
    "Google sign-in isn't available on this device.",
  );
  expect(getAuthErrorMessage({ code: 'auth/network-request-failed' })).toBe(
    'No connection. Check your internet and try again.',
  );
  expect(getAuthErrorMessage({ code: 'auth/provider-unavailable' })).toBe(
    "That sign-in method isn't available on this device.",
  );
});

test('recognises the email-already-in-use error', () => {
  expect(isEmailTakenError({ code: 'auth/email-already-in-use' })).toBe(true);
});

test('does not treat other errors as email-taken', () => {
  expect(isEmailTakenError({ code: 'auth/wrong-password' })).toBe(false);
  expect(isEmailTakenError(new Error('boom'))).toBe(false);
  expect(isEmailTakenError(undefined)).toBe(false);
  expect(isEmailTakenError(null)).toBe(false);
});

test('falls back to a generic message', () => {
  expect(getAuthErrorMessage(new Error('boom'))).toBe(
    'Something went wrong. Please try again.',
  );
  expect(getAuthErrorMessage(undefined)).toBe(
    'Something went wrong. Please try again.',
  );
});
