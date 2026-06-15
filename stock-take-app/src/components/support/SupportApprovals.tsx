import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { colors, spacing, typography } from '@/config/theme';
import { getRepositories } from '@/services/db';
import { applySupportAdjustment } from '@/services/support/applyAdjustment';
import {
  fetchPendingChangeRequests,
  markChangeRequestApplied,
  resolveChangeRequest,
  type ChangeRequest,
} from '@/services/support/client';

export function SupportApprovals() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const pending = await fetchPendingChangeRequests();
      setRequests(pending);
    } catch {
      setRequests([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const interval = setInterval(refresh, 10000);
      return () => clearInterval(interval);
    }, [refresh])
  );

  const handleDecision = async (request: ChangeRequest, decision: 'approve' | 'deny') => {
    setBusyId(request.id);
    setError(null);
    setSuccess(null);
    try {
      const resolved = await resolveChangeRequest(request.id, decision);
      if (decision === 'approve') {
        const repos = await getRepositories();
        await applySupportAdjustment(repos, {
          countSessionId: request.countSessionId,
          itemId: request.itemId,
          itemName: request.itemName,
          currentQty: request.currentQty,
          proposedQty: request.proposedQty,
          changeRequestId: request.id,
        });
        await markChangeRequestApplied(request.id);
        setSuccess(
          `Approved: ${request.itemName} in ${request.countSessionName} → ${request.proposedQty}`
        );
      } else {
        setSuccess(`Denied adjustment for ${request.itemName}`);
      }
      void resolved;
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process request');
    } finally {
      setBusyId(null);
    }
  };

  if (requests.length === 0 && !error && !success) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Pending approval requests</Text>
      <Text style={styles.hint}>
        Support proposed these quantity changes. Approve to apply on this device, or deny to reject.
      </Text>
      {error ? <StatusMessage message={error} variant="error" live /> : null}
      {success ? <StatusMessage message={success} variant="success" live /> : null}
      {requests.map((request) => (
        <View key={request.id} style={styles.card}>
          <Text style={styles.itemName}>{request.itemName}</Text>
          <Text style={styles.meta}>
            {request.countSessionName}: {request.currentQty} → {request.proposedQty}
          </Text>
          {request.reason ? <Text style={styles.reason}>Reason: {request.reason}</Text> : null}
          <View style={styles.actions}>
            <Button
              label={busyId === request.id ? '…' : 'Approve'}
              onPress={() => handleDecision(request, 'approve')}
              disabled={busyId !== null}
            />
            <Button
              label="Deny"
              onPress={() => handleDecision(request, 'deny')}
              variant="secondary"
              disabled={busyId !== null}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  meta: {
    ...typography.body,
    color: colors.textMuted,
  },
  reason: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
