import { Screen } from '@/components/ui/Screen';
import { PlaceholderCard } from '@/components/ui/PlaceholderCard';

export default function RecipeEditorScreen() {
  return (
    <Screen title="Recipe Editor" scroll>
      <PlaceholderCard
        title="Recipe components"
        description="Add components, set quantities, configure yield %, and manage version history."
      />
    </Screen>
  );
}
