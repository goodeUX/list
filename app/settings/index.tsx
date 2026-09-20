import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { absoluteFill } from '@/lib/absoluteFill';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button';
import UserAvatar from '@/components/UserAvatar';
import { usePlan } from '@/contexts/PlanContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppLock } from '@/hooks/useAppLock';
import { useChildSlideTransition } from '@/hooks/useSlideTransition';
import { showAppAlert } from '@/lib/appAlert';
import type { ThemePreference } from '@/lib/theme';
import { buildPlanChooserHref } from '@/lib/authRedirect';
import { buttonLabelStyle, buttonLayoutStyle } from '@/lib/buttonStyles';
import { fontSize, radius, space } from '@/lib/design';
import { FREE_LIST_LIMIT } from '@/lib/listLimits';
import { restorePremiumPurchases } from '@/lib/purchases';

const THEME_OPTION_ICON_SIZE = 18;
const HEADER_AVATAR_SIZE = 36;
const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
const PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

function getStoreSubscriptionsUrl(): string {
  if (Platform.OS === 'ios') {
    return APPLE_SUBSCRIPTIONS_URL;
  }
  if (Platform.OS === 'android') {
    return PLAY_SUBSCRIPTIONS_URL;
  }
  // Web mirror: the SDK isn't here to tell us which store the subscription
  // came from, so guess from the browser UA (same pattern as appStoreUrls.ts).
  if (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return APPLE_SUBSCRIPTIONS_URL;
  }
  return PLAY_SUBSCRIPTIONS_URL;
}
const introLightImage =
  require('../../assets/images/intro-light.png') as ImageSourcePropType;
const introDarkImage =
  require('../../assets/images/intro-dark.png') as ImageSourcePropType;

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
}[] = [
  { value: 'system', label: 'System', icon: 'smartphone' },
  { value: 'light', label: 'Light', icon: 'sunny' },
  { value: 'dark', label: 'Dark', icon: 'nights-stay' },
];

