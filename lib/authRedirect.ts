import type { Href } from 'expo-router';

export function parseAuthRedirect(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.startsWith('/')) {
    return value;
  }

  return undefined;
}

export function buildAuthHref(
  screen: 'sign-in' | 'sign-up',
  redirect?: string,
): Href {
  if (redirect) {
    return {
      pathname: `/(auth)/${screen}`,
      params: { redirect },
    };
  }

  return `/(auth)/${screen}`;
}
