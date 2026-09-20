import { palette } from './primitives';

export type SemanticColors = {
  bg: string; surface: string; surfaceMuted: string; surfaceRaised: string;
  text: string; textSecondary: string; textMuted: string;
  border: string; borderStrong: string;
  primary: string; primaryPressed: string; primarySoft: string; onPrimary: string;
  secondary: string; accent: string;
  success: string; danger: string; dangerSoft: string;
  scrim: string;
};

export const semantic: { light: SemanticColors; dark: SemanticColors } = {
  light: {
    bg: palette.sand[50], surface: palette.sand[0], surfaceMuted: palette.sand[100], surfaceRaised: palette.sand[0],
    text: palette.sand[900], textSecondary: palette.sand[700], textMuted: palette.sand[600],
    border: palette.sand[300], borderStrong: palette.sand[400],
    primary: palette.coral[500], primaryPressed: palette.coral[600], primarySoft: palette.coral[100], onPrimary: '#FFFFFF',
    secondary: palette.teal[500], accent: palette.butter[500],
    success: palette.green[500], danger: palette.red[500], dangerSoft: palette.red[50],
    scrim: 'rgba(43,32,24,0.5)',
  },
  dark: {
    bg: '#1A1612', surface: '#252019', surfaceMuted: '#2E2820', surfaceRaised: '#2E2820',
    text: '#F5F0E8', textSecondary: '#A89B8C', textMuted: '#7E7365',
    border: '#3D352C', borderStrong: '#4A4034',
    primary: palette.coral[400], primaryPressed: palette.coral[500], primarySoft: '#3D2A26', onPrimary: '#FFFFFF',
    secondary: palette.teal[400], accent: palette.butter[400],
    success: '#7DB88E', danger: '#E06A5E', dangerSoft: '#3D211F',
    scrim: 'rgba(0,0,0,0.6)',
  },
};
