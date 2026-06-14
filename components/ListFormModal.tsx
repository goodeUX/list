import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState, type ElementRef } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutRectangle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import EmojiPickerButton from '@/components/EmojiPickerButton';
import ThemedTextInput, {
  getBorderedInputHeight,
  getThemedInputContainerStyle,
} from '@/components/ThemedTextInput';
import { useTheme } from '@/contexts/ThemeContext';
import { focusTextInputNow } from '@/lib/focusTextInput';
import {
  acquireKeyboardSession,
  releaseKeyboardProxy,
  transferKeyboardFocus,
} from '@/lib/keyboardProxy';
import {
  LIST_NAME_MAX_LENGTH,
  limitListNameLength,
  normalizeListName,
} from '@/lib/listName';
import { CONTENT_MAX_WIDTH } from '@/lib/slideTransition';

const DEFAULT_EMOJI = '📋';
const MODAL_DELAY_MS = 100;
const MODAL_DURATION_MS = 280;
const MODAL_TRANSLATE_Y = 48;
const MODAL_ESTIMATED_HEIGHT = 300;
const MODAL_VERTICAL_OFFSET = 84;
const MODAL_WIDTH_INSET = 24;
const MODAL_EASING = Easing.out(Easing.cubic);

type ListFormModalProps = {
  visible: boolean;
  title: string;
  submitLabel: string;
  initialName?: string;
  initialEmoji?: string;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (name: string, emoji: string) => void | Promise<void>;
  onSubmitPressIn?: () => void;
  autoFocusOnOpen?: boolean;
};

