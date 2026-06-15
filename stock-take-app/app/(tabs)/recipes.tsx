import { Screen } from '@/components/ui/Screen';
import { PlaceholderCard } from '@/components/ui/PlaceholderCard';

export default function RecipesScreen() {
  return (
    <Screen title="Recipes" subtitle="Batch recipes with nested components and versioning">
      <PlaceholderCard
        title="Recipe editor"
        description="Build batch recipes, set yield %, duplicate templates, and view version history. Implemented in milestone 3."
      />
    </Screen>
  );
}
