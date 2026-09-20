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
import { space } from '@/lib/design';

const lightEmptyStateImage =
  require('../assets/images/empty-state-light.webp') as ImageSourcePropType;
const darkEmptyStateImage =
  require('../assets/images/empty-state-dark.webp') as ImageSourcePropType;

const EMPTY_STATE_OFFSET_Y = -100;

type EmptyStateProps = {
  title?: string;
  onCreateList: () => void;
};

export default function EmptyState({
  title = 'Nothing to see here',
  onCreateList,
}: EmptyStateProps) {
  const { colors, colorScheme, typography } = useTheme();
  const emptyStateImage =
    colorScheme === 'dark' ? darkEmptyStateImage : lightEmptyStateImage;

  return (
    <View
      style={[
        styles.container,
        {
          padding: space[6],
          pointerEvents: 'box-none',
          transform: [{ translateY: EMPTY_STATE_OFFSET_Y }],
        },
      ]}
    >
      <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={emptyStateImage}
          style={[styles.illustration, { marginBottom: space[8] }]}
        />
        <Text style={[styles.title, typography.h2, { color: colors.text }]}>{title}</Text>
        <Pressable
          accessibilityLabel="Create a new list"
          accessibilityRole="button"
          onPress={onCreateList}
        style={({ pressed }) => [
          styles.createListButton,
          buttonLayoutStyle,
          {
            backgroundColor: colors.primary,
            flexDirection: 'row',
            gap: space[2],
            marginTop: space[4],
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <MaterialIcons color={colors.onPrimary} name="add" size={24} />
        <Text style={[buttonLabelStyle(16), { color: colors.onPrimary }]}>
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
    textAlign: 'center',
  },
  createListButton: {
    minHeight: 48,
  },
});