export default function SettingsScreen() {
  const { colors, colorScheme, typography, preference, setPreference } =
    useTheme();
  const { user } = useAuth();
  const appLock = useAppLock();
  // Hidden when the page would be empty: no biometrics on this device and
  // no password of ours to change.
  const hasPasswordProvider =
    user?.providerData.some((provider) => provider.providerId === 'password') ?? false;
  const showSecurity =
    Boolean(user) && (appLock.capability !== 'unsupported' || hasPasswordProvider);
  const insets = useSafeAreaInsets();
  const { animatedStyle, goBack, isEnabled: slideTransitionEnabled } =
    useChildSlideTransition();
  const { plan, planSource, purchasesAvailable, entitlement } = usePlan();

  const [restoring, setRestoring] = useState(false);

  const handleManageSubscription = () => {
    // RevenueCat's managementURL when known; otherwise the store's generic
    // subscriptions page. Cancelling/downgrading is store-managed — access
    // continues until the paid period ends.
    void Linking.openURL(entitlement.managementURL ?? getStoreSubscriptionsUrl());
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restorePremiumPurchases();
      showAppAlert(
        restored ? 'Premium restored' : 'Nothing to restore',
        restored
          ? 'Your Premium subscription is active on this device.'
          : 'No previous Premium purchase was found for this store account.',
      );
    } catch {
      showAppAlert('Restore failed', 'Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const renewalDate = entitlement.expirationDate
    ? new Date(entitlement.expirationDate).toLocaleDateString()
    : null;

  const handleClose = () => {
    if (router.canGoBack()) {
      goBack();
      return;
    }
    router.replace('/');
  };

  const accountLabel = user?.displayName || user?.email || '';
  const introImage = colorScheme === 'dark' ? introDarkImage : introLightImage;

  return (
    <Animated.View
      style={[
        styles.screen,
        { backgroundColor: colors.bg },
        slideTransitionEnabled ? animatedStyle : null,
      ]}
    >
      <View
        style={[
          styles.flex,
          {
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            paddingTop: insets.top,
          },
        ]}
      >
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            paddingHorizontal: space[6],
            paddingTop: space[4],
            paddingBottom: space[4],
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleClose}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: colors.surface,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialIcons color={colors.primary} name="chevron-left" size={24} />
        </Pressable>

        <Text style={[typography.h2, styles.title, { color: colors.text }]}>Settings</Text>

        {user ? (
          <Pressable
            accessibilityLabel="Profile"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push('/settings/profile')}
            style={({ pressed }) => [styles.avatarButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <UserAvatar
              label={accountLabel}
              photoURL={user.photoURL}
              size={HEADER_AVATAR_SIZE}
            />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { padding: space[6], gap: space[6] }]}
      >
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              padding: space[4],
            },
          ]}
        >
          <Text style={[typography.h2, styles.sectionTitle, { color: colors.text }]}>
            Appearance
          </Text>
          <View style={[styles.themeRow, { gap: space[2], marginTop: space[2] }]}>
            {THEME_OPTIONS.map((option) => {
              const selected = preference === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setPreference(option.value)}
                  style={({ pressed }) => [
                    styles.themeOption,
                    {
                      backgroundColor: selected ? colors.accentSoft : colors.surfaceMuted,
                      borderColor: selected ? colors.accent : colors.border,
                      borderRadius: radius.md,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <MaterialIcons
                    color={selected ? colors.text : colors.textSecondary}
                    name={option.icon}
                    size={THEME_OPTION_ICON_SIZE}
                  />
                  <Text
                    style={[
                      typography.label,
                      styles.themeOptionText,
                      { color: selected ? colors.text : colors.textSecondary },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {showSecurity ? (
          <Pressable
            accessibilityLabel="Security"
            accessibilityRole="button"
            onPress={() => router.push('/settings/security')}
            style={({ pressed }) => [
              styles.section,
              styles.navRow,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
                opacity: pressed ? 0.7 : 1,
                padding: space[4],
              },
            ]}
          >
            <Text style={[typography.h2, styles.sectionTitle, { color: colors.text }]}>
              Security
            </Text>
            <MaterialIcons color={colors.textSecondary} name="chevron-right" size={24} />
          </Pressable>
        ) : null}

        {!user ? (
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: space[4],
              },
            ]}
          >
            <Text style={[typography.h2, styles.sectionTitle, { color: colors.text }]}>
              Account
            </Text>

            <View style={[styles.accountActions, { gap: space[2], marginTop: space[2] }]}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(auth)/sign-in',
                    params: { redirect: '/' },
                  })
                }
                style={({ pressed }) => [
                  styles.actionButton,
                  buttonLayoutStyle,
                  {
                    backgroundColor: colors.primary,
                    borderWidth: 0,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[buttonLabelStyle(fontSize.body), { color: colors.onPrimary }]}>
                  Sign in
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push(buildPlanChooserHref('/'))}
                style={({ pressed }) => [
                  styles.actionButton,
                  buttonLayoutStyle,
                  {
                    borderColor: colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[buttonLabelStyle(fontSize.body), { color: colors.text }]}>
                  Create account
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {user ? (
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: space[4],
              },
            ]}
          >
            <Text style={[typography.h2, styles.sectionTitle, { color: colors.text }]}>Plan</Text>

            <View style={[styles.planRow, { marginTop: space[2] }]}>
              <View
                style={[
                  styles.planBadge,
                  {
                    backgroundColor: plan === 'premium' ? colors.secondarySoft : colors.surfaceMuted,
                    borderRadius: radius.sm,
                  },
                ]}
              >
                <Text style={[typography.label, styles.planBadgeText, { color: colors.text }]}>
                  {plan === 'premium' ? 'Premium' : 'Free'}
                </Text>
              </View>
              <Text
                style={[typography.bodyS, styles.planDetail, { color: colors.textSecondary, flex: 1 }]}
              >
                {plan === 'premium'
                  ? planSource === 'comp'
                    ? 'Complimentary — enjoy!'
                    : renewalDate
                      ? entitlement.willRenew
                        ? `Renews ${renewalDate}`
                        : `Ends ${renewalDate}`
                      : 'Active subscription'
                  : `Up to ${FREE_LIST_LIMIT} lists`}
              </Text>
            </View>

            <View style={{ gap: space[2], marginTop: space[2] }}>
              {plan === 'free' && purchasesAvailable ? (
                <Button
                  label="Upgrade to Premium"
                  onPress={() =>
                    router.push({ pathname: '/(auth)/paywall', params: { from: 'settings' } })
                  }
                  variant="primary"
                />
              ) : null}
              {plan === 'free' && !purchasesAvailable ? (
                <Text style={[typography.bodyS, styles.planDetail, { color: colors.textSecondary }]}>
                  Upgrade from the List Kitty app on your phone to unlock
                  unlimited lists.
                </Text>
              ) : null}
              {plan === 'premium' && planSource === 'store' ? (
                <Button
                  label="Manage subscription"
                  onPress={handleManageSubscription}
                  variant="surface"
                />
              ) : null}
              {purchasesAvailable ? (
                <Button
                  disabled={restoring}
                  label="Restore purchases"
                  loading={restoring}
                  onPress={() => void handleRestore()}
                  variant="ghost"
                />
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.introImageWrap}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={introImage}
            style={styles.introImage}
          />
        </View>
      </ScrollView>

      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...absoluteFill,
  },
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space[3],
  },
  backButton: {
    alignItems: 'center',
    borderRadius: radius.xl,
    flexShrink: 0,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  // marginLeft: auto takes the row's spare width, so the title keeps its
  // own and the trailing item sits at the edge.
  headerSpacer: {
    height: 44,
    marginLeft: 'auto',
    width: 44,
  },
  avatarButton: {
    marginLeft: 'auto',
  },
  navRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {},
  container: {
    flexGrow: 1,
  },
  scroll: {
    flex: 1,
  },
  section: {
    borderWidth: 1,
    gap: space[1],
  },
  sectionTitle: {},
  themeRow: {
    flexDirection: 'row',
  },
  themeOption: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: space[2],
    justifyContent: 'center',
    paddingHorizontal: space[3],
    paddingVertical: space[3],
  },
  themeOptionText: {},
  accountActions: {},
  planRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[3],
  },
  planBadge: {
    paddingHorizontal: space[3],
    paddingVertical: space[1],
  },
  planBadgeText: {},
  planDetail: {},
  introImageWrap: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 260,
  },
  introImage: {
    height: 240,
    width: 240,
  },
  actionButton: {
    borderWidth: 1,
    minHeight: 48,
  },
});
