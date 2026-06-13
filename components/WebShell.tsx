import { type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { CONTENT_MAX_WIDTH } from '@/lib/slideTransition';
import { useTheme } from '@/contexts/ThemeContext';

type WebShellProps = {
  children: ReactNode;
};

export default function WebShell({ children }: WebShellProps) {
  const { colors } = useTheme();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={[styles.outer, { backgroundColor: colors.bg }]}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    maxWidth: CONTENT_MAX_WIDTH,
    overflow: 'hidden',
    width: '100%',
  },
});
