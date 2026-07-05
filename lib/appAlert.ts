/**
 * Branded, in-app replacement for React Native's `Alert.alert`. Mirrors its
 * signature so call sites swap `Alert.alert(...)` for `showAppAlert(...)`, and
 * works from non-React modules too. A single <AppAlertHost/> subscribes and
 * renders the modal; alerts raised before it mounts are buffered and flushed.
 */

export type AppAlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AppAlertButton = {
  text: string;
  onPress?: () => void;
  style?: AppAlertButtonStyle;
};

export type AppAlertRequest = {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
};

type Listener = (request: AppAlertRequest) => void;

let listener: Listener | null = null;
const pending: AppAlertRequest[] = [];

/** Fills in a default OK button and floats cancel buttons to the bottom. */
export function normalizeAlertButtons(
  buttons?: AppAlertButton[],
): AppAlertButton[] {
  if (!buttons || buttons.length === 0) {
    return [{ text: 'OK' }];
  }

  const cancelRank = (button: AppAlertButton) =>
    button.style === 'cancel' ? 1 : 0;
  return [...buttons].sort((a, b) => cancelRank(a) - cancelRank(b));
}

export function showAppAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
): void {
  const request: AppAlertRequest = {
    title,
    message,
    buttons: normalizeAlertButtons(buttons),
  };

  if (listener) {
    listener(request);
  } else {
    pending.push(request);
  }
}

/** Registers the host. Returns an unsubscribe fn. Flushes buffered alerts. */
export function subscribeToAppAlerts(next: Listener): () => void {
  listener = next;

  while (pending.length > 0) {
    next(pending.shift()!);
  }

  return () => {
    if (listener === next) {
      listener = null;
    }
  };
}
