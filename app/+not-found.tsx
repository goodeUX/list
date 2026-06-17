import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>This screen doesn't exist.</Text>

        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.accent }]}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
  },
});
