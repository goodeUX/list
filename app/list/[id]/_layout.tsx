import { Stack, useNavigation, useRoute } from 'expo-router';
import { useEffect } from 'react';

const childScreenOptions = {
  animation: 'none' as const,
  contentStyle: { backgroundColor: 'transparent' as const },
  gestureEnabled: true,
  headerShown: false,
  presentation: 'transparentModal' as const,
};

/**
 * Keeps at most one list open: when a list opens, any list pages below it in
 * the root stack are removed. Otherwise opening a list from a share or an
 * invite while another list is open stacks them, and back steps through each
 * one before reaching My Lists. (Repeat taps are stopped earlier, by
 * openList.)
 */
function useSingleOpenList() {
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    const state = navigation.getState();
    if (!state) {
      return;
    }
    const ownIndex = state.routes.findIndex((entry) => entry.key === route.key);
    if (ownIndex <= 0) {
      return;
    }
    const routes = state.routes.filter(
      (entry, index) => index >= ownIndex || entry.name !== route.name,
    );
    if (routes.length === state.routes.length) {
      return;
    }
    // Existing routes keep their keys, so nothing that stays is remounted.
    // (The router types root route names as never, hence the cast.)
    const focusedKey = state.routes[state.index]?.key;
    navigation.reset({
      ...state,
      index: Math.max(0, routes.findIndex((entry) => entry.key === focusedKey)),
      routes,
    } as Parameters<typeof navigation.reset>[0]);
  }, [navigation, route.key, route.name]);
}

export default function ListIdLayout() {
  useSingleOpenList();

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
