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

const lightEmptyStateImage =
  require('../assets/images/empty-state-light.png') as ImageSourcePropType;
const darkEmptyStateImage =
  require('../assets/images/empty-state-dark.png') as ImageSourcePropType;

const EMPTY_STATE_OFFSET_Y = -100;

type EmptyStateProps = {
  title?: string;
  onCreateList: () => void;
};

export default function EmptyState({
  title = 'Nothing to see here',
  onCreateList,
}: EmptyStateProps) {
  const { colors, colorScheme, radii, spacing } = useTheme();
  const emptyStateImage =
    colorScheme === 'dark' ? darkEmptyStateImage : lightEmptyStateImage;

  return (
    <View
      style={[
        styles.container,
        {
          padding: spacing.lg,
          pointerEvents: 'box-none',
          transform: [{ translateY: EMPTY_STATE_OFFSET_Y }],
        },
      ]}
    >
      <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={emptyStateImage}
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
            flexDirection: 'row',
            gap: 8,
            marginTop: spacing.md,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <MaterialIcons color={colors.surface} name="add" size={24} />
        <Text style={[buttonLabelStyle(16), { color: colors.surface }]}>
          Create a new list
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
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
});
