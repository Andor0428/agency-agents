import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { PlaceholderCard } from '@/components/ui/PlaceholderCard';

export default function SessionsScreen() {
  return (
    <Screen title="Sessions" subtitle="Open, close, and review count sessions">
      <PlaceholderCard
        title="No active session"
        description="Start a new count session to begin voice counting. Session persistence lands in milestone 2."
      />
      <Button label="Start New Session" onPress={() => {}} />
    </Screen>
  );
}
