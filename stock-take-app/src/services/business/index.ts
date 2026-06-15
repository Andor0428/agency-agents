import type { CountEvent } from '@/types';

export function computeSessionTotal(events: CountEvent[]): number {
  return events.reduce((sum, event) => sum + event.qty, 0);
}

export function formatAuditTrail(events: CountEvent[]): string {
  if (events.length === 0) return 'No counts yet';
  return events.map((e) => String(e.qty)).join(' + ') + ` = ${computeSessionTotal(events)}`;
}

export function fillLevelToVolume(
  fillLevel: number,
  containerSize: number | null
): number {
  if (containerSize == null) return fillLevel;
  return fillLevel * containerSize;
}

export function snapFillLevel(value: number, granularity: number): number {
  if (granularity <= 0) return value;
  return Math.round(value / granularity) * granularity;
}

export interface BomComponent {
  itemId: string;
  itemName: string;
  qty: number;
  unit: string;
}

export interface BomExplosionInput {
  batchItemId: string;
  batchItemName: string;
  fillLevel: number;
  containerSize: number;
  yieldPct: number;
  components: Array<{
    componentItemId: string;
    componentItemName: string;
    qty: number;
    unit: string;
    isBatch: boolean;
    nestedRecipe?: BomExplosionInput;
  }>;
}

export function explodeBatchRecipe(input: BomExplosionInput): BomComponent[] {
  const batchVolume = fillLevelToVolume(input.fillLevel, input.containerSize);
  const yieldFactor = input.yieldPct / 100;
  const results: BomComponent[] = [];

  for (const component of input.components) {
    const scaledQty = (batchVolume * component.qty) / input.containerSize / yieldFactor;

    if (component.isBatch && component.nestedRecipe) {
      const nestedFill = component.qty <= 1 ? component.qty : scaledQty / (component.nestedRecipe.containerSize || 1);
      const nested = explodeBatchRecipe({
        ...component.nestedRecipe,
        fillLevel: nestedFill,
      });
      results.push(...nested);
    } else {
      results.push({
        itemId: component.componentItemId,
        itemName: component.componentItemName,
        qty: scaledQty,
        unit: component.unit,
      });
    }
  }

  return results;
}
