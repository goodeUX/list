import { Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { fontFamily, space } from '@/lib/design';
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
  const { colors, radius, spacing, typography } = useTheme();

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
          borderRadius: radius.lg,
          left: spacing.lg,
          marginTop: space[2],
          maxHeight: ROW_HEIGHT * SUGGESTION_ROWS_VISIBLE,
          right: spacing.lg,
        },
      ]}
      contentContainerStyle={{ gap: space[1], padding: space[2] }}
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
                backgroundColor: pressed ? colors.primarySoft : colors.surfaceMuted,
                borderRadius: radius.full,
                paddingHorizontal: space[4],
              },
            ]}
          >
            <Text numberOfLines={1} style={[typography.label, styles.label, { color: colors.textSecondary }]}>
              {before}
              <Text style={{ color: colors.text, fontFamily: fontFamily.bodyBold }}>{matched}</Text>
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
    gap: space[2],
    height: ROW_HEIGHT,
  },
});
