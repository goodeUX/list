export type Plan = 'free' | 'premium';

/** Where premium came from: a store subscription, an owner comp grant, or n/a. */
export type PlanSource = 'store' | 'comp' | null;

export type ResolvedPlan = { plan: Plan; planSource: PlanSource };

/** Premium = paid OR comped. Store wins so subscription management stays visible. */
export function resolvePlan(storeActive: boolean, compActive: boolean): ResolvedPlan {
  if (storeActive) {
    return { plan: 'premium', planSource: 'store' };
  }
  if (compActive) {
    return { plan: 'premium', planSource: 'comp' };
  }
  return { plan: 'free', planSource: null };
}
