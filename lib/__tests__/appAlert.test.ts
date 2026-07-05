type AppAlertModule = typeof import('@/lib/appAlert');

let mod: AppAlertModule;

beforeEach(() => {
  jest.resetModules();
  mod = require('@/lib/appAlert');
});

test('defaults to a single OK button when none are given', () => {
  expect(mod.normalizeAlertButtons()).toEqual([{ text: 'OK' }]);
  expect(mod.normalizeAlertButtons([])).toEqual([{ text: 'OK' }]);
});

test('orders cancel buttons last, preserving the order of the rest', () => {
  const ordered = mod.normalizeAlertButtons([
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive' },
  ]);
  expect(ordered.map((b) => b.text)).toEqual(['Delete', 'Cancel']);
});

test('delivers an alert to the active subscriber', () => {
  const received: string[] = [];
  mod.subscribeToAppAlerts((request) => received.push(request.title));

  mod.showAppAlert('Could not save', 'Please try again.');

  expect(received).toEqual(['Could not save']);
});

test('buffers alerts raised before a subscriber exists, then flushes them', () => {
  mod.showAppAlert('First');
  mod.showAppAlert('Second');

  const received: string[] = [];
  mod.subscribeToAppAlerts((request) => received.push(request.title));

  expect(received).toEqual(['First', 'Second']);
});

test('stops delivering after unsubscribe', () => {
  const received: string[] = [];
  const unsubscribe = mod.subscribeToAppAlerts((request) =>
    received.push(request.title),
  );
  unsubscribe();

  mod.showAppAlert('Ignored');

  expect(received).toEqual([]);
});
