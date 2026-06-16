import {
  getGoogleOAuthRedirectUri,
  getGoogleOAuthSetupError,
  hasNativeOAuthRedirect,
  isExpoGo,
} from '@/config/googleOAuthRedirect';

jest.mock('expo-constants', () => ({
  __esModule: true,
  ExecutionEnvironment: {
    StoreClient: 'storeClient',
    Standalone: 'standalone',
    Bare: 'bare',
  },
  default: {
    executionEnvironment: 'storeClient',
  },
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn((options?: { native?: string; path?: string }) => {
    if (options?.native) return options.native;
    return 'exp://127.0.0.1:8081/--/oauth';
  }),
}));

describe('googleOAuthRedirect', () => {
  it('detects Expo Go', () => {
    expect(isExpoGo()).toBe(true);
    expect(hasNativeOAuthRedirect()).toBe(false);
  });

  it('returns setup guidance for Expo Go', () => {
    expect(getGoogleOAuthSetupError()).toMatch(/development build/i);
  });

  it('uses exp redirect in Expo Go', () => {
    expect(getGoogleOAuthRedirectUri()).toBe('exp://127.0.0.1:8081/--/oauth');
  });
});
