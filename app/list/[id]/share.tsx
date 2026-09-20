import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { absoluteFill } from '@/lib/absoluteFill';
import { radius, space } from '@/lib/design';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ShareListContent from '@/components/ShareListContent';
import { useTheme } from '@/contexts/ThemeContext';
import { useChildSlideTransition } from '@/hooks/useSlideTransition';

export default function ShareListScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const listId = typeof params.id === 'string' ? params.id : undefined;
  const listName = typeof params.name === 'string' ? params.name : 'List';
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { animatedStyle, goBack, isEnabled: slideTransitionEnabled } =
    useChildSlideTransition({ ready: Boolean(listId) });

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
            onPress={() => goBack()}
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

          <Text
            style={[typography.h2, styles.title, { color: colors.text, flex: 1, minWidth: 0 }]}
          >
            Share list
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {listId ? (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { gap: space[4], padding: space[6] },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <ShareListContent listId={listId} listName={listName} />
          </ScrollView>
        ) : null}
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
  headerSpacer: {
    flexShrink: 0,
    height: 44,
    width: 44,
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    flexGrow: 1,
  },
});
