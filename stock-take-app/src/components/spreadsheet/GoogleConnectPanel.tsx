import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/forms/FormField';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { colors, spacing, typography } from '@/config/theme';
import { saveSettings } from '@/config/settings';
import {
  connectGoogleAccount,
  hasGoogleOAuthConfig,
  parseSpreadsheetId,
} from '@/services/spreadsheetSync/googleAuth';
import {
  disconnectGoogleEverywhere,
  getGoogleConnectionStatus,
  syncGoogleConnectionToApi,
} from '@/services/spreadsheetSync/googleSync';

type Props = {
  onChanged: () => void;
};

export function GoogleConnectPanel({ onChanged }: Props) {
  const [spreadsheetInput, setSpreadsheetInput] = useState('');
  const [sheetName, setSheetName] = useState('Inventory');
  const [status, setStatus] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [source, setSource] = useState<string>('none');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const info = await getGoogleConnectionStatus();
    setConnected(info.connected && info.source !== 'env');
    setSource(info.source);
    if (info.spreadsheetId) setSpreadsheetInput(info.spreadsheetId);
    if (info.sheetName) setSheetName(info.sheetName);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const spreadsheetId = parseSpreadsheetId(spreadsheetInput);
      if (!spreadsheetId) {
        setStatus('Enter a spreadsheet ID or Google Sheets URL');
        return;
      }

      const tokens = await connectGoogleAccount();
      await saveSettings({
        googleConnected: true,
        googleSpreadsheetId: spreadsheetId,
        googleSheetName: sheetName.trim() || 'Inventory',
        spreadsheetProvider: 'google',
      });

      await syncGoogleConnectionToApi({
        refreshToken: tokens.refreshToken,
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
        spreadsheetId,
        sheetName: sheetName.trim() || 'Inventory',
      });

      setStatus('Google Sheet connected');
      await refresh();
      onChanged();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await disconnectGoogleEverywhere();
      await saveSettings({
        googleConnected: false,
        googleSpreadsheetId: '',
      });
      setStatus('Disconnected');
      await refresh();
      onChanged();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Disconnect failed');
    } finally {
      setBusy(false);
    }
  };

  if (!hasGoogleOAuthConfig()) {
    return (
      <StatusMessage
        message="Add GOOGLE_OAUTH_WEB_CLIENT_ID to .env for per-customer Google Sheets. Legacy API key in .env still works for dev."
        variant="warning"
      />
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Connect Google Sheet</Text>
      <Text style={styles.hint}>
        Sign in with Google to sync to your own spreadsheet — no shared API key required.
        {connected ? ` Connected (${source}).` : ''}
      </Text>

      {status ? <StatusMessage message={status} variant={connected ? 'success' : 'info'} /> : null}

      {!connected ? (
        <>
          <FormField
            label="Spreadsheet ID or URL"
            hint="From the sheet URL: docs.google.com/spreadsheets/d/THIS_PART/edit"
            value={spreadsheetInput}
            onChangeText={setSpreadsheetInput}
            autoCapitalize="none"
          />
          <FormField
            label="Sheet tab name"
            value={sheetName}
            onChangeText={setSheetName}
          />
          <Button
            label={busy ? 'Connecting…' : 'Sign in with Google'}
            onPress={connect}
            disabled={busy}
          />
        </>
      ) : (
        <Button
          label="Disconnect Google Sheet"
          onPress={disconnect}
          variant="secondary"
          disabled={busy}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
