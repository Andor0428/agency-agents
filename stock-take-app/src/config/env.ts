import Constants from 'expo-constants';

type Extra = {
  groqApiKey?: string;
  openaiApiKey?: string;
  googleSheetsApiKey?: string;
  googleSheetsSpreadsheetId?: string;
  microsoftGraphClientId?: string;
  confidenceThreshold?: number;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const env = {
  groqApiKey: extra.groqApiKey ?? '',
  openaiApiKey: extra.openaiApiKey ?? '',
  googleSheetsApiKey: extra.googleSheetsApiKey ?? '',
  googleSheetsSpreadsheetId: extra.googleSheetsSpreadsheetId ?? '',
  microsoftGraphClientId: extra.microsoftGraphClientId ?? '',
  confidenceThreshold: extra.confidenceThreshold ?? 80,
};

export function hasGroqKey(): boolean {
  return env.groqApiKey.length > 0;
}

export function hasOpenAiKey(): boolean {
  return env.openaiApiKey.length > 0;
}

export function hasGoogleSheetsConfig(): boolean {
  return env.googleSheetsApiKey.length > 0 && env.googleSheetsSpreadsheetId.length > 0;
}
