import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  /** Display name or email; its first letter is the fallback. */
  label: string;
  photoURL?: string | null;
  size: number;
}

/**
 * The account's picture when the sign-in provider supplies one — Google does —
 * and the first initial otherwise. Nothing in the app writes `photoURL`.
 */
export default function UserAvatar({ label, photoURL, size }: Props) {
  const { colors } = useTheme();
  const box = { borderRadius: size / 2, height: size, width: size };

  if (photoURL) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri: photoURL }}
        style={[box, { backgroundColor: colors.accentSoft }]}
      />
    );
  }

  const initial = label.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={[styles.fallback, box, { backgroundColor: colors.accentSoft }]}>
      <Text style={[styles.initial, { color: colors.text, fontSize: size * 0.44 }]}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: 'NunitoSans_600SemiBold',
  },
});
