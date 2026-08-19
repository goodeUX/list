import { useCallback, useEffect, useMemo, useRef, useState, type ElementRef } from 'react';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type EmitterSubscription,
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
import EmojiPickerSheet from '@/components/EmojiPickerSheet';
import Button from '@/components/Button';
import ThemedTextInput, { getBorderedInputHeight } from '@/components/ThemedTextInput';
import { useTheme } from '@/contexts/ThemeContext';
import { focusTextInputNow, scheduleTextInputFocus } from '@/lib/focusTextInput';
import { dismissKeyboard } from '@/lib/dismissKeyboard';
import { useLastKeyboardHeight } from '@/lib/useLastKeyboardHeight';
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
const MODAL_FOCUS_DELAY_MS = MODAL_DELAY_MS + MODAL_DURATION_MS + 32;
const MODAL_TRANSLATE_Y = 48;
const MODAL_ESTIMATED_HEIGHT = 300;
const MODAL_VERTICAL_OFFSET = 84;
const MODAL_WIDTH_INSET = 24;
const MODAL_BUTTON_HEIGHT = 48;
const MODAL_EASING = Easing.out(Easing.cubic);
// Fallback for IMEs that never emit keyboardDidHide, so the sheet still opens.
const KEYBOARD_HIDE_TIMEOUT_MS = 350;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  // Observed while the name input is focused, so the sheet can match it later.
  const keyboardHeight = useLastKeyboardHeight();
  const pendingPickerOpenRef = useRef<{
    subscription: EmitterSubscription;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const listNameInputRef = useRef<ElementRef<typeof ThemedTextInput>>(null);
  const lastOpenModalAtRef = useRef(0);
  const [modalOverlayPaddingTop, setModalOverlayPaddingTop] = useState(24);
  const [modalLayerHeight, setModalLayerHeight] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const isListNameAtLimit = listName.length >= LIST_NAME_MAX_LENGTH;

  const modalBackdropStyle = useAnimatedStyle(() => ({
    opacity: modalBackdropOpacity.value,
  }));

  const modalDialogAnimatedStyle = useAnimatedStyle(() => ({
    opacity: modalDialogOpacity.value,
    transform: [{ translateY: modalDialogTranslateY.value }],
  }));

  const dismissImmediately = useCallback(() => {
    cancelAnimation(modalBackdropOpacity);
    cancelAnimation(modalDialogOpacity);
    cancelAnimation(modalDialogTranslateY);
    modalBackdropOpacity.value = 0;
    modalDialogOpacity.value = 0;
    modalDialogTranslateY.value = MODAL_TRANSLATE_Y;
    dismissKeyboard(listNameInputRef.current);
    releaseKeyboardProxy();
    setIsListNameFocused(false);
    setModalLayerHeight(null);
    onClose();
  }, [modalBackdropOpacity, modalDialogOpacity, modalDialogTranslateY, onClose]);

  const focusNameInput = useCallback(() => {
    if (!autoFocusOnOpen) {
      return;
    }

    const runFocus = () => {
      if (Platform.OS === 'web') {
        transferKeyboardFocus(listNameInputRef.current);
        setIsListNameFocused(true);
        return;
      }

      scheduleTextInputFocus(listNameInputRef.current);
      setIsListNameFocused(true);
    };

    setTimeout(runFocus, MODAL_FOCUS_DELAY_MS);

    if (Platform.OS === 'android') {
      setTimeout(runFocus, MODAL_FOCUS_DELAY_MS + 150);
    }
  }, [autoFocusOnOpen]);

  const handleFocusNameInput = useCallback(() => {
    if (Platform.OS === 'web') {
      transferKeyboardFocus(listNameInputRef.current);
    } else {
      focusTextInputNow(listNameInputRef.current);
    }

    setIsListNameFocused(true);
  }, []);

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
    setEmojiPickerOpen(false);
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
  }, [
    focusNameInput,
    initialEmoji,
    initialName,
    playOpenModalAnimation,
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

  const cancelPendingPickerOpen = useCallback(() => {
    if (!pendingPickerOpenRef.current) {
      return;
    }

    pendingPickerOpenRef.current.subscription.remove();
    clearTimeout(pendingPickerOpenRef.current.timer);
    pendingPickerOpenRef.current = null;
  }, []);

  useEffect(() => cancelPendingPickerOpen, [cancelPendingPickerOpen]);

  const closeEmojiPicker = useCallback(() => {
    cancelPendingPickerOpen();
    setEmojiPickerOpen(false);
  }, [cancelPendingPickerOpen]);

  const toggleEmojiPicker = useCallback(() => {
    if (emojiPickerOpen) {
      closeEmojiPicker();
      return;
    }

    cancelPendingPickerOpen();

    // Android resizes the window to sit above the soft keyboard, which would
    // anchor the sheet mid-screen and make it jump once the keyboard closes.
    // Waiting for the keyboard to finish hiding keeps the slide-in at the bottom.
    if (!Keyboard.isVisible()) {
      setEmojiPickerOpen(true);
      return;
    }

    const open = () => {
      cancelPendingPickerOpen();
      setEmojiPickerOpen(true);
    };

    pendingPickerOpenRef.current = {
      subscription: Keyboard.addListener('keyboardDidHide', open),
      timer: setTimeout(open, KEYBOARD_HIDE_TIMEOUT_MS),
    };

    Keyboard.dismiss();
  }, [cancelPendingPickerOpen, closeEmojiPicker, emojiPickerOpen]);

  const handleClose = useCallback(() => {
    if (submitting) {
      return;
    }

    closeEmojiPicker();
    dismissImmediately();
  }, [closeEmojiPicker, dismissImmediately, submitting]);

  const modalBodyStyle = useMemo(
    () => [styles.modalBody, { gap: spacing.lg, padding: spacing.lg }],
    [spacing.lg],
  );

  const modalContent = (
    <>
      {/* Emoji and name sit in one unstyled row so they read as a single control. */}
      <Pressable onPress={handleFocusNameInput} style={styles.nameField}>
        <EmojiPickerButton
          disabled={submitting}
          expanded={emojiPickerOpen}
          onPress={toggleEmojiPicker}
          value={listEmoji}
        />
        <ThemedTextInput
          editable={!submitting}
          invalid={isListNameAtLimit}
          onBlur={() => setIsListNameFocused(false)}
          onChangeText={handleChangeListName}
          onFocus={() => {
            setIsListNameFocused(true);
            // A tap on the field both focuses it and dismisses the sheet, so the
            // sheet never has to swallow a tap just to get out of the way.
            closeEmojiPicker();
          }}
          onSubmitEditing={() => {
            void handleSubmit();
          }}
          placeholder="Groceries, packing, gifts..."
          ref={listNameInputRef}
          returnKeyType="done"
          showSoftInputOnFocus
          style={styles.nameInput}
          value={listName}
          variant="plain"
        />
        {isListNameFocused ? (
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
        ) : null}
      </Pressable>

      {error || validationError ? (
        <Text style={[styles.error, { color: colors.accent }]}>
          {error ?? validationError}
        </Text>
      ) : null}

      <View style={styles.buttonRow}>
        <Button
          disabled={submitting}
          label="Cancel"
          onPress={handleClose}
          style={styles.buttonRowItem}
          variant="ghost"
        />

        <Button
          label={submitLabel}
          loading={submitting}
          onPress={() => {
            void handleSubmit();
          }}
          onPressIn={onSubmitPressIn}
          style={styles.buttonRowItem}
          variant="primary"
        />
      </View>
    </>
  );

  return (
    <>
    <View
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'yes' : 'no-hide-descendants'}
      style={[
        styles.modalShell,
        { paddingTop: modalOverlayPaddingTop, pointerEvents: visible ? 'auto' : 'none' },
        Platform.OS === 'web' && visible && modalLayerHeight != null
          ? ({ height: modalLayerHeight, position: 'fixed' } as object)
          : null,
      ]}
    >
      <AnimatedPressable
        disabled={submitting}
        onPress={handleClose}
        style={[styles.modalBackdrop, modalBackdropStyle]}
      />
      <Animated.View
        accessibilityLabel={title}
        accessibilityViewIsModal
        collapsable={false}
        style={[
          styles.modalDialog,
          modalDialogAnimatedStyle,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.card,
            ...(Platform.OS === 'web'
              ? { boxShadow: '0 12px 40px rgba(44, 36, 23, 0.2)' }
              : null),
          },
        ]}
      >
        {Platform.OS === 'web' ? (
          <View style={modalBodyStyle}>{modalContent}</View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView
              bounces={false}
              {...({ clipToPadding: false } as object)}
              contentContainerStyle={modalBodyStyle}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              style={styles.modalScroll}
            >
              {modalContent}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Animated.View>
    </View>

      {/* Sibling of the shell so it spans the screen, is not clipped by the
          shell padding, and layers above the dialog. */}
      {visible ? (
        <EmojiPickerSheet
          keyboardHeight={keyboardHeight}
          onClose={closeEmojiPicker}
          onSelect={setListEmoji}
          selected={listEmoji}
          visible={emojiPickerOpen}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  modalShell: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingBottom: 24,
    paddingHorizontal: MODAL_WIDTH_INSET / 2,
    zIndex: 100,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 36, 23, 0.35)',
  },
  modalDialog: {
    borderWidth: 1,
    maxWidth: CONTENT_MAX_WIDTH - MODAL_WIDTH_INSET,
    overflow: 'visible',
    width: '100%',
    zIndex: 1,
  },
  modalBody: {
    overflow: 'visible',
  },
  modalScroll: {
    overflow: 'visible',
  },
  nameField: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: getBorderedInputHeight(),
    paddingRight: 12,
  },
  nameInput: {
    // No left padding: the emoji cell supplies the field's left inset.
    flex: 1,
    paddingVertical: 14,
  },
  error: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  charCounter: {
    flexShrink: 0,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 8,
  },
  buttonRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  buttonRowItem: {
    flex: 1,
    height: MODAL_BUTTON_HEIGHT,
    minHeight: MODAL_BUTTON_HEIGHT,
    minWidth: 0,
    width: 'auto',
  },
});
