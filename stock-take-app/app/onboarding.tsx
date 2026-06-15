import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FormField } from '@/components/forms/FormField';
import { OptionChipGroup } from '@/components/forms/OptionChip';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { colors, spacing, typography } from '@/config/theme';
import {
  HOSPITALITY_PROFILE,
  RETAIL_PROFILE,
} from '@/config/vertical';
import { saveSettings } from '@/config/settings';
import { getRepositories } from '@/services/db';
import { SAMPLE_RETAIL_CATALOG } from '@/services/db/seed/retail';
import { seedCatalogForVertical } from '@/services/db/seed';
import type { BusinessType, RetailSubType } from '@/types';

const RETAIL_SUBTYPES: Array<{ value: RetailSubType; label: string }> = [
  { value: 'apparel', label: 'Apparel' },
  { value: 'footwear', label: 'Footwear' },
  { value: 'general', label: 'General' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [businessType, setBusinessType] = useState<BusinessType>('hospitality');
  const [retailSubType, setRetailSubType] = useState<RetailSubType>('apparel');
  const [storeName, setStoreName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const profile = businessType === 'retail' ? RETAIL_PROFILE : HOSPITALITY_PROFILE;

  const handleContinue = async () => {
    setSaving(true);
    setError(null);
    try {
      const settings = await saveSettings({
        onboardingComplete: true,
        businessType,
        retailSubType,
        storeName: storeName.trim(),
        defaultLocation: profile.defaultLocation,
        defaultBaseUnit: profile.defaultUnit,
      });

      const repos = await getRepositories();
      await seedCatalogForVertical(repos, settings);

      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title="Welcome to Stock Take"
      subtitle="Choose your business type to set up catalog, locations, and voice counting"
    >
      {error ? <StatusMessage message={error} variant="error" live /> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Business type</Text>
        <View style={styles.typeRow}>
          {([HOSPITALITY_PROFILE, RETAIL_PROFILE] as const).map((option) => {
            const selected = businessType === option.businessType;
            return (
              <Pressable
                key={option.businessType}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setBusinessType(option.businessType)}
                style={[styles.typeCard, selected && styles.typeCardSelected]}
              >
                <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>
                  {option.label}
                </Text>
                <Text style={styles.typeHint}>
                  {option.businessType === 'hospitality'
                    ? 'Bars, restaurants, hotels — bottles, batches, recipes'
                    : 'Clothing, shoes, merch — SKUs, sizes, colors'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {businessType === 'retail' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Retail focus</Text>
          <OptionChipGroup
            label="What do you sell?"
            options={RETAIL_SUBTYPES.map((s) => ({ value: s.value, label: s.label }))}
            value={retailSubType}
            onChange={(value) => setRetailSubType(value as RetailSubType)}
          />
        </View>
      ) : null}

      <View style={styles.card}>
        <FormField
          label={businessType === 'retail' ? 'Store name (optional)' : 'Venue name (optional)'}
          value={storeName}
          onChangeText={setStoreName}
          placeholder={businessType === 'retail' ? 'Main Street Store' : 'Hotel Bar'}
        />
        <Text style={styles.hint}>
          {businessType === 'retail'
            ? `We'll seed ${SAMPLE_RETAIL_CATALOG.length} sample SKUs with sizes and colors. Locations: sales floor, stockroom, fitting room.`
            : `We'll seed 100 common spirits plus a demo batch cocktail. Locations: bar, cellar, kitchen.`}
        </Text>
      </View>

      <Button
        label={saving ? 'Setting up…' : 'Continue'}
        onPress={handleContinue}
        disabled={saving}
      />
    </Screen>
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
  cardTitle: {
    ...typography.heading,
    color: colors.text,
  },
  typeRow: {
    gap: spacing.sm,
  },
  typeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
  },
  typeCardSelected: {
    borderColor: colors.accent,
    backgroundColor: '#1F6FEB22',
  },
  typeLabel: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '700',
  },
  typeLabelSelected: {
    color: colors.text,
  },
  typeHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
