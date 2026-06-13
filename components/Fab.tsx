import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

type FabProps = {
  onPress: () => void;
};

export default function Fab({ onPress }: FabProps) {
  const { colors, radii } = useTheme();

  return (
    <Pressable
      accessibilityLabel="Create list"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: colors.accent,
          borderRadius: radii.fab,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <SymbolView
        name={{ ios: 'plus', android: 'add', web: 'add' }}
        size={28}
        tintColor={colors.surface}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    alignItems: 'center',
    bottom: 24,
    elevation: 4,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    width: 56,
  },
});
