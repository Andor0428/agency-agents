import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as { supportApiUrl?: string };

export const supportApi = {
  baseUrl: (extra.supportApiUrl ?? '').replace(/\/$/, ''),
};

export function hasSupportApi(): boolean {
  return supportApi.baseUrl.length > 0;
}
