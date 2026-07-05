import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/ThemeContext';
import { APP_NAME } from '@/lib/appName';
import { buildAuthHref, parseAuthRedirect } from '@/lib/authRedirect';
import { FREE_LIST_LIMIT } from '@/lib/listLimits';
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
  const { colors, radii, spacing } = useTheme();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const resolvedRedirect = parseAuthRedirect(redirect);
  const [monthlyPrice, setMonthlyPrice] = useState<string | null>(null);

  // Web / Expo Go: no purchases — go straight to the plain sign-up form.
  useEffect(() => {
    if (!isPurchasesAvailable()) {
      router.replace(buildAuthHref('sign-up', resolvedRedirect));
    }
  }, [resolvedRedirect]);

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
      key={plan}
      onPress={() => continueWith(plan)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: highlighted ? colors.accent : colors.border,
          borderRadius: radii.card,
          borderWidth: highlighted ? 2 : 1,
          gap: spacing.sm,
          opacity: pressed ? 0.85 : 1,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.cardPrice, { color: colors.textSecondary }]}>
          {priceLine}
        </Text>
      </View>
      {features.map((feature) => (
        <View key={feature.text} style={styles.featureRow}>
          <MaterialIcons color={colors.accent} name={feature.icon} size={20} />
          <Text style={[styles.featureText, { color: colors.text }]}>
            {feature.text}
          </Text>
        </View>
      ))}
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.topHeader,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
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
          <MaterialIcons color={colors.accent} name="chevron-left" size={24} />
        </Pressable>
      </View>

      <View style={[styles.container, { padding: spacing.lg, gap: spacing.md }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Join {APP_NAME}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
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

        <Text style={[styles.footnote, { color: colors.textSecondary }]}>
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
    borderRadius: 22,
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
  header: { alignItems: 'center', marginBottom: 8 },
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
  card: {},
  cardHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
  },
  cardPrice: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
  },
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  featureText: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
  },
  footnote: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
