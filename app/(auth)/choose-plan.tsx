import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/ThemeContext';
import { APP_NAME } from '@/lib/appName';
import { buildAuthHref, parseAuthRedirect } from '@/lib/authRedirect';
import { FREE_LIST_LIMIT } from '@/lib/listLimits';
import { radius, space } from '@/lib/design';
import { getPremiumPackages, isPurchasesAvailable } from '@/lib/purchases';

type TierFeature = { icon: keyof typeof MaterialIcons.glyphMap; text: string };

const FREE_FEATURES: TierFeature[] = [
  { icon: 'sync', text: 'Sync your lists across devices' },
  { icon: 'group-add', text: 'Invite others to collaborate' },
  { icon: 'playlist-add-check', text: `Up to ${FREE_LIST_LIMIT} lists` },
];

const PREMIUM_FEATURES: TierFeature[] = [
  { icon: 'all-inclusive', text: 'Unlimited lists' },
  { icon: 'check', text: 'Everything in Free' },
];

export default function ChoosePlanScreen() {
  const { colors, radius, space, typography } = useTheme();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const resolvedRedirect = parseAuthRedirect(redirect);
  const [monthlyPrice, setMonthlyPrice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getPremiumPackages().then((packages) => {
      const monthly = packages.find((pkg) => pkg.period === 'monthly');
      if (active && monthly) {
        setMonthlyPrice(monthly.priceString);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const continueWith = (plan: 'free' | 'premium') => {
    router.replace({
      pathname: '/(auth)/sign-up',
      params: {
        ...(resolvedRedirect ? { redirect: resolvedRedirect } : {}),
        ...(plan === 'premium' ? { plan: 'premium' } : {}),
      },
    });
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  const renderCard = (
    title: string,
    priceLine: string,
    features: TierFeature[],
    plan: 'free' | 'premium',
    highlighted: boolean,
  ) => (
    <Pressable
      accessibilityLabel={`Choose the ${title} plan`}
      accessibilityRole="button"
      onPress={() => continueWith(plan)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: highlighted ? colors.primary : colors.border,
          borderRadius: radius.lg,
          borderWidth: highlighted ? 2 : 1,
          gap: space[2],
          opacity: pressed ? 0.85 : 1,
          padding: space[4],
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[typography.h2, styles.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[typography.label, styles.cardPrice, { color: colors.textSecondary }]}>
          {priceLine}
        </Text>
      </View>
      {features.map((feature) => (
        <View key={feature.text} style={styles.featureRow}>
          <MaterialIcons color={colors.primary} name={feature.icon} size={20} />
          <Text style={[typography.label, styles.featureText, { color: colors.text }]}>
            {feature.text}
          </Text>
        </View>
      ))}
    </Pressable>
  );

  // Web / Expo Go: no purchases — go straight to the plain sign-up form.
  if (!isPurchasesAvailable()) {
    return <Redirect href={buildAuthHref('sign-up', resolvedRedirect)} />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.topHeader,
          {
            paddingHorizontal: space[6],
            paddingTop: space[4],
            paddingBottom: space[2],
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleGoBack}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialIcons color={colors.primary} name="chevron-left" size={24} />
        </Pressable>
      </View>

      <View style={[styles.container, { padding: space[6], gap: space[4] }]}>
        <View style={styles.header}>
          <Text style={[typography.display, styles.title, { color: colors.text }]}>
            Join {APP_NAME}
          </Text>
          <Text style={[typography.bodyL, styles.subtitle, { color: colors.textSecondary }]}>
            Pick a plan to get started
          </Text>
        </View>

        {renderCard('Free', 'No cost', FREE_FEATURES, 'free', false)}
        {renderCard(
          'Premium',
          monthlyPrice ? `From ${monthlyPrice}/month` : 'Monthly or annual',
          PREMIUM_FEATURES,
          'premium',
          true,
        )}

        <Text style={[typography.bodyS, styles.footnote, { color: colors.textSecondary }]}>
          You can change plans anytime in Settings.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topHeader: { alignItems: 'flex-start' },
  backButton: {
    alignItems: 'center',
    borderRadius: radius.xl,
    flexShrink: 0,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  container: {
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 440,
    width: '100%',
  },
  header: { alignItems: 'center', marginBottom: space[2] },
  title: {
    marginBottom: space[2],
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  card: {},
  cardHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {},
  cardPrice: {},
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[3],
  },
  featureText: {
    flex: 1,
  },
  footnote: {
    textAlign: 'center',
  },
});
