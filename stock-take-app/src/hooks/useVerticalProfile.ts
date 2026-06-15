import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { loadSettings } from '@/config/settings';
import { getVerticalProfile, type VerticalProfile } from '@/config/vertical';
import type { AppSettings } from '@/types';

export function useVerticalProfile(): {
  settings: AppSettings | null;
  profile: VerticalProfile;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await loadSettings();
      setSettings(loaded);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const profile = getVerticalProfile(settings ?? { businessType: 'hospitality' });

  return { settings, profile, loading, refresh };
}
