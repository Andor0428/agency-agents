import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { SupportApprovals } from '@/components/support/SupportApprovals';
import { colors, spacing, typography } from '@/config/theme';
import { supportApi } from '@/config/supportApi';
import {
  createSupportSession,
  getActiveSupportSession,
  getStoredSupportCode,
  isSupportConfigured,
  revokeSupportSession,
  uploadSupportSnapshot,
} from '@/services/support/client';

export default function SupportScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const active = await getActiveSupportSession();
      if (active) {
        setSessionId(active.id);
        setExpiresAt(active.expiresAt);
        setStatus(active.status);
        if (active.status === 'pending') {
          const storedCode = await getStoredSupportCode(active.id);
          setCode(storedCode);
        } else {
          setCode(null);
        }
      } else {
        setSessionId(null);
        setCode(null);
        setExpiresAt(null);
        setStatus(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support session');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const startSession = async () => {
    setBusy(true);
    setError(null);
    try {
      const session = await createSupportSession();
      setSessionId(session.sessionId);
      setCode(session.code);
      setExpiresAt(session.expiresAt);
      setStatus('pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start support session');
    } finally {
      setBusy(false);
    }
  };

  const refreshSnapshot = async () => {
    if (!sessionId) return;
    setBusy(true);
    setError(null);
    try {
      await uploadSupportSnapshot(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Snapshot upload failed');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!sessionId) return;
    setBusy(true);
    setError(null);
    try {
      await revokeSupportSession(sessionId);
      setSessionId(null);
      setCode(null);
      setExpiresAt(null);
      setStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not end session');
    } finally {
      setBusy(false);
    }
  };

  if (!isSupportConfigured()) {
    return (
      <Screen title="Get support" subtitle="Share a code with technical support">
        <StatusMessage
          message={`Set SUPPORT_API_URL in .env (currently: ${supportApi.baseUrl || 'not set'}) and restart Expo.`}
          variant="warning"
          live
        />
        <Button label="Back to settings" onPress={() => router.back()} variant="secondary" />
      </Screen>
    );
  }

  if (loading) {
    return <LoadingState label="Loading support session" />;
  }

  const expiresLabel = expiresAt ? new Date(expiresAt).toLocaleString() : '—';

  return (
    <Screen
      title="Get support"
      subtitle="Generate a code so support can view your counts. They cannot edit without your approval."
    >
      {error ? <StatusMessage message={error} variant="error" live /> : null}

      {(sessionId && status) || code ? (
        <View style={styles.banner} accessibilityRole="alert">
          <Text style={styles.bannerTitle}>Support access active</Text>
          <Text style={styles.bannerText}>
            Status: {status ?? 'pending'} · expires {expiresLabel}
          </Text>
        </View>
      ) : null}

      {code ? (
        <View style={styles.codeCard} accessibilityLabel={`Support code ${code.split('').join(' ')}`}>
          <Text style={styles.codeLabel}>Share this code with support</Text>
          <Text style={styles.codeValue}>{code}</Text>
          <Text style={styles.codeHint}>Valid for 30 minutes · read-only access</Text>
        </View>
      ) : sessionId ? (
        <StatusMessage
          message="Support connected. Your code was already redeemed — support can refresh the dashboard to see updated data."
          variant="info"
        />
      ) : (
        <Text style={styles.hint}>
          Support will see sessions, totals, count events, and catalog info. Any quantity changes
          require your explicit approval below.
        </Text>
      )}

      {!sessionId ? (
        <Button label="Generate support code" onPress={startSession} disabled={busy} />
      ) : (
        <View style={styles.actions}>
          <Button
            label={busy ? 'Working…' : 'Refresh data for support'}
            onPress={refreshSnapshot}
            disabled={busy}
          />
          <Button label="End support access" onPress={revoke} variant="secondary" disabled={busy} />
        </View>
      )}

      {sessionId ? <SupportApprovals /> : null}

      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.link}>Back to settings</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#D2992233',
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.xs,
  },
  bannerTitle: {
    ...typography.heading,
    color: colors.warning,
  },
  bannerText: {
    ...typography.body,
    color: colors.text,
  },
  codeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  codeLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeValue: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 8,
  },
  codeHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  hint: {
    ...typography.body,
    color: colors.textMuted,
  },
  actions: {
    gap: spacing.sm,
  },
  link: {
    ...typography.body,
    color: colors.accent,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
