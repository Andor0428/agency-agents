import { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { colors, spacing, typography } from '@/config/theme';
import { initializeDatabase } from '@/services/db';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const boot = useCallback(() => {
    setInitError(null);
    setReady(false);
    initializeDatabase()
      .then((result) => {
        if (result.seededCount > 0) {
          console.info(`Seeded ${result.seededCount} spirits into catalog`);
        }
        setReady(true);
      })
      .catch((error) => {
        console.error('Database init failed', error);
        setInitError(error instanceof Error ? error.message : 'Database initialization failed');
        setReady(true);
      });
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  if (!ready) {
    return <LoadingState label="Starting Stock Take" />;
  }

  if (initError) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle} accessibilityRole="header">
          Could not start app
        </Text>
        <StatusMessage message={initError} variant="error" live />
        <Text style={styles.errorHint}>
          The local database could not be opened. Try restarting the app or clearing app data.
        </Text>
        <Button label="Retry" onPress={boot} />
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
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="catalog/[id]" options={{ title: 'Edit Item' }} />
      <Stack.Screen name="catalog/new" options={{ title: 'New Item' }} />
      <Stack.Screen name="catalog/bulk-variants" options={{ title: 'Bulk Variants' }} />
      <Stack.Screen name="scan" options={{ title: 'Scan Barcode' }} />
      <Stack.Screen name="recipes/[id]" options={{ title: 'Recipe Editor' }} />
      <Stack.Screen name="aliases/[itemId]" options={{ title: 'Aliases' }} />
      <Stack.Screen name="import-sync" options={{ title: 'Import & Sync' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="support" options={{ title: 'Get Support' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  errorTitle: {
    ...typography.title,
    color: colors.text,
  },
  errorHint: {
    ...typography.body,
    color: colors.textMuted,
  },
});
