import { Screen } from '@/components/ui/Screen';
import { PlaceholderCard } from '@/components/ui/PlaceholderCard';

export default function AliasManagerScreen() {
  return (
    <Screen title="Aliases" scroll>
      <PlaceholderCard
        title="Synonym manager"
        description="Add editable aliases to fix recurring mishears (e.g. 'Bel' → Belvedere)."
      />
    </Screen>
  );
}
