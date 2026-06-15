import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '@/config/theme';
import { getDatabase } from '@/services/db';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getDatabase()
      .then(() => setReady(true))
      .catch((error) => {
        console.error('Database init failed', error);
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="catalog/[id]" options={{ title: 'Edit Item' }} />
      <Stack.Screen name="catalog/new" options={{ title: 'New Item' }} />
      <Stack.Screen name="recipes/[id]" options={{ title: 'Recipe Editor' }} />
      <Stack.Screen name="aliases/[itemId]" options={{ title: 'Aliases' }} />
      <Stack.Screen name="import-sync" options={{ title: 'Import & Sync' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
