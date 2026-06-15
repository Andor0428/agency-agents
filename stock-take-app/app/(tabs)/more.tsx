import { Link } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { PlaceholderCard } from '@/components/ui/PlaceholderCard';

export default function MoreScreen() {
  return (
    <Screen title="More" subtitle="Import, sync, and settings">
      <PlaceholderCard
        title="Import & spreadsheet sync"
        description="Bootstrap catalog from CSV/Excel and sync totals to Google Sheets or Microsoft Excel."
      />
      <Link href="/import-sync" asChild>
        <Button label="Import & Sync" onPress={() => {}} variant="secondary" />
      </Link>
      <Link href="/settings" asChild>
        <Button label="Settings" onPress={() => {}} variant="secondary" />
      </Link>
    </Screen>
  );
}
