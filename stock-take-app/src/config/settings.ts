import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

const SETTINGS_KEY = '@stocktake/settings';

export const RUNTIME_DEFAULT_SETTINGS: AppSettings = {
  ...DEFAULT_SETTINGS,
  useMockServices: true,
  spreadsheetProvider: 'none',
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...RUNTIME_DEFAULT_SETTINGS };
    return { ...RUNTIME_DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...RUNTIME_DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await loadSettings();
  const merged = { ...current, ...settings };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

export async function shouldUseMockServices(): Promise<boolean> {
  const settings = await loadSettings();
  return settings.useMockServices;
}
