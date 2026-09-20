import { Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { fontFamily, space } from '@/lib/design';

type BadgeTone = 'primary' | 'secondary' | 'success' | 'danger' | 'neutral';

const TONE_BG: Record<BadgeTone, 'primarySoft' | 'surfaceMuted' | 'dangerSoft'> = {
  primary: 'primarySoft',
  secondary: 'surfaceMuted',
  success: 'surfaceMuted',
  danger: 'dangerSoft',
  neutral: 'surfaceMuted',
};

const TONE_FG: Record<BadgeTone, 'primary' | 'secondary' | 'success' | 'danger' | 'textSecondary'> = {
  primary: 'primary',
  secondary: 'secondary',
  success: 'success',
  danger: 'danger',
  neutral: 'textSecondary',
};

export default function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const { colors, radius, typography } = useTheme();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: colors[TONE_BG[tone]],
        borderRadius: radius.full,
        paddingHorizontal: space[3],
        paddingVertical: space[1],
      }}
    >
      <Text style={{ ...typography.caption, fontFamily: fontFamily.bodySemiBold, color: colors[TONE_FG[tone]] }}>
        {label}
      </Text>
    </View>
  );
}
