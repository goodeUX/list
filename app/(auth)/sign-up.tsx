import { router, useLocalSearchParams } from 'expo-router';

import AuthJourney from '@/components/auth/AuthJourney';
import AuthScreenLayout from '@/components/auth/AuthScreenLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { buildAuthHref, parseAuthRedirect } from '@/lib/authRedirect';
import type { AuthJourneyMode } from '@/lib/authLocalState';
import { navigateAfterSignIn } from '@/lib/postAuthNavigation';
import { isPurchasesAvailable } from '@/lib/purchases';

export default function SignUpScreen() {
  const { colors } = useTheme();
  const { redirect, plan } = useLocalSearchParams<{ redirect?: string; plan?: string }>();
  const resolvedRedirect = parseAuthRedirect(redirect);
  const wantsPremium = plan === 'premium';

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  const handleSwitchMode = (mode: AuthJourneyMode) => {
    router.replace(buildAuthHref(mode === 'sign-up' ? 'sign-up' : 'sign-in', resolvedRedirect));
  };

  // Laid out like the opening screen, which shows the same journey.
  return (
    <AuthScreenLayout onBack={handleGoBack}>
      <AuthJourney
        labelBackgroundColor={colors.bg}
        mode="sign-up"
        onAuthenticated={() => {
          if (wantsPremium && isPurchasesAvailable()) {
            router.replace({
              pathname: '/(auth)/paywall',
              params: resolvedRedirect ? { redirect: resolvedRedirect } : {},
            });
            return;
          }
          return navigateAfterSignIn(resolvedRedirect);
        }}
        onSwitchMode={handleSwitchMode}
      />
    </AuthScreenLayout>
  );
}
