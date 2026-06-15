import { Screen } from '@/components/ui/Screen';
import { PlaceholderCard } from '@/components/ui/PlaceholderCard';

export default function EditItemScreen() {
  return (
    <Screen title="Edit Item" scroll>
      <PlaceholderCard
        title="Item editor"
        description="Edit name, units, container size, par level, fill granularity, and active status."
      />
    </Screen>
  );
}
