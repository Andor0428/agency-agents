import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { colors, spacing, typography } from '@/config/theme';
import { fetchPendingChangeRequests, getActiveSupportSession, isSupportConfigured } from '@/services/support/client';

export function SupportSessionBanner() {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const refresh = useCallback(async () => {
    if (!isSupportConfigured()) {
      setActive(false);
      return;
    }
    try {
      const session = await getActiveSupportSession();
      setActive(Boolean(session));
      setStatus(session?.status ?? null);
      if (session) {
        const pending = await fetchPendingChangeRequests();
        setPendingApprovals(pending.length);
      } else {
        setPendingApprovals(0);
      }
    } catch {
      setActive(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (!active) return null;

  return (
    <Pressable
      style={styles.banner}
      onPress={() => router.push('/support')}
      accessibilityRole="button"
      accessibilityLabel="Support is viewing your data. Open support settings."
    >
      <Text style={styles.title}>Support session active</Text>
      <Text style={styles.subtitle}>
        Technical support can view your inventory data ({status}).
        {pendingApprovals > 0
          ? ` ${pendingApprovals} adjustment(s) need your approval.`
          : ' Tap to manage or revoke.'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#D2992233',
    borderBottomWidth: 1,
    borderBottomColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  title: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subtitle: {
    ...typography.caption,
    color: colors.text,
  },
});
