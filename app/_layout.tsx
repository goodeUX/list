import {
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
} from '@expo-google-fonts/nunito-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import WebShell from '@/components/WebShell';
import AppSplash from '@/components/AppSplash';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import {
  useAppSplashReady,
  SPLASH_IMAGE_TIMEOUT_MS,
} from '@/lib/splash';
import { getSlideDistance, PUSH_PARALLAX_RATIO, SLIDE_IN_MS } from '@/lib/slideTransition';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const slideDistance = getSlideDistance();
  const [loaded, error] = useFonts({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
  });
  const [splashImageReady, setSplashImageReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const hasStartedTransition = useRef(false);
  const mainTranslateX = useSharedValue(slideDistance);
  const splashTranslateX = useSharedValue(0);
  const splashReady = useAppSplashReady(loaded, splashImageReady);
  const handleSplashImageReady = useCallback(() => {
    setSplashImageReady(true);
  }, []);

  const mainAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: mainTranslateX.value }],
  }));

  const splashAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: splashTranslateX.value }],
  }));

  const finishSplashTransition = useCallback(() => {
    setShowSplash(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(handleSplashImageReady, SPLASH_IMAGE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [handleSplashImageReady]);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!splashReady || hasStartedTransition.current) {
      return;
    }

    hasStartedTransition.current = true;
    void SplashScreen.hideAsync();

    const pushTiming = {
      duration: SLIDE_IN_MS,
      easing: Easing.out(Easing.cubic),
    };

    mainTranslateX.value = withTiming(0, pushTiming);
    splashTranslateX.value = withTiming(
      -slideDistance * PUSH_PARALLAX_RATIO,
      pushTiming,
      (finished) => {
        if (finished) {
          runOnJS(finishSplashTransition)();
        }
      },
    );
  }, [finishSplashTransition, mainTranslateX, slideDistance, splashReady, splashTranslateX]);

  return (
    <View style={styles.root}>
      {showSplash ? (
        <Reanimated.View
          pointerEvents={splashReady ? 'none' : 'auto'}
          style={[styles.splashLayer, splashAnimatedStyle]}
        >
          <AppSplash onImageReady={handleSplashImageReady} />
        </Reanimated.View>
      ) : null}
      <Reanimated.View style={[styles.mainLayer, mainAnimatedStyle]}>
        <SafeAreaProvider>
          <AuthProvider>
            <ThemeProvider>
              <RootLayoutNav />
            </ThemeProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </Reanimated.View>
    </View>
  );
}

function RootLayoutNav() {
  const { colorScheme, colors } = useTheme();

  const navigationTheme = useMemo(() => {
    const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.bg,
        card: colors.bg,
      },
    };
  }, [colorScheme, colors.bg]);

  const listScreenOptions = useMemo(
    () => ({
      animation: 'none' as const,
      contentStyle: { backgroundColor: 'transparent' as const },
      gestureEnabled: true,
      headerShown: false,
      presentation: 'transparentModal' as const,
    }),
    [],
  );

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.bg }]}>
      <WebShell>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <NavigationThemeProvider value={navigationTheme}>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: colors.bg },
              headerShown: false,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="settings" options={listScreenOptions} />
            <Stack.Screen name="list/[id]" options={listScreenOptions} />
            <Stack.Screen name="join/[listId]" />
            <Stack.Screen
              name="(auth)"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="modal"
              options={{ headerShown: true, presentation: 'modal' }}
            />
          </Stack>
        </NavigationThemeProvider>
      </WebShell>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  mainLayer: {
    flex: 1,
    zIndex: 2,
  },
  splashLayer: {
    ...StyleSheet.absoluteFillObject,
    elevation: 1,
    zIndex: 1,
    ...(Platform.OS === 'web'
      ? {
          height: '100%',
          position: 'fixed',
          width: '100%',
        }
      : null),
  },
});
