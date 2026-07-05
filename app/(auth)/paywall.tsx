import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/Button';
import { usePlan } from '@/contexts/PlanContext';
import { useTheme } from '@/contexts/ThemeContext';
import { showAppAlert } from '@/lib/appAlert';
import { parseAuthRedirect } from '@/lib/authRedirect';
import { navigateAfterSignIn } from '@/lib/postAuthNavigation';
import {
  getPremiumPackages,
  purchasePremiumPackage,
  restorePremiumPurchases,
} from '@/lib/purchases';
import type { PremiumPackage } from '@/lib/purchasesTypes';

const PERIOD_LABEL: Record<PremiumPackage['period'], string> = {
  monthly: 'Monthly',
  annual: 'Annual',
  other: 'Other',
};

export default function PaywallScreen() {
  const { colors, radii, spacing } = useTheme();
  const { plan } = usePlan();
  const params = useLocalSearchParams<{ redirect?: string; from?: string }>();
  const resolvedRedirect = parseAuthRedirect(params.redirect);
  const fromSettings = params.from === 'settings';

  const [packages, setPackages] = useState<PremiumPackage[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);
  const hasFinishedRef = useRef(false);

  const finish = () => {
    if (hasFinishedRef.current) {
      return;
    }
    hasFinishedRef.current = true;
    if (fromSettings && router.canGoBack()) {
      router.back();
      return;
    }
    // Settings entry with an unrestorable stack (deep link/restored session)
    // falls through to the default post-auth destination.
    void navigateAfterSignIn(resolvedRedirect);
  };

  // Already premium (e.g. a comped account mid-signup, or a completed
  // purchase reflected by the entitlement listener): nothing to sell.
  useEffect(() => {
    if (plan === 'premium' && busy === null) {
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  useEffect(() => {
    let active = true;
    void getPremiumPackages().then((available) => {
      if (!active) {
        return;
      }
      setPackages(available);
      const annual = available.find((pkg) => pkg.period === 'annual');
      setSelectedId((annual ?? available[0])?.identifier ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  const handlePurchase = async () => {
    if (!selectedId) {
      return;
    }
    setBusy('purchase');
    try {
      const outcome = await purchasePremiumPackage(selectedId);
      if (outcome === 'purchased') {
        finish();
      }
    } catch {
      showAppAlert(
        'Purchase not completed',
        'Something went wrong. If you were charged, your Premium access will activate shortly — or use Restore purchases.',
      );
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    setBusy('restore');
    try {
      const restored = await restorePremiumPurchases();
      if (restored) {
        finish();
      } else {
        showAppAlert(
          'Nothing to restore',
          'No previous Premium purchase was found for this store account.',
        );
      }
    } catch {
      showAppAlert('Restore failed', 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={[styles.container, { padding: spacing.lg, gap: spacing.md }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Go Premium</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Unlimited lists. Cancel anytime.
          </Text>
        </View>

        {packages === null ? (
          <ActivityIndicator color={colors.accent} size="large" />
        ) : packages.length === 0 ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Plans aren't available right now. Please try again later.
          </Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {packages.map((pkg) => {
              const selected = pkg.identifier === selectedId;
              return (
                <Pressable
                  key={pkg.identifier}
                  accessibilityLabel={`${PERIOD_LABEL[pkg.period]} plan, ${pkg.priceString}`}
                  accessibilityRole="button"
                  disabled={busy !== null}
                  onPress={() => setSelectedId(pkg.identifier)}
                  style={({ pressed }) => [
                    styles.packageRow,
                    {
                      backgroundColor: selected ? colors.accentSoft : colors.surface,
                      borderColor: selected ? colors.accent : colors.border,
                      borderRadius: radii.item,
                      opacity: pressed ? 0.85 : 1,
                      padding: spacing.md,
                    },
                  ]}
                >
                  <Text style={[styles.packageLabel, { color: colors.text }]}>
                    {PERIOD_LABEL[pkg.period]}
                  </Text>
                  <Text style={[styles.packagePrice, { color: colors.text }]}>
                    {pkg.priceString}
                    <Text style={{ color: colors.textSecondary }}>
                      {pkg.period === 'annual'
                        ? ' / year'
                        : pkg.period === 'monthly'
                          ? ' / month'
                          : ''}
                    </Text>
                  </Text>
                  {selected ? (
                    <MaterialIcons color={colors.accent} name="check-circle" size={22} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ gap: spacing.sm }}>
          {packages !== null && packages.length > 0 ? (
            <Button
              disabled={busy !== null || selectedId === null}
              label="Subscribe"
              loading={busy === 'purchase'}
              onPress={() => void handlePurchase()}
              variant="primary"
            />
          ) : null}
          <Button
            disabled={busy !== null}
            label={fromSettings ? 'Cancel' : 'Not now — start with Free'}
            onPress={finish}
            variant="ghost"
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy !== null}
            onPress={() => void handleRestore()}
            style={styles.restoreButton}
          >
            {busy === 'restore' ? (
              <ActivityIndicator color={colors.textSecondary} size="small" />
            ) : (
              <Text style={[styles.restoreText, { color: colors.accent }]}>
                Restore purchases
              </Text>
            )}
          </Pressable>
        </View>

        <Text style={[styles.legal, { color: colors.textSecondary }]}>
          Subscriptions renew automatically until cancelled in your app store
          settings. Prices are shown in your local currency.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 440,
    width: '100%',
  },
  header: { alignItems: 'center' },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  packageRow: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  packageLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
  },
  packagePrice: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
    textAlign: 'right',
  },
  restoreButton: {
    alignItems: 'center',
    minHeight: 32,
    justifyContent: 'center',
  },
  restoreText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
  },
  legal: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