export default function ListFormModal({
  visible,
  title,
  submitLabel,
  initialName = '',
  initialEmoji = DEFAULT_EMOJI,
  submitting = false,
  error = null,
  onClose,
  onSubmit,
  onSubmitPressIn,
  autoFocusOnOpen = true,
}: ListFormModalProps) {
  const { colors, radii, spacing } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const modalBackdropOpacity = useSharedValue(0);
  const modalDialogOpacity = useSharedValue(0);
  const modalDialogTranslateY = useSharedValue(MODAL_TRANSLATE_Y);
  const [listName, setListName] = useState(initialName);
  const [listEmoji, setListEmoji] = useState(initialEmoji);
  const [isListNameFocused, setIsListNameFocused] = useState(false);
  const listNameInputRef = useRef<ElementRef<typeof ThemedTextInput>>(null);
  const modalDialogRef = useRef<View>(null);
  const lastOpenModalAtRef = useRef(0);
  const [modalDialogLayout, setModalDialogLayout] = useState<LayoutRectangle | null>(null);
  const [modalOverlayPaddingTop, setModalOverlayPaddingTop] = useState(24);
  const [modalLayerHeight, setModalLayerHeight] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const modalBackdropStyle = useAnimatedStyle(() => ({
    opacity: modalBackdropOpacity.value,
  }));

  const modalDialogAnimatedStyle = useAnimatedStyle(() => ({
    opacity: modalDialogOpacity.value,
    transform: [{ translateY: modalDialogTranslateY.value }],
  }));

  const modalContentLayout = useMemo(() => {
    if (!modalDialogLayout) {
      return null;
    }

    const inset = spacing.lg;
    return {
      x: modalDialogLayout.x + inset,
      y: modalDialogLayout.y + inset,
      width: modalDialogLayout.width - inset * 2,
      height: modalDialogLayout.height - inset * 2,
    };
  }, [modalDialogLayout, spacing.lg]);

  const updateModalDialogLayout = useCallback(() => {
    modalDialogRef.current?.measureInWindow((x, y, width, height) => {
      setModalDialogLayout({ x, y, width, height });
    });
  }, []);

  const dismissImmediately = useCallback(() => {
    cancelAnimation(modalBackdropOpacity);
    cancelAnimation(modalDialogOpacity);
    cancelAnimation(modalDialogTranslateY);
    modalBackdropOpacity.value = 0;
    modalDialogOpacity.value = 0;
    modalDialogTranslateY.value = MODAL_TRANSLATE_Y;
    listNameInputRef.current?.blur();
    releaseKeyboardProxy();
    setIsListNameFocused(false);
    setModalLayerHeight(null);
    onClose();
  }, [modalBackdropOpacity, modalDialogOpacity, modalDialogTranslateY, onClose]);

  const playOpenModalAnimation = useCallback(() => {
    modalBackdropOpacity.value = 0;
    modalDialogOpacity.value = 0;
    modalDialogTranslateY.value = MODAL_TRANSLATE_Y;

    modalBackdropOpacity.value = withDelay(
      MODAL_DELAY_MS,
      withTiming(1, {
        duration: MODAL_DURATION_MS,
        easing: MODAL_EASING,
      }),
    );
    modalDialogOpacity.value = withDelay(
      MODAL_DELAY_MS,
      withTiming(1, {
        duration: MODAL_DURATION_MS,
        easing: MODAL_EASING,
      }),
    );
    modalDialogTranslateY.value = withDelay(
      MODAL_DELAY_MS,
      withTiming(0, {
        duration: MODAL_DURATION_MS,
        easing: MODAL_EASING,
      }),
    );
  }, [modalBackdropOpacity, modalDialogOpacity, modalDialogTranslateY]);

  const focusNameInput = useCallback(() => {
    if (!autoFocusOnOpen) {
      return;
    }

    if (Platform.OS === 'web') {
      transferKeyboardFocus(listNameInputRef.current);
      if (!listNameInputRef.current) {
        requestAnimationFrame(() => {
          transferKeyboardFocus(listNameInputRef.current);
        });
      }
      return;
    }

    focusTextInputNow(listNameInputRef.current);
  }, [autoFocusOnOpen]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const now = Date.now();
    if (now - lastOpenModalAtRef.current < 300) {
      return;
    }
    lastOpenModalAtRef.current = now;

    if (Platform.OS === 'web') {
      acquireKeyboardSession();
    }

    setListName(initialName);
    setListEmoji(initialEmoji || DEFAULT_EMOJI);
    setIsListNameFocused(false);
    setValidationError(null);
    setModalLayerHeight(windowHeight);
    setModalOverlayPaddingTop(
      Math.max(
        24,
        (windowHeight - MODAL_ESTIMATED_HEIGHT) / 2 - MODAL_VERTICAL_OFFSET,
      ),
    );
    playOpenModalAnimation();
    focusNameInput();

    const frame = requestAnimationFrame(updateModalDialogLayout);
    return () => cancelAnimationFrame(frame);
  }, [
    focusNameInput,
    initialEmoji,
    initialName,
    playOpenModalAnimation,
    updateModalDialogLayout,
    visible,
    windowHeight,
  ]);

  useEffect(() => {
    if (visible) {
      return;
    }

    cancelAnimation(modalBackdropOpacity);
    cancelAnimation(modalDialogOpacity);
    cancelAnimation(modalDialogTranslateY);
    modalBackdropOpacity.value = 0;
    modalDialogOpacity.value = 0;
    modalDialogTranslateY.value = MODAL_TRANSLATE_Y;
    setModalLayerHeight(null);
  }, [modalBackdropOpacity, modalDialogOpacity, modalDialogTranslateY, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (submitting) {
        return true;
      }

      dismissImmediately();
      return true;
    });

    return () => subscription.remove();
  }, [dismissImmediately, submitting, visible]);

  const handleChangeListName = useCallback((text: string) => {
    setValidationError(null);
    setListName(limitListNameLength(text));
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmedName = normalizeListName(listName);
    if (!trimmedName) {
      setValidationError('Please enter a list name.');
      return;
    }

    setValidationError(null);
    await onSubmit(trimmedName, listEmoji);
  }, [listEmoji, listName, onSubmit]);

  const handleClose = useCallback(() => {
    if (submitting) {
      return;
    }

    dismissImmediately();
  }, [dismissImmediately, submitting]);

  return (
    <View
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'yes' : 'no-hide-descendants'}
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.modalLayer,
        Platform.OS === 'web' && visible && modalLayerHeight != null
          ? { height: modalLayerHeight, position: 'fixed' }
          : null,
      ]}
    >
      <View style={[styles.modalOverlay, { paddingTop: modalOverlayPaddingTop }]}>
        <Animated.View style={[styles.modalBackdrop, modalBackdropStyle]}>
          <Pressable
            disabled={submitting}
            onPress={handleClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          ref={modalDialogRef}
          collapsable={false}
          onLayout={updateModalDialogLayout}
          style={[
            styles.modalDialog,
            modalDialogAnimatedStyle,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.lg,
              ...(Platform.OS === 'web'
                ? { boxShadow: '0 12px 40px rgba(44, 36, 23, 0.2)' }
                : null),
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              disabled={submitting}
              hitSlop={8}
              onPress={handleClose}
              style={({ pressed }) => [
                styles.modalCloseButton,
                { opacity: pressed || submitting ? 0.7 : 1 },
              ]}
            >
              <MaterialIcons color={colors.textSecondary} name="close" size={24} />
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
            <View style={styles.nameRow}>
              <EmojiPickerButton
                disabled={submitting}
                dropdownContainerLayout={modalContentLayout}
                onChange={setListEmoji}
                value={listEmoji}
              />
              <View
                style={[
                  styles.nameInputContainer,
                  getThemedInputContainerStyle(colors, isListNameFocused),
                  { borderRadius: radii.item },
                ]}
              >
                <ThemedTextInput
                  editable={!submitting}
                  onBlur={() => setIsListNameFocused(false)}
                  onChangeText={handleChangeListName}
                  onFocus={() => setIsListNameFocused(true)}
                  onSubmitEditing={() => {
                    void handleSubmit();
                  }}
                  placeholder="Groceries, packing, gifts..."
                  ref={listNameInputRef}
                  returnKeyType="done"
                  style={styles.nameInput}
                  value={listName}
                  variant="plain"
                />
                <Text
                  style={[
                    styles.charCounter,
                    {
                      color:
                        listName.length >= LIST_NAME_MAX_LENGTH
                          ? colors.accent
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {listName.length}/{LIST_NAME_MAX_LENGTH}
                </Text>
              </View>
            </View>
          </View>

          {error || validationError ? (
            <Text style={[styles.error, { color: colors.accent }]}>
              {error ?? validationError}
            </Text>
          ) : null}

          <Pressable
            disabled={submitting}
            onPress={() => {
              void handleSubmit();
            }}
            onPressIn={onSubmitPressIn}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: colors.accent,
                borderRadius: radii.item,
                marginTop: spacing.md,
                opacity: pressed || submitting ? 0.85 : 1,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.surface }]}>
                {submitLabel}
              </Text>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  modalOverlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    paddingBottom: 24,
    paddingHorizontal: MODAL_WIDTH_INSET / 2,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 36, 23, 0.35)',
  },
  modalDialog: {
    borderWidth: 1,
    gap: 16,
    maxWidth: CONTENT_MAX_WIDTH - MODAL_WIDTH_INSET,
    width: '100%',
    zIndex: 1,
  },
  modalTitle: {
    flex: 1,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  modalCloseButton: {
    alignItems: 'center',
    flexShrink: 0,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  field: {
    gap: 6,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  nameInputContainer: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: getBorderedInputHeight(),
    paddingRight: 12,
  },
  nameInput: {
    flex: 1,
    paddingLeft: 16,
    paddingVertical: 14,
  },
  label: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
  },
  error: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  charCounter: {
    flexShrink: 0,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    width: '100%',
  },
  submitButtonText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
  },
});
