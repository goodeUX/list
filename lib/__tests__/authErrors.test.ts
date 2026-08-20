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

test('maps the Android DEVELOPER_ERROR translation to a specific message', () => {
  expect(getAuthErrorMessage({ code: 'auth/google-config-error' })).toBe(
    "Google sign-in isn't set up for this version of the app.",
  );
});

describe('unmapped codes', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

  afterEach(() => {
    warn.mockClear();
    delete process.env.EXPO_PUBLIC_DEBUG_AUTH_ERRORS;
  });

  afterAll(() => {
    warn.mockRestore();
  });

  test('logs the raw code so a device run can identify it', () => {
    getAuthErrorMessage({ code: '10' });
    expect(warn).toHaveBeenCalledWith(
      '[auth] unmapped error code',
      '10',
      expect.anything(),
    );
  });

  test('hides the raw code from the message by default', () => {
    expect(getAuthErrorMessage({ code: '10' })).toBe(
      'Something went wrong. Please try again.',
    );
  });

  test('appends the raw code when the debug flag is set', () => {
    process.env.EXPO_PUBLIC_DEBUG_AUTH_ERRORS = '1';
    expect(getAuthErrorMessage({ code: '10' })).toBe(
      'Something went wrong. Please try again. [10]',
    );
    expect(getAuthErrorMessage(new Error('boom'))).toBe(
      'Something went wrong. Please try again. [no-code]',
    );
  });
});
