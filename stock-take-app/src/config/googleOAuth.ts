import Constants from 'expo-constants';

type Extra = {
  googleOAuthWebClientId?: string;
  googleOAuthIosClientId?: string;
  googleOAuthAndroidClientId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const googleOAuth = {
  webClientId: extra.googleOAuthWebClientId ?? '',
  iosClientId: extra.googleOAuthIosClientId ?? '',
  androidClientId: extra.googleOAuthAndroidClientId ?? '',
};
