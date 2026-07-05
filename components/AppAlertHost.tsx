import { useCallback, useEffect, useState } from 'react';

import AppAlertModal from '@/components/AppAlertModal';
import {
  subscribeToAppAlerts,
  type AppAlertButton,
  type AppAlertRequest,
} from '@/lib/appAlert';

/**
 * Mounts once at the app root, renders queued app alerts one at a time, and
 * runs each button's action. Dismissing (backdrop/back) triggers the cancel
 * button when one exists, and never fires a destructive action by accident.
 */
export default function AppAlertHost() {
  const [queue, setQueue] = useState<AppAlertRequest[]>([]);
  const current = queue[0] ?? null;

  useEffect(
    () => subscribeToAppAlerts((request) => setQueue((q) => [...q, request])),
    [],
  );

  const advance = useCallback(() => setQueue((q) => q.slice(1)), []);

  const handlePressButton = useCallback(
    (button: AppAlertButton) => {
      button.onPress?.();
      advance();
    },
    [advance],
  );

  const handleDismiss = useCallback(() => {
    if (!current) {
      return;
    }

    const cancelButton = current.buttons.find(
      (button) => button.style === 'cancel',
    );
    cancelButton?.onPress?.();
    advance();
  }, [advance, current]);

  return (
    <AppAlertModal
      onDismiss={handleDismiss}
      onPressButton={handlePressButton}
      request={current}
      visible={current != null}
    />
  );
}
