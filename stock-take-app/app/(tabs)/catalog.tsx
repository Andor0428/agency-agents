import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { PlaceholderCard } from '@/components/ui/PlaceholderCard';
import { colors, typography } from '@/config/theme';

export default function CatalogScreen() {
  return (
    <Screen title="Catalog" subtitle="Manage items, units, and container sizes">
      <PlaceholderCard
        title="Catalog manager"
        description="Add, edit, search, and toggle active items. Voice-add and CSV import arrive in milestone 2–3."
      />
      <Link href="/catalog/new" asChild>
        <Button label="Add Item" onPress={() => {}} />
      </Link>
      <Text style={styles.hint}>Item list will populate from SQLite once repositories are wired.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
