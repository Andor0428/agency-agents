import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { colors, radii, spacing, typography } from '@/config/theme';
import { loadSettings } from '@/config/settings';
import { getRepositories } from '@/services/db';
import { isOnline } from '@/services/spreadsheetSync';

type StatRow = { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tint: string };

export default function MoreScreen() {
  const [businessType, setBusinessType] = useState<'hospitality' | 'retail'>('hospitality');
  const [mockMode, setMockMode] = useState(true);
  const [provider, setProvider] = useState('none');
  const [pendingSync, setPendingSync] = useState(0);
  const [online, setOnline] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const settings = await loadSettings();
    setBusinessType(settings.businessType);
    setMockMode(settings.useMockServices);
    setProvider(settings.spreadsheetProvider);
    setOnline(await isOnline());

    const repos = await getRepositories();
    const counts = await repos.syncQueue.getStatusCounts();
    setPendingSync(counts.pending ?? 0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const providerLabel =
    provider === 'google' ? 'Google Sheets' : provider === 'microsoft' ? 'Excel' : 'Off';

  const stats: StatRow[] = [
    {
      icon: businessType === 'retail' ? 'pricetags' : 'wine',
      label: 'Mode',
      value: businessType === 'retail' ? 'Retail' : 'Hospitality',
      tint: colors.accent,
    },
    {
      icon: mockMode ? 'flask' : 'mic',
      label: 'Voice',
      value: mockMode ? 'Mock mode' : 'Live APIs',
      tint: mockMode ? colors.warning : colors.success,
    },
    {
      icon: 'grid',
      label: 'Spreadsheet',
      value: providerLabel,
      tint: provider === 'none' ? colors.textMuted : colors.success,
    },
    {
      icon: online ? 'cloud-done' : 'cloud-offline',
      label: 'Sync',
      value: `${pendingSync} pending · ${online === null ? '…' : online ? 'Online' : 'Offline'}`,
      tint: online ? colors.success : colors.textMuted,
    },
  ];

  const links: Array<{
    href: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
  }> = [
    {
      href: '/import-sync',
      icon: 'sync',
      title: 'Import & Sync',
      subtitle: 'Spreadsheet sync, CSV import, offline queue',
    },
    {
      href: '/settings',
      icon: 'settings',
      title: 'Settings',
      subtitle: 'API keys, defaults, voice pipeline mode',
    },
    {
      href: '/support',
      icon: 'help-buoy',
      title: 'Get support',
      subtitle: 'Connect with a supervisor for help',
    },
  ];

  return (
    <Screen eyebrow="Overview" title="More" subtitle="Status, import, sync, and settings">
      <Card>
        <Text style={styles.cardLabel}>Quick status</Text>
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCell}>
              <View style={[styles.statIcon, { backgroundColor: `${s.tint}22` }]}>
                <Ionicons name={s.icon} size={18} color={s.tint} />
              </View>
              <View style={styles.statText}>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue} numberOfLines={1}>
                  {s.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.linkList}>
        {links.map((link) => (
          <Link key={link.href} href={link.href as never} asChild>
            <Pressable style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]}>
              <View style={styles.linkIcon}>
                <Ionicons name={link.icon} size={20} color={colors.accent} />
              </View>
              <View style={styles.linkText}>
                <Text style={styles.linkTitle}>{link.title}</Text>
                <Text style={styles.linkSubtitle}>{link.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
            </Pressable>
          </Link>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardLabel: {
    ...typography.overline,
    color: colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  statCell: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    flex: 1,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textFaint,
  },
  statValue: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  linkList: {
    gap: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  linkPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    flex: 1,
    gap: 2,
  },
  linkTitle: {
    ...typography.subheading,
    color: colors.text,
  },
  linkSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
