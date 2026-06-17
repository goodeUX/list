import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/contexts/ThemeContext';

const DESTRUCTIVE_COLOR = '#D64545';
const MENU_ITEM_ICON_SIZE = 22;
const MENU_ITEM_REM = 16;
const MENU_ITEM_HORIZONTAL_PADDING = 14;
const MENU_ITEM_GAP = 10;
const MENU_MIN_WIDTH = 320;
const BUTTON_SIZE = 44;
const MENU_ANCHOR_GAP = 8;
const ICON_ROTATION_MS = 200;
const MENU_OPEN_MS = 140;

const menuItemTextStyle = {
  flexShrink: 0,
  fontFamily: 'NunitoSans_600SemiBold',
  fontSize: MENU_ITEM_REM,
  lineHeight: 22,
  ...(Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as object) : null),
};

type ListOptionsMenuProps = {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  showDeleteList: boolean;
  moveDoneToBottom: boolean;
  onMoveDoneToBottomChange: (value: boolean) => void;
  onInvite: () => void;
  onClearList: () => void;
  onDeleteList: () => void;
  onOpen?: () => void;
};

type MenuLayout = {
  right: number;
  top: number;
};

export default function ListOptionsMenu({
  visible,
  onVisibleChange,
  showDeleteList,
  moveDoneToBottom,
  onMoveDoneToBottomChange,
  onInvite,
  onClearList,
  onDeleteList,
  onOpen,
}: ListOptionsMenuProps) {
  const { colors, radii, spacing } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [menuLayout, setMenuLayout] = useState<MenuLayout | null>(null);
  const anchorRef = useRef<View>(null);
  const overlayRef = useRef<View>(null);
  const iconRotation = useSharedValue(0);
  const menuScale = useSharedValue(0.96);
  const menuOpacity = useSharedValue(0);
  const wasVisibleRef = useRef(false);
  const menuMaxWidth = Math.max(MENU_MIN_WIDTH, windowWidth - spacing.lg * 2);

  const closeMenu = useCallback(() => {
    onVisibleChange(false);
    setMenuLayout(null);
  }, [onVisibleChange]);

  const updateMenuLayout = useCallback(() => {
    const anchor = anchorRef.current;
    const overlay = overlayRef.current;
    if (!anchor || !overlay) {
      return;
    }

    anchor.measureInWindow((anchorX, anchorY, anchorWidth, anchorHeight) => {
      overlay.measureInWindow((overlayX, _overlayY, overlayWidth) => {
        setMenuLayout({
          top: anchorY - _overlayY + anchorHeight + MENU_ANCHOR_GAP,
          right: overlayX + overlayWidth - (anchorX + anchorWidth),
        });
      });
    });
  }, []);

  const openMenu = useCallback(() => {
    onOpen?.();
    onVisibleChange(true);
  }, [onOpen, onVisibleChange]);

  const toggleMenu = useCallback(() => {
    if (visible) {
      closeMenu();
      return;
    }

    openMenu();
  }, [closeMenu, openMenu, visible]);

  useEffect(() => {
    iconRotation.value = withTiming(visible ? 90 : 0, {
      duration: ICON_ROTATION_MS,
      easing: Easing.inOut(Easing.ease),
    });
  }, [iconRotation, visible]);

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

  useEffect(() => {
    if (!visible) {
      return;
    }

    const frame = requestAnimationFrame(updateMenuLayout);
    return () => cancelAnimationFrame(frame);
  }, [updateMenuLayout, visible, windowWidth]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeMenu();
      return true;
    });

    return () => subscription.remove();
  }, [closeMenu, visible]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }],
  }));

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.value,
    transform: [{ scale: menuScale.value }],
  }));

  return (
    <>
      <View collapsable={false} ref={anchorRef} style={styles.anchor}>
        <Pressable
          accessibilityLabel="List options"
          accessibilityRole="button"
          accessibilityState={{ expanded: visible }}
          hitSlop={8}
          onPress={toggleMenu}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: visible ? colors.surfaceMuted : colors.surface,
              borderColor: visible ? colors.accent : 'transparent',
              borderWidth: visible ? 1.5 : 0,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Animated.View style={iconStyle}>
            <MaterialIcons color={colors.accent} name="more-horiz" size={22} />
          </Animated.View>
        </Pressable>
      </View>

      <Modal animationType="none" onRequestClose={closeMenu} transparent visible={visible}>
        <View
          ref={overlayRef}
          collapsable={false}
          onLayout={updateMenuLayout}
          style={styles.overlay}
        >
          <Pressable onPress={closeMenu} style={styles.backdrop} />
          {menuLayout ? (
            <View
              style={[
                styles.menuContainer,
                {
                  pointerEvents: 'box-none',
                  right: menuLayout.right,
                  top: menuLayout.top,
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
                  <Text style={[menuItemTextStyle, { color: colors.text }]}>
                    Move 'done' to bottom
                  </Text>
                  <View style={styles.menuItemSpacer} />
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
                    closeMenu();
                    onInvite();
                  }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <MaterialIcons color={colors.text} name="person-add" size={MENU_ITEM_ICON_SIZE} />
                  <Text style={[menuItemTextStyle, { color: colors.text }]}>
                    Invite someone
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    closeMenu();
                    onClearList();
                  }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <MaterialIcons
                    color={colors.text}
                    name="playlist-remove"
                    size={MENU_ITEM_ICON_SIZE}
                  />
                  <Text style={[menuItemTextStyle, { color: colors.text }]}>
                    Clear list
                  </Text>
                </Pressable>

                {showDeleteList ? (
                  <Pressable
                    onPress={() => {
                      closeMenu();
                      onDeleteList();
                    }}
                    style={({ pressed }) => [
                      styles.menuItem,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <MaterialIcons
                      color={DESTRUCTIVE_COLOR}
                      name="delete-outline"
                      size={MENU_ITEM_ICON_SIZE}
                    />
                    <Text style={[menuItemTextStyle, { color: DESTRUCTIVE_COLOR }]}>
                      Delete list
                    </Text>
                  </Pressable>
                ) : null}
              </Animated.View>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  anchor: {
    flexShrink: 0,
  },
  button: {
    alignItems: 'center',
    borderRadius: 22,
    height: BUTTON_SIZE,
    justifyContent: 'center',
    width: BUTTON_SIZE,
  },
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
    alignSelf: 'flex-start',
    borderWidth: 1,
    minWidth: MENU_MIN_WIDTH,
  },
  menuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: MENU_ITEM_GAP,
    minHeight: 44,
    paddingHorizontal: MENU_ITEM_HORIZONTAL_PADDING,
  },
  menuItemSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: MENU_ITEM_GAP,
  },
});
