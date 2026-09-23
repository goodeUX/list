import { router, useLocalSearchParams } from 'expo-router';

import AuthJourney from '@/components/auth/AuthJourney';
import AuthScreenLayout from '@/components/auth/AuthScreenLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { buildAuthHref, buildPlanChooserHref, parseAuthRedirect } from '@/lib/authRedirect';
import type { AuthJourneyMode } from '@/lib/authLocalState';
import { navigateAfterSignIn } from '@/lib/postAuthNavigation';

export default function SignInScreen() {
  const { colors } = useTheme();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const resolvedRedirect = parseAuthRedirect(redirect);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  const handleSwitchMode = (mode: AuthJourneyMode) => {
    if (mode === 'sign-up') {
      router.replace(buildPlanChooserHref(resolvedRedirect));
      return;
    }
    router.replace(buildAuthHref('sign-in', resolvedRedirect));
  };

  // Laid out like the opening screen, which shows the same sign-in journey.
  return (
    <AuthScreenLayout onBack={handleGoBack}>
      <AuthJourney
        labelBackgroundColor={colors.bg}
        mode="sign-in"
        onAuthenticated={() => navigateAfterSignIn(resolvedRedirect)}
        onSwitchMode={handleSwitchMode}
      />
    </AuthScreenLayout>
  );
}
