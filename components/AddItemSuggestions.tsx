import { Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import {
  SUGGESTION_ROWS_VISIBLE,
  type ItemSuggestion,
} from '@/lib/itemSuggestions';

const ROW_HEIGHT = 44;

interface Props {
  onPressIn: () => void;
  onSelect: (suggestion: ItemSuggestion) => void;
  suggestions: ItemSuggestion[];
}

/**
 * Names this list has held before, offered under the add-item input. Sits
 * above the item list rather than pushing it down.
 */
export default function AddItemSuggestions({
  onPressIn,
  onSelect,
  suggestions,
}: Props) {
  const { colors, radii, spacing } = useTheme();

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="always"
      style={[
        styles.panel,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.card,
          left: spacing.lg,
          marginTop: 6,
          maxHeight: ROW_HEIGHT * SUGGESTION_ROWS_VISIBLE,
          right: spacing.lg,
        },
      ]}
    >
      {suggestions.map((suggestion) => {
        const { checkedItemId, matchLength, matchStart, name } = suggestion;
        const before = name.slice(0, matchStart);
        const matched = name.slice(matchStart, matchStart + matchLength);
        const after = name.slice(matchStart + matchLength);

        const select = () => onSelect(suggestion);

        return (
          <Pressable
            accessibilityLabel={`${checkedItemId ? 'Uncheck' : 'Add'} ${name}`}
            accessibilityRole="button"
            key={name}
            {...(Platform.OS === 'web'
              ? ({
                  onMouseDown: (event: { preventDefault: () => void }) => {
                    // Keeps the input from blurring and clearing the draft
                    // before the press lands, as the submit button does.
                    event.preventDefault();
                    onPressIn();
                    select();
                  },
                } as object)
              : { onPress: select, onPressIn })}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
                paddingHorizontal: 15,
              },
            ]}
          >
            <Text numberOfLines={1} style={[styles.label, { color: colors.textSecondary }]}>
              {before}
              <Text style={[styles.matched, { color: colors.text }]}>{matched}</Text>
              {after}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: {
    flex: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
  },
  matched: {
    fontFamily: 'NunitoSans_600SemiBold',
  },
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    position: 'absolute',
    top: '100%',
    zIndex: 20,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    height: ROW_HEIGHT,
  },
});
