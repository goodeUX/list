import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

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
    <View style={[styles.container, { padding: spacing.lg }]}>
      <Text style={styles.emoji}>🌱</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Pressable
        accessibilityLabel="Create list"
        accessibilityRole="button"
        onPress={onCreateList}
        onPressIn={onCreateList}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.accent,
            borderRadius: radii.item,
            marginTop: spacing.md,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.buttonText, { color: colors.surface }]}>
          + Create list
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
  emoji: {
    fontSize: 48,
    lineHeight: 56,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
  },
});
