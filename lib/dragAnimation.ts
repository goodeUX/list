// Shared by every DraggableFlatList in the app so drops feel identical.
//
// The library commits the reorder (and clears the lifted/active row state) only
// when this drop spring *completes*. In Reanimated v4 a spring completes either
// when overshootClamping catches an overshoot, or when relative energy decays to
// energyThreshold (default 6e-9 — a very long asymptotic tail). An over/critically
// damped spring never overshoots, so it can only finish via that slow tail, which
// makes the dropped row hang in its lifted state long after it looks settled.
// Using an UNDERdamped spring (damping ratio < 1) with overshootClamping makes it
// reach the target in ~80ms and terminate on first arrival, so the row commits
// into place promptly. (Reanimated v4 SpringConfig: stiffness/damping/mass.)
export const DROP_ANIMATION_CONFIG = {
  stiffness: 450,
  damping: 22,
  mass: 0.6,
  overshootClamping: true,
};
