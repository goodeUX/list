import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { resolvePlan, type Plan, type PlanSource } from '@/lib/plan';
import { subscribeToPremiumGrant } from '@/lib/premiumGrants';
import {
  configurePurchases,
  isPurchasesAvailable,
  setPurchasesUser,
  subscribeToEntitlement,
} from '@/lib/purchases';
import {
  INACTIVE_ENTITLEMENT,
  type EntitlementSnapshot,
} from '@/lib/purchasesTypes';

type PlanContextValue = {
  plan: Plan;
  planSource: PlanSource;
  /** False until entitlement + user doc have loaded — gate banners on this. */
  planReady: boolean;
  purchasesAvailable: boolean;
  entitlement: EntitlementSnapshot;
  /** Over-cap pick (users/{uid}.activeListIds). Empty when unset. */
  activeListIds: string[];
  setActiveListIds: (ids: string[]) => Promise<void>;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  // Key effects on the stable uid/email, not the User object: Firebase emits
  // a new User reference on token refresh, which would otherwise tear down
  // and re-create every listener for the same signed-in user.
  const uid = user?.uid ?? null;
  const email = user?.email ?? null;
  const purchasesAvailable = isPurchasesAvailable();

  const [entitlement, setEntitlement] = useState(INACTIVE_ENTITLEMENT);
  const [entitlementLoaded, setEntitlementLoaded] = useState(!purchasesAvailable);
  // logIn(uid) must complete before we trust (or mirror) entitlement state,
  // otherwise the anonymous user's empty entitlements leak through.
  const [identityReady, setIdentityReady] = useState(false);
  const [compActive, setCompActive] = useState(false);
  const [mirroredPremium, setMirroredPremium] = useState(false);
  const [activeListIds, setActiveListIdsState] = useState<string[]>([]);
  const [userDocLoaded, setUserDocLoaded] = useState(false);

  useEffect(() => {
    configurePurchases();
    return subscribeToEntitlement((snapshot) => {
      setEntitlement(snapshot);
      setEntitlementLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    setIdentityReady(false);
    if (!uid) {
      // Defensive: a previous user's in-memory entitlement must never
      // outlive their identity.
      setEntitlement(INACTIVE_ENTITLEMENT);
    }
    let active = true;
    void setPurchasesUser(uid).finally(() => {
      if (active) {
        setIdentityReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, [authLoading, uid]);

  useEffect(() => {
    if (!email) {
      setCompActive(false);
      return;
    }
    return subscribeToPremiumGrant(email, setCompActive);
  }, [email]);

  useEffect(() => {
    if (!uid) {
      setMirroredPremium(false);
      setActiveListIdsState([]);
      setUserDocLoaded(false);
      return;
    }

    return onSnapshot(
      doc(db, 'users', uid),
      (snapshot) => {
        const data = snapshot.data();
        setMirroredPremium(Boolean(data?.premium));
        setActiveListIdsState(
          Array.isArray(data?.activeListIds) ? (data.activeListIds as string[]) : [],
        );
        setUserDocLoaded(true);
      },
      // Errors intentionally preserve prior mirror state and only mark the doc loaded.
      () => setUserDocLoaded(true),
    );
  }, [uid]);

  // On devices with the SDK, RevenueCat's server-validated state is the truth.
  // Elsewhere (web, Expo Go) fall back to the display mirror.
  const storeActive = purchasesAvailable ? entitlement.premium : mirroredPremium;
  const { plan, planSource } = resolvePlan(
    Boolean(uid) && storeActive,
    Boolean(uid) && compActive,
  );

  // Mirror the store entitlement to users/{uid} so web and other read-only
  // surfaces can display it. Display-only; RevenueCat remains the truth.
  useEffect(() => {
    if (!uid || !purchasesAvailable || !entitlementLoaded || !identityReady || !userDocLoaded) {
      return;
    }
    if (mirroredPremium === entitlement.premium) {
      return;
    }

    void setDoc(
      doc(db, 'users', uid),
      { premium: entitlement.premium },
      { merge: true },
    ).catch((error) => console.warn('[plan] failed to mirror premium flag', error));
  }, [
    entitlement.premium,
    entitlementLoaded,
    identityReady,
    mirroredPremium,
    purchasesAvailable,
    uid,
    userDocLoaded,
  ]);

  const setActiveListIds = useCallback(
    async (ids: string[]) => {
      if (!uid) {
        return;
      }
      await setDoc(
        doc(db, 'users', uid),
        { activeListIds: ids },
        { merge: true },
      );
    },
    [uid],
  );

  const planReady =
    !authLoading &&
    (!uid || userDocLoaded) &&
    (!purchasesAvailable || (entitlementLoaded && identityReady));

  const value = useMemo(
    () => ({
      plan,
      planSource,
      planReady,
      purchasesAvailable,
      entitlement,
      activeListIds,
      setActiveListIds,
    }),
    [activeListIds, entitlement, plan, planReady, planSource, purchasesAvailable, setActiveListIds],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within PlanProvider');
  }
  return context;
}
