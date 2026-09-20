import { Switch, type SwitchProps } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

type AppSwitchProps = Omit<SwitchProps, 'trackColor' | 'thumbColor'>;

/**
 * Themed wrapper around RN core `Switch` so every on/off control in the app
 * uses the same primary/border tokens instead of the platform default green.
 */
export default function AppSwitch(props: AppSwitchProps) {
  const { colors } = useTheme();

  return (
    <Switch
      {...props}
      thumbColor={colors.surface}
      trackColor={{ false: colors.border, true: colors.primary }}
    />
  );
}
