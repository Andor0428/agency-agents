import { useEffect, useState } from 'react';
import { ColorValue, Platform } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LoadingState } from '@/components/ui/LoadingState';
import { SupportSessionBanner } from '@/components/support/SupportSessionBanner';
import { colors, typography } from '@/config/theme';
import { loadSettings } from '@/config/settings';
import { getVerticalProfile } from '@/config/vertical';
import type { AppSettings } from '@/types';

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(focused: IoniconName, unfocused: IoniconName) {
  return ({ color, focused: isFocused }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={isFocused ? focused : unfocused} size={22} color={color as string} />
  );
}

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
          headerStyle: {
            backgroundColor: colors.background,
            shadowColor: 'transparent',
            elevation: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: colors.text,
          headerTitleStyle: { ...typography.heading },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 86 : 66,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textFaint,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Count', tabBarIcon: tabIcon('mic', 'mic-outline') }}
        />
        <Tabs.Screen
          name="catalog"
          options={{ title: 'Catalog', tabBarIcon: tabIcon('cube', 'cube-outline') }}
        />
        <Tabs.Screen
          name="recipes"
          options={{
            title: 'Recipes',
            tabBarIcon: tabIcon('flask', 'flask-outline'),
            href: profile.features.recipes ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="sessions"
          options={{ title: 'Sessions', tabBarIcon: tabIcon('time', 'time-outline') }}
        />
        <Tabs.Screen
          name="more"
          options={{ title: 'More', tabBarIcon: tabIcon('ellipsis-horizontal-circle', 'ellipsis-horizontal-circle-outline') }}
        />
      </Tabs>
    </>
  );
}
