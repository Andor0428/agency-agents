import { Screen } from '@/components/ui/Screen';
import { PlaceholderCard } from '@/components/ui/PlaceholderCard';

export default function ImportSyncScreen() {
  return (
    <Screen title="Import & Sync" subtitle="CSV/Excel import and spreadsheet sync">
      <PlaceholderCard
        title="Offline-first sync"
        description="Import catalog from CSV/Excel, choose Google Sheets or Excel target, and monitor the offline sync queue."
      />
    </Screen>
  );
}
