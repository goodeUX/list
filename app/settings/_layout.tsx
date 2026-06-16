import { Stack } from 'expo-router';

const childScreenOptions = {
  animation: 'none' as const,
  contentStyle: { backgroundColor: 'transparent' as const },
  gestureEnabled: true,
  headerShown: false,
  presentation: 'transparentModal' as const,
};

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: 'transparent' },
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="edit-account" options={childScreenOptions} />
    </Stack>
  );
}
