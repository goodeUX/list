import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { buttonLabelStyle, buttonLayoutStyle } from '@/lib/buttonStyles';

type SocialAuthButtonsProps = {
  disabled: boolean;
  showApple: boolean;
  googleBusy: boolean;
  appleBusy: boolean;
  onGooglePress: () => void;
  onApplePress: () => void;
};

export default function SocialAuthButtons({
  disabled,
  showApple,
  googleBusy,
  appleBusy,
  onGooglePress,
  onApplePress,
}: SocialAuthButtonsProps) {
  const { colors, radii } = useTheme();

  const buttonStyle = ({ pressed }: { pressed: boolean }) => [
    styles.button,
    buttonLayoutStyle,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      opacity: pressed || disabled ? 0.7 : 1,
    },
  ];

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Continue with Google"
        accessibilityRole="button"
        accessibilityState={{ disabled, busy: googleBusy }}
        disabled={disabled}
        onPress={onGooglePress}
        style={buttonStyle}
      >
        {googleBusy ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <View style={styles.row}>
            <Ionicons color={colors.text} name="logo-google" size={20} />
            <Text style={[buttonLabelStyle(16), { color: colors.text }]}>
              Continue with Google
            </Text>
          </View>
        )}
      </Pressable>

      {showApple ? (
        <Pressable
          accessibilityLabel="Continue with Apple"
          accessibilityRole="button"
          accessibilityState={{ disabled, busy: appleBusy }}
          disabled={disabled}
          onPress={onApplePress}
          style={buttonStyle}
        >
          {appleBusy ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <View style={styles.row}>
              <Ionicons color={colors.text} name="logo-apple" size={20} />
              <Text style={[buttonLabelStyle(16), { color: colors.text }]}>
                Continue with Apple
              </Text>
            </View>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  button: {
    borderWidth: 1,
    minHeight: 52,
    width: '100%',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
});
