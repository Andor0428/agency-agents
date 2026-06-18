import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

const SETTINGS_KEY = '@stocktake/settings';

export const RUNTIME_DEFAULT_SETTINGS: AppSettings = {
  ...DEFAULT_SETTINGS,
  useMockServices: true,
  spreadsheetProvider: 'none',
  onboardingComplete: false,
  supportAlertEmail: '',
};

let settingsCache: AppSettings | null = null;

function mergeSettings(stored: Partial<AppSettings> | null | undefined): AppSettings {
  return { ...RUNTIME_DEFAULT_SETTINGS, ...stored };
}

export async function loadSettings(): Promise<AppSettings> {
  if (settingsCache) {
    return { ...settingsCache };
  }

  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    settingsCache = raw ? mergeSettings(JSON.parse(raw)) : { ...RUNTIME_DEFAULT_SETTINGS };
  } catch {
    settingsCache = { ...RUNTIME_DEFAULT_SETTINGS };
  }

  return { ...settingsCache };
}

export async function saveSettings(
  patch: Partial<AppSettings>,
  base?: AppSettings
): Promise<AppSettings> {
  const current = base ?? settingsCache ?? (await loadSettings());
  const merged = { ...current, ...patch };
  settingsCache = merged;
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return { ...merged };
}

/** Test-only: reset in-memory cache between tests. */
export function resetSettingsCacheForTests(): void {
  settingsCache = null;
}

export async function shouldUseMockServices(): Promise<boolean> {
  const settings = await loadSettings();
  return settings.useMockServices;
}
