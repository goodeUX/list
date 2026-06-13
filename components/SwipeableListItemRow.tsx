import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import ListItemRow from '@/components/ListItemRow';
import { useTheme } from '@/contexts/ThemeContext';
import type { ListItem } from '@/lib/types';

const DELETE_ACTION_WIDTH = 88;

type SwipeableListItemRowProps = {
  item: ListItem;
  onDelete: () => void;
  onPress: () => void;
  onLongPress?: () => void;
  onSwipeOpen?: (close: () => void) => void;
  onToggle: () => void;
  isDragging?: boolean;
};

export default function SwipeableListItemRow({
  item,
  onDelete,
  onPress,
  onLongPress,
  onSwipeOpen,
  onToggle,
  isDragging = false,
}: SwipeableListItemRowProps) {
  const { colors } = useTheme();
  const swipeableRef = useRef<SwipeableMethods>(null);

  const closeSwipeable = useCallback(() => {
    swipeableRef.current?.close();
  }, []);

  const handleDelete = useCallback(() => {
    closeSwipeable();
    onDelete();
  }, [closeSwipeable, onDelete]);

  const handleSwipeableOpen = useCallback(() => {
    onSwipeOpen?.(() => swipeableRef.current?.close());
  }, [onSwipeOpen]);

  const renderRightActions = useCallback(() => {
    return (
      <View style={[styles.deleteAction, { width: DELETE_ACTION_WIDTH }]}>
        <Pressable
          accessibilityLabel={`Delete ${item.name}`}
          accessibilityRole="button"
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            {
              backgroundColor: colors.accent,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <MaterialIcons color={colors.surface} name="delete-outline" size={22} />
          <Text style={[styles.deleteLabel, { color: colors.surface }]}>Delete</Text>
        </Pressable>
      </View>
    );
  }, [colors.accent, colors.surface, handleDelete, item.name]);

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      containerStyle={styles.container}
      enabled={!isDragging}
      friction={2}
      onSwipeableOpen={handleSwipeableOpen}
      overshootRight={false}
      renderRightActions={renderRightActions}
      rightThreshold={DELETE_ACTION_WIDTH / 2}
    >
      <ListItemRow
        isDragging={isDragging}
        item={item}
        onLongPress={onLongPress}
        onPress={onPress}
        onToggle={onToggle}
      />
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  deleteAction: {
    height: '100%',
  },
  deleteButton: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  deleteLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
  },
});
