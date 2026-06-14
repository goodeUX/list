import { useEffect, useState } from 'react';

export const SPLASH_BACKGROUND_COLOR = '#DBB793';
export const SPLASH_SPINNER_COLOR = '#C4785A';
export const MIN_SPLASH_DURATION_MS = 2500;
export const SPLASH_IMAGE_TIMEOUT_MS = 4000;

export function useAppSplashReady(fontsLoaded: boolean, imageReady: boolean) {
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinDurationElapsed(true), MIN_SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  return fontsLoaded && minDurationElapsed && imageReady;
}
