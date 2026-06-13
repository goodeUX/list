import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const SHEET_EASING = Easing.inOut(Easing.ease);
const OPEN_DURATION = 260;
const CLOSE_DURATION = 260;

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  onOpened?: () => void;
  children: ReactNode;
  blocking?: boolean;
};

export default function BottomSheet({
  visible,
  onClose,
  onOpened,
  children,
  blocking = false,
}: BottomSheetProps) {
  const [rendered, setRendered] = useState(visible);
  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(400);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      backdropOpacity.value = withTiming(1, {
        duration: OPEN_DURATION,
        easing: SHEET_EASING,
      });
      sheetTranslateY.value = withTiming(0, {
        duration: OPEN_DURATION,
        easing: SHEET_EASING,
      }, (finished) => {
        if (finished && onOpened) {
          runOnJS(onOpened)();
        }
      });
      return;
    }

    if (!rendered) {
      return;
    }

    backdropOpacity.value = withTiming(0, {
      duration: CLOSE_DURATION,
      easing: SHEET_EASING,
    });
    sheetTranslateY.value = withTiming(
      400,
      { duration: CLOSE_DURATION, easing: SHEET_EASING },
      (finished) => {
        if (finished) {
          runOnJS(setRendered)(false);
        }
      },
    );
  }, [backdropOpacity, onOpened, rendered, sheetTranslateY, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  if (!rendered) {
    return null;
  }

  const handleClose = () => {
    if (blocking) {
      return;
    }
    onClose();
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={handleClose}
      transparent
      visible={rendered}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            disabled={blocking}
            onPress={handleClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Animated.View style={sheetStyle}>{children}</Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 36, 23, 0.35)',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
});
