import { useEffect, useState } from 'react';

export const SPLASH_BACKGROUND_COLOR = '#DBB793';
export const OPENING_DISPLAY_MS = 3000;
export const OPENING_WELCOME_MS = OPENING_DISPLAY_MS;
export const OPENING_ZOOM_MS = 400;

export function useOpeningTransitionReady(
  fontsLoaded: boolean,
  openingComplete: boolean,
): boolean {
  return fontsLoaded && openingComplete;
}
