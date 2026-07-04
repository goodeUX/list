import { useCallback, useEffect, useState } from 'react';

import {
  authenticateForAppLock,
  getAppLockCapability,
  isAppLockEnabled,
  setAppLockEnabled,
  type AppLockCapability,
} from '@/lib/appLock';

export function useAppLock() {
  const [capability, setCapability] = useState<AppLockCapability>('unsupported');
  const [enabled, setEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void (async () => {
      const [nextCapability, nextEnabled] = await Promise.all([
        getAppLockCapability(),
        isAppLockEnabled(),
      ]);

      if (active) {
        setCapability(nextCapability);
        setEnabledState(nextEnabled);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  /** Enabling requires a successful biometric check. Returns the applied state. */
  const setEnabled = useCallback(async (next: boolean): Promise<boolean> => {
    if (next && !(await authenticateForAppLock())) {
      return false;
    }

    await setAppLockEnabled(next);
    setEnabledState(next);
    return next;
  }, []);

  return { capability, enabled, loading, setEnabled };
}
