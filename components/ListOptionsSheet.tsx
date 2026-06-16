import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Dimensions, Modal, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/contexts/ThemeContext';

const DESTRUCTIVE_COLOR = '#D64545';
const MENU_ITEM_ICON_SIZE = 22;
const MENU_ITEM_REM = 16;

type ListOptionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  onInvite: () => void;
  showDeleteList: boolean;
  moveDoneToBottom: boolean;
  onMoveDoneToBottomChange: (value: boolean) => void;
  onClearList: () => void;
  onDeleteList: () => void;
  menuTop: number;
  /** Distance from the window's right edge to the menu's right edge. */
  menuRight: number;
};

const MENU_OPEN_MS = 140;

export default function ListOptionsSheet({
  visible,
  onClose,
  onInvite,
  showDeleteList,
  moveDoneToBottom,
  onMoveDoneToBottomChange,
  onClearList,
  onDeleteList,
  menuTop,
  menuRight,
}: ListOptionsSheetProps) {
  const { colors, radii, spacing } = useTheme();
  const menuScale = useSharedValue(0.96);
  const menuOpacity = useSharedValue(0);
  const wasVisibleRef = useRef(false);
  const windowWidth = Dimensions.get('window').width;
  const menuMaxWidth = Math.min(330, windowWidth - spacing.lg * 2);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      menuScale.value = 0.96;
      menuOpacity.value = 0;
      menuOpacity.value = withTiming(1, { duration: MENU_OPEN_MS });
      menuScale.value = withTiming(1, { duration: MENU_OPEN_MS });
    } else if (!visible) {
      menuScale.value = 0.96;
      menuOpacity.value = 0;
    }

    wasVisibleRef.current = visible;
  }, [menuOpacity, menuScale, visible]);

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.value,
    transform: [{ scale: menuScale.value }],
  }));

  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={styles.backdrop} />
        <View
          style={[
            styles.menuContainer,
            {
              right: menuRight,
              top: menuTop,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.menu,
              menuAnimatedStyle,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.card,
                maxWidth: menuMaxWidth,
                paddingVertical: spacing.xs,
                transformOrigin: 'top right',
                ...(Platform.OS === 'web'
                  ? { boxShadow: '0 8px 24px rgba(44, 36, 23, 0.18)' }
                  : {
                      elevation: 6,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.14,
                      shadowRadius: 10,
                    }),
              },
            ]}
          >
          <View style={styles.menuItem}>
            <MaterialIcons color={colors.text} name="move-down" size={MENU_ITEM_ICON_SIZE} />
            <Text style={[styles.menuItemText, styles.menuItemLabel, { color: colors.text }]}>
              Move 'done' to bottom
            </Text>
            <Switch
              accessibilityLabel="Move 'done' to bottom"
              onValueChange={onMoveDoneToBottomChange}
              thumbColor={moveDoneToBottom ? colors.accent : colors.surface}
              trackColor={{ false: colors.border, true: colors.accentSoft }}
              value={moveDoneToBottom}
            />
          </View>

          <Pressable
            onPress={() => {
              onClose();
              onInvite();
            }}
            style={({ pressed }) => [
              styles.menuItem,
              {
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialIcons color={colors.text} name="person-add" size={MENU_ITEM_ICON_SIZE} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Invite someone
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              onClose();
              onClearList();
            }}
            style={({ pressed }) => [
              styles.menuItem,
              {
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialIcons color={colors.text} name="playlist-remove" size={MENU_ITEM_ICON_SIZE} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Clear list
            </Text>
          </Pressable>

          {showDeleteList ? (
            <Pressable
              onPress={() => {
                onClose();
                onDeleteList();
              }}
              style={({ pressed }) => [
                styles.menuItem,
                {
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <MaterialIcons color={DESTRUCTIVE_COLOR} name="delete-outline" size={MENU_ITEM_ICON_SIZE} />
              <Text style={[styles.menuItemText, { color: DESTRUCTIVE_COLOR }]}>
                Delete list
              </Text>
            </Pressable>
          ) : null}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuContainer: {
    alignItems: 'flex-end',
    position: 'absolute',
  },
  menu: {
    borderWidth: 1,
    minWidth: 220,
  },
  menuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  menuItemLabel: {
    flex: 1,
  },
  menuItemText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: MENU_ITEM_REM,
    lineHeight: 22,
  },
});
