export const palette = {
  coral: { 50: '#FFF0EE', 100: '#FFDAD5', 200: '#FFB8AF', 300: '#FF9488', 400: '#FF7C6E', 500: '#FF6B5C', 600: '#ED5546', 700: '#C8412F', 800: '#9E3326', 900: '#6E2117' },
  sand: { 0: '#FFFFFF', 50: '#FFF8EF', 100: '#F3EDE4', 200: '#E9E0D3', 300: '#E5DDD0', 400: '#D8CCBB', 500: '#B9AB98', 600: '#8A7F72', 700: '#6B5E4F', 800: '#4A4034', 900: '#2B2018' },
  teal: { 50: '#E6F5F3', 100: '#C4E8E4', 200: '#93D5CF', 300: '#5FC0B8', 400: '#3DAFA6', 500: '#2FA29B', 600: '#268780', 700: '#1F6D67', 800: '#17524E', 900: '#0F3734' },
  butter: { 50: '#FFF7E6', 100: '#FFECC2', 200: '#FFDD93', 300: '#FFD065', 400: '#FFC957', 500: '#FFC24B', 600: '#EDAB2E', 700: '#C98A1E', 800: '#9E6C15', 900: '#6E4A0E' },
  green: { 50: '#EAF5EE', 100: '#CBE8D4', 200: '#A3D6B3', 300: '#77C08F', 400: '#5CAF78', 500: '#4CA167', 600: '#3C8654', 700: '#2F6B43', 800: '#235133', 900: '#163622' },
  red: { 50: '#FCECEA', 100: '#F8CFCC', 200: '#F0A29D', 300: '#E66E68', 400: '#DB4A44', 500: '#D2322F', 600: '#B22826', 700: '#8F1F1E', 800: '#6B1817', 900: '#47100F' },
} as const;

export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

export const fontSize = { display: 34, h1: 28, h2: 22, title: 18, bodyL: 17, body: 15, bodyS: 13, label: 15, caption: 12 } as const;

export const lineHeight = { display: 40, h1: 34, h2: 28, title: 24, bodyL: 26, body: 22, bodyS: 18, label: 20, caption: 16 } as const;

export const fontFamily = {
  displayBold: 'Fredoka_700Bold',
  displaySemiBold: 'Fredoka_600SemiBold',
  displayMedium: 'Fredoka_500Medium',
  bodyRegular: 'NunitoSans_400Regular',
  bodySemiBold: 'NunitoSans_600SemiBold',
  bodyBold: 'NunitoSans_700Bold',
} as const;
