import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useTheme } from '@/contexts/ThemeContext';
import { buttonLabelStyle, buttonLayoutStyle } from '@/lib/buttonStyles';

const listEmptyStateImage =
  require('../assets/images/listEmptyState.png') as ImageSourcePropType;

const EMPTY_STATE_OFFSET_Y = -100;

type EmptyStateProps = {
  title?: string;
  onCreateList: () => void;
};

export default function EmptyState({
  title = 'No lists yet',
  onCreateList,
}: EmptyStateProps) {
  const { colors, radii, spacing } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.lg }]} pointerEvents="box-none">
      <View style={styles.content}>
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={listEmptyStateImage}
          style={[styles.illustration, { marginBottom: spacing.xl }]}
        />
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Pressable
          accessibilityLabel="Create a new list"
          accessibilityRole="button"
          onPress={onCreateList}
          style={({ pressed }) => [
            styles.createListButton,
            buttonLayoutStyle,
            {
              backgroundColor: colors.accent,
              borderRadius: radii.item,
              marginTop: spacing.md,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View style={styles.createListButtonContent}>
            <MaterialIcons color={colors.surface} name="add" size={24} />
            <Text style={[buttonLabelStyle(16), { color: colors.surface }]}>
              Create a new list
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    transform: [{ translateY: EMPTY_STATE_OFFSET_Y }],
  },
  illustration: {
    height: 180,
    width: 180,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  createListButton: {
    minHeight: 54,
  },
  createListButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
