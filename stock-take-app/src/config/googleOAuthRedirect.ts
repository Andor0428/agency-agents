import Constants, { ExecutionEnvironment } from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';

/** True when running inside the Expo Go app (not a dev/standalone build). */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/** True when the native stocktake:// scheme is registered on device. */
export function hasNativeOAuthRedirect(): boolean {
  return (
    Constants.executionEnvironment === ExecutionEnvironment.Standalone ||
    Constants.executionEnvironment === ExecutionEnvironment.Bare
  );
}

/**
 * Redirect URI sent to Google during OAuth.
 * Desktop OAuth clients require stocktake:// — only available in dev/standalone builds.
 * Expo Go uses exp:// which Google rejects (Error 400 invalid_request).
 */
export function getGoogleOAuthRedirectUri(): string {
  if (hasNativeOAuthRedirect()) {
    return makeRedirectUri({
      scheme: 'stocktake',
      path: 'oauth',
      native: 'stocktake://oauth',
    });
  }

  return makeRedirectUri({ path: 'oauth' });
}

export function getGoogleOAuthSetupError(): string | null {
  if (!isExpoGo()) return null;

  return (
    'Google sign-in requires a development build (not Expo Go). ' +
    'From stock-take-app run: npx expo run:ios — then sign in again.'
  );
}
