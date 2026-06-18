/** Routes that should bypass the branded opening screen (deep links, auth, invites). */
export function shouldSkipOpeningScreen(pathname: string): boolean {
  return (
    pathname.startsWith('/join/') ||
    pathname === '/sign-in' ||
    pathname === '/sign-up' ||
    pathname.startsWith('/list/')
  );
}
