import { Stack } from 'expo-router';
import { Platform } from 'react-native';

const itemScreenOptions = {
  animation: 'none' as const,
  contentStyle: { backgroundColor: 'transparent' as const },
  gestureEnabled: true,
  headerShown: false,
  presentation: 'transparentModal' as const,
  ...(Platform.OS === 'android' ? { statusBarTranslucent: false } : null),
};

export default function ListIdLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: 'transparent' },
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="item/[itemId]" options={itemScreenOptions} />
    </Stack>
  );
}
