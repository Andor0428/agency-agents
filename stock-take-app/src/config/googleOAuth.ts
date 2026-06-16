import Constants from 'expo-constants';

type Extra = {
  googleOAuthClientId?: string;
  /** @deprecated use googleOAuthClientId — Desktop app client ID */
  googleOAuthWebClientId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Google OAuth "Desktop app" client — supports stocktake:// redirect (not Web application type). */
export const googleOAuth = {
  clientId: extra.googleOAuthClientId ?? extra.googleOAuthWebClientId ?? '',
};
