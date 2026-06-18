import Constants from 'expo-constants';

type Extra = {
  groqApiKey?: string;
  openaiApiKey?: string;
  togetherApiKey?: string;
  googleSheetsApiKey?: string;
  googleSheetsSpreadsheetId?: string;
  googleSheetsSheetName?: string;
  microsoftGraphClientId?: string;
  confidenceThreshold?: number;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const env = {
  groqApiKey: extra.groqApiKey ?? '',
  openaiApiKey: extra.openaiApiKey ?? '',
  togetherApiKey: extra.togetherApiKey ?? '',
  googleSheetsApiKey: extra.googleSheetsApiKey ?? '',
  googleSheetsSpreadsheetId: extra.googleSheetsSpreadsheetId ?? '',
  googleSheetsSheetName: extra.googleSheetsSheetName ?? 'Inventory',
  microsoftGraphClientId: extra.microsoftGraphClientId ?? '',
  confidenceThreshold: extra.confidenceThreshold ?? 80,
};

export function hasGroqKey(): boolean {
  return env.groqApiKey.length > 0;
}

export function hasOpenAiKey(): boolean {
  return env.openaiApiKey.length > 0;
}

export function hasTogetherKey(): boolean {
  return env.togetherApiKey.length > 0;
}

export function hasGoogleSheetsConfig(): boolean {
  return env.googleSheetsApiKey.length > 0 && env.googleSheetsSpreadsheetId.length > 0;
}
