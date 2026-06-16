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
import OpeningScreen from '@/components/OpeningScreen';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import {
  OPENING_DISPLAY_MS,
  OPENING_ZOOM_MS,
  useOpeningTransitionReady,
} from '@/lib/splash';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

const OPENING_ZOOM_FROM = 0.9;

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    MaterialSymbolsOutlined: require('../assets/fonts/MaterialSymbolsOutlined.ttf'),
  });
  const [openingComplete, setOpeningComplete] = useState(false);
  const [showOpening, setShowOpening] = useState(true);
  const [minDisplayElapsed, setMinDisplayElapsed] = useState(false);
  const hasStartedTransition = useRef(false);
  const mainScale = useSharedValue(OPENING_ZOOM_FROM);
  const mainOpacity = useSharedValue(0);
  const openingScale = useSharedValue(1);
  const openingOpacity = useSharedValue(1);
  const openingReady =
    useOpeningTransitionReady(loaded, openingComplete) && minDisplayElapsed;
  const handleOpeningComplete = useCallback(() => {
    setOpeningComplete(true);
  }, []);

  const mainAnimatedStyle = useAnimatedStyle(() => ({
    opacity: mainOpacity.value,
    transform: [{ scale: mainScale.value }],
  }));

  const openingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: openingOpacity.value,
    transform: [{ scale: openingScale.value }],
  }));

  const finishOpeningTransition = useCallback(() => {
    setShowOpening(false);
  }, []);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setMinDisplayElapsed(true), OPENING_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!openingReady || hasStartedTransition.current) {
      return;
    }

    hasStartedTransition.current = true;

    const zoomTiming = {
      duration: OPENING_ZOOM_MS,
      easing: Easing.out(Easing.cubic),
    };

    mainScale.value = withTiming(1, zoomTiming);
    mainOpacity.value = withTiming(1, zoomTiming);
    openingScale.value = withTiming(1.08, zoomTiming);
    openingOpacity.value = withTiming(0, zoomTiming, (finished) => {
      if (finished) {
        runOnJS(finishOpeningTransition)();
      }
    });
  }, [
    finishOpeningTransition,
    mainOpacity,
    mainScale,
    openingOpacity,
    openingReady,
    openingScale,
  ]);

  return (
    <View style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            {showOpening ? (
              <Reanimated.View
                pointerEvents={openingComplete ? 'none' : 'auto'}
                style={[styles.openingLayer, openingAnimatedStyle]}
              >
                <OpeningScreen
                  fontsLoaded={loaded}
                  onComplete={handleOpeningComplete}
                />
              </Reanimated.View>
            ) : null}
            <Reanimated.View style={[styles.mainLayer, mainAnimatedStyle]}>
              <RootLayoutNav />
            </Reanimated.View>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
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
    overflow: 'hidden',
    zIndex: 2,
  },
  openingLayer: {
    ...StyleSheet.absoluteFillObject,
    elevation: 3,
    overflow: 'hidden',
    zIndex: 3,
    ...(Platform.OS === 'web'
      ? {
          height: '100%',
          position: 'fixed',
          width: '100%',
        }
      : null),
  },
});
