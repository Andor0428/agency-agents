import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { LoadingState } from '@/components/ui/LoadingState';
import { SupportSessionBanner } from '@/components/support/SupportSessionBanner';
import { colors } from '@/config/theme';
import { loadSettings } from '@/config/settings';
import { getVerticalProfile } from '@/config/vertical';
import type { AppSettings } from '@/types';

export default function TabLayout() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  if (!settings) {
    return <LoadingState label="Loading" />;
  }

  if (!settings.onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  const profile = getVerticalProfile(settings);

  return (
    <>
      <SupportSessionBanner />
      <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Count', tabBarLabel: 'Count' }} />
      <Tabs.Screen name="catalog" options={{ title: 'Catalog', tabBarLabel: 'Catalog' }} />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarLabel: 'Recipes',
          href: profile.features.recipes ? undefined : null,
        }}
      />
      <Tabs.Screen name="sessions" options={{ title: 'Sessions', tabBarLabel: 'Sessions' }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarLabel: 'More' }} />
    </Tabs>
    </>
  );
}
