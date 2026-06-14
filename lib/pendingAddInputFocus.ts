let pendingAddInputFocus = false;

export function markPendingAddInputFocus(): void {
  pendingAddInputFocus = true;
}

export function consumePendingAddInputFocus(): boolean {
  const shouldFocus = pendingAddInputFocus;
  pendingAddInputFocus = false;
  return shouldFocus;
}

export function clearPendingAddInputFocus(): void {
  pendingAddInputFocus = false;
}
