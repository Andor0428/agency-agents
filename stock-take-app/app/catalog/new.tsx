import { Screen } from '@/components/ui/Screen';
import { PlaceholderCard } from '@/components/ui/PlaceholderCard';

export default function NewItemScreen() {
  return (
    <Screen title="New Item" scroll>
      <PlaceholderCard
        title="Add item"
        description="Manual entry and voice-add ('new item, Hendrick's gin, 700ml, bottle') coming in milestone 3."
      />
    </Screen>
  );
}
