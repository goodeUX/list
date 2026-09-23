import AsyncStorage from '@react-native-async-storage/async-storage';

import { setPendingInviteListId } from '@/lib/pendingInvite';
import { navigateAfterSignIn } from '@/lib/postAuthNavigation';

const mockRouter = {
  dismissTo: jest.fn(),
  replace: jest.fn(),
};

jest.mock('expo-router', () => ({
  router: {
    dismissTo: (...args: unknown[]) => mockRouter.dismissTo(...args),
    replace: (...args: unknown[]) => mockRouter.replace(...args),
  },
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  mockRouter.dismissTo.mockClear();
  mockRouter.replace.mockClear();
});

describe('navigateAfterSignIn', () => {
  it('returns to the existing My Lists for a redirect to home', async () => {
    // Settings' sign-in and create-account buttons redirect to '/'.
    await navigateAfterSignIn('/');
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('returns to the existing My Lists with no redirect', async () => {
    await navigateAfterSignIn();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('replaces the sign-in screen with any other redirect', async () => {
    await navigateAfterSignIn('/list/abc/share');
    expect(mockRouter.replace).toHaveBeenCalledWith('/list/abc/share');
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('opens a pending invite before going home', async () => {
    await setPendingInviteListId('list-1');
    await navigateAfterSignIn();
    expect(mockRouter.replace).toHaveBeenCalledWith('/join/list-1');
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });
});
