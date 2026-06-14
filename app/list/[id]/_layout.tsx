import { Stack } from 'expo-router';

const childScreenOptions = {
  animation: 'none' as const,
  contentStyle: { backgroundColor: 'transparent' as const },
  gestureEnabled: true,
  headerShown: false,
  presentation: 'transparentModal' as const,
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
      <Stack.Screen name="share" options={childScreenOptions} />
      <Stack.Screen name="item/[itemId]" options={childScreenOptions} />
    </Stack>
  );
}
