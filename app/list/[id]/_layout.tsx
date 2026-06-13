import { Stack } from 'expo-router';

export default function ListIdLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="item/[itemId]" />
    </Stack>
  );
}
