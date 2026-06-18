import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/forms/FormField';
import { OptionChipGroup } from '@/components/forms/OptionChip';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { colors, radii, spacing, typography } from '@/config/theme';
import { loadSettings, saveSettings } from '@/config/settings';
import {
  connectGoogleAccount,
  getValidGoogleAccessToken,
  hasGoogleOAuthConfig,
  isGoogleSignedIn,
  parseSpreadsheetId,
} from '@/services/spreadsheetSync/googleAuth';
import {
  createInventorySpreadsheet,
  DEFAULT_INVENTORY_HEADERS,
  DEFAULT_INVENTORY_TAB,
  listSpreadsheetTabs,
  listUserSpreadsheets,
  pickDefaultTabName,
  type GoogleSpreadsheetSummary,
} from '@/services/spreadsheetSync/googlePicker';
import {
  disconnectGoogleEverywhere,
  getGoogleConnectionStatus,
  syncGoogleConnectionToApi,
} from '@/services/spreadsheetSync/googleSync';
import { loadGoogleTokens } from '@/services/spreadsheetSync/googleCredentials';

type Props = {
  onChanged: () => void;
};

type Step = 'sign_in' | 'setup' | 'pick_spreadsheet' | 'pick_tab';

export function GoogleConnectPanel({ onChanged }: Props) {
  const [step, setStep] = useState<Step>('sign_in');
  const [sheetName, setSheetName] = useState(DEFAULT_INVENTORY_TAB);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [source, setSource] = useState<string>('none');
  const [busy, setBusy] = useState(false);
  const [spreadsheets, setSpreadsheets] = useState<GoogleSpreadsheetSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<GoogleSpreadsheetSummary | null>(
    null
  );
  const [tabs, setTabs] = useState<string[]>([]);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualSpreadsheetInput, setManualSpreadsheetInput] = useState('');

  const headerPreview = useMemo(() => DEFAULT_INVENTORY_HEADERS.join(', '), []);

  const filteredSpreadsheets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return spreadsheets;
    return spreadsheets.filter((sheet) => sheet.name.toLowerCase().includes(query));
  }, [searchQuery, spreadsheets]);

  const loadDefaultSpreadsheetTitle = useCallback(async () => {
    const settings = await loadSettings();
    const storeLabel = settings.storeName?.trim() || 'Stock Take';
    setSpreadsheetTitle(`${storeLabel} Inventory`);
  }, []);

  const refresh = useCallback(async () => {
    const info = await getGoogleConnectionStatus();
    const isConnected = info.connected && info.source !== 'env';
    setConnected(isConnected);
    setSource(info.source);
    if (info.sheetName) setSheetName(info.sheetName);

    if (isConnected) {
      setStep('sign_in');
      return;
    }

    if (await isGoogleSignedIn()) {
      setStep('setup');
      await loadDefaultSpreadsheetTitle();
    } else {
      setStep('sign_in');
    }
  }, [loadDefaultSpreadsheetTitle]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadSpreadsheetList = useCallback(async () => {
    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      setStep('sign_in');
      throw new Error('Google sign-in expired. Sign in again.');
    }

    const all: GoogleSpreadsheetSummary[] = [];
    let pageToken: string | undefined;

    do {
      const page = await listUserSpreadsheets(accessToken, pageToken);
      all.push(...page.files);
      pageToken = page.nextPageToken;
    } while (pageToken && all.length < 200);

    setSpreadsheets(all);
    if (all.length === 0) {
      setStatus('No spreadsheets found in your Google Drive.');
    }
  }, []);

  useEffect(() => {
    if (step !== 'pick_spreadsheet' || connected) return;

    let cancelled = false;
    setBusy(true);
    setStatus(null);

    void loadSpreadsheetList()
      .catch((error) => {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : 'Could not load spreadsheets');
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [connected, loadSpreadsheetList, step]);

  const signIn = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await connectGoogleAccount();
      await loadDefaultSpreadsheetTitle();
      setStep('setup');
      setStatus('Signed in — create your inventory spreadsheet below');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const finalizeConnection = async (
    spreadsheet: GoogleSpreadsheetSummary,
    tab: string
  ) => {
    const tokens = await loadGoogleTokens();
    if (!tokens) {
      setStep('sign_in');
      throw new Error('Google sign-in expired. Sign in again.');
    }

    const sheetTab = tab.trim() || DEFAULT_INVENTORY_TAB;
    await saveSettings({
      googleConnected: true,
      googleSpreadsheetId: spreadsheet.id,
      googleSheetName: sheetTab,
      spreadsheetProvider: 'google',
    });

    await syncGoogleConnectionToApi({
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
      spreadsheetId: spreadsheet.id,
      sheetName: sheetTab,
    });

    setStatus(`Connected to ${spreadsheet.name}`);
    setSelectedSpreadsheet(null);
    setTabs([]);
    setSearchQuery('');
    setManualSpreadsheetInput('');
    setShowManualEntry(false);
    await refresh();
    onChanged();
  };

  const createSpreadsheet = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const accessToken = await getValidGoogleAccessToken();
      if (!accessToken) {
        setStep('sign_in');
        throw new Error('Google sign-in expired. Sign in again.');
      }

      const created = await createInventorySpreadsheet(
        accessToken,
        spreadsheetTitle,
        DEFAULT_INVENTORY_TAB
      );
      await finalizeConnection(
        { id: created.id, name: created.name },
        created.tabName
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not create spreadsheet');
    } finally {
      setBusy(false);
    }
  };

  const selectSpreadsheet = async (spreadsheet: GoogleSpreadsheetSummary) => {
    setBusy(true);
    setStatus(null);
    try {
      const accessToken = await getValidGoogleAccessToken();
      if (!accessToken) {
        setStep('sign_in');
        throw new Error('Google sign-in expired. Sign in again.');
      }

      const tabNames = await listSpreadsheetTabs(accessToken, spreadsheet.id);
      if (tabNames.length === 0) {
        throw new Error('That spreadsheet has no tabs');
      }

      setSelectedSpreadsheet(spreadsheet);
      setTabs(tabNames);
      setSheetName(pickDefaultTabName(tabNames));
      setStep('pick_tab');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not open spreadsheet');
    } finally {
      setBusy(false);
    }
  };

  const connectManualSpreadsheet = async () => {
    const spreadsheetId = parseSpreadsheetId(manualSpreadsheetInput);
    if (!spreadsheetId) {
      setStatus('Enter a spreadsheet ID or Google Sheets URL');
      return;
    }

    await selectSpreadsheet({ id: spreadsheetId, name: spreadsheetId });
  };

  const connectSelectedTab = async () => {
    if (!selectedSpreadsheet) return;

    setBusy(true);
    setStatus(null);
    try {
      await finalizeConnection(selectedSpreadsheet, sheetName);
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
      setSpreadsheets([]);
      setSelectedSpreadsheet(null);
      setTabs([]);
      setStep('sign_in');
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
        message="Add GOOGLE_OAUTH_CLIENT_ID to .env (Google Cloud → Desktop app client with stocktake:// redirect). Legacy API key still works for dev."
        variant="warning"
      />
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="logo-google" size={18} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Connect Google Sheet</Text>
          <Text style={styles.hint}>
            Sign in with Google, then set up a new inventory spreadsheet in a few steps.
            {connected ? ` Connected (${source}).` : ''}
          </Text>
        </View>
      </View>

      {status ? (
        <StatusMessage message={status} variant={connected ? 'success' : 'info'} />
      ) : null}

      {connected ? (
        <Button
          label="Disconnect Google Sheet"
          icon="log-out-outline"
          onPress={disconnect}
          variant="secondary"
          disabled={busy}
        />
      ) : null}

      {!connected && step === 'sign_in' ? (
        <Button
          label={busy ? 'Signing in…' : 'Sign in with Google'}
          icon="logo-google"
          loading={busy}
          onPress={signIn}
          disabled={busy}
        />
      ) : null}

      {!connected && step === 'setup' ? (
        <View style={styles.stepBody}>
          <Text style={styles.stepTitle}>Set up your inventory spreadsheet</Text>
          <Text style={styles.hint}>
            We&apos;ll create a Google Sheet with an {DEFAULT_INVENTORY_TAB} tab and column
            headers ready for catalog import and count sync.
          </Text>
          <FormField
            label="Spreadsheet name"
            hint="Shown in your Google Drive"
            value={spreadsheetTitle}
            onChangeText={setSpreadsheetTitle}
          />
          <View style={styles.headerBox}>
            <Text style={styles.headerBoxTitle}>Columns we&apos;ll create</Text>
            <Text style={styles.headerPreview}>{headerPreview}</Text>
          </View>
          <Button
            label={busy ? 'Creating…' : 'Create spreadsheet'}
            icon="add-circle-outline"
            loading={busy}
            onPress={() => void createSpreadsheet()}
            disabled={busy || !spreadsheetTitle.trim()}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setStep('pick_spreadsheet');
              setStatus(null);
            }}
            style={styles.linkRow}
          >
            <Text style={styles.linkText}>Connect an existing spreadsheet instead</Text>
          </Pressable>
        </View>
      ) : null}

      {!connected && step === 'pick_spreadsheet' ? (
        <View style={styles.stepBody}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setStep('setup');
              setStatus(null);
            }}
            style={styles.linkRow}
          >
            <Text style={styles.linkText}>← Create a new spreadsheet instead</Text>
          </Pressable>

          <FormField
            label="Search spreadsheets"
            hint="Pick from your Google Drive"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />

          {busy && spreadsheets.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.hint}>Loading your spreadsheets…</Text>
            </View>
          ) : (
            <FlatList
              data={filteredSpreadsheets}
              keyExtractor={(item) => item.id}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.hint}>
                  {spreadsheets.length === 0
                    ? 'No spreadsheets found.'
                    : 'No spreadsheets match your search.'}
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void selectSpreadsheet(item)}
                  disabled={busy}
                  style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
                >
                  <Ionicons name="document-text-outline" size={18} color={colors.accent} />
                  <Text style={styles.sheetRowText} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              )}
            />
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => setShowManualEntry((value) => !value)}
            style={styles.linkRow}
          >
            <Text style={styles.linkText}>
              {showManualEntry ? 'Hide paste URL option' : 'Paste spreadsheet URL instead'}
            </Text>
          </Pressable>

          {showManualEntry ? (
            <>
              <FormField
                label="Spreadsheet ID or URL"
                hint="Optional fallback if your sheet is not listed"
                value={manualSpreadsheetInput}
                onChangeText={setManualSpreadsheetInput}
                autoCapitalize="none"
              />
              <Button
                label="Use this spreadsheet"
                variant="secondary"
                onPress={() => void connectManualSpreadsheet()}
                disabled={busy}
              />
            </>
          ) : null}
        </View>
      ) : null}

      {!connected && step === 'pick_tab' && selectedSpreadsheet ? (
        <View style={styles.stepBody}>
          <Text style={styles.selectedSheet}>{selectedSpreadsheet.name}</Text>
          <OptionChipGroup
            label="Sheet tab"
            options={tabs.map((tab) => ({ value: tab, label: tab }))}
            value={sheetName}
            onChange={setSheetName}
          />
          <View style={styles.actionRow}>
            <Button
              label="Back"
              variant="ghost"
              onPress={() => {
                setStep('pick_spreadsheet');
                setSelectedSpreadsheet(null);
                setTabs([]);
              }}
              disabled={busy}
            />
            <Button
              label={busy ? 'Connecting…' : 'Connect this sheet'}
              onPress={() => void connectSelectedTab()}
              loading={busy}
              disabled={busy}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  stepTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  stepBody: {
    gap: spacing.sm,
  },
  headerBox: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  headerBoxTitle: {
    ...typography.subheading,
    fontSize: 13,
    color: colors.textMuted,
  },
  headerPreview: {
    ...typography.caption,
    color: colors.text,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  list: {
    maxHeight: 240,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetRowText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  linkRow: {
    alignSelf: 'flex-start',
  },
  linkText: {
    ...typography.caption,
    color: colors.accent,
  },
  selectedSheet: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
