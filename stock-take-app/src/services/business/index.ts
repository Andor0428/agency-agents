import type { CountEvent, Item } from '@/types';

export function formatEventLabel(event: CountEvent, item?: Item): string {
  if (item?.is_batch && event.fill_level != null) {
    const pct = Math.round(event.fill_level * 100);
    const vol = event.qty;
    return `${pct}% (${vol}${item.base_unit})`;
  }
  return String(event.qty);
}

export function formatAuditTrail(events: CountEvent[], item?: Item): string {
  if (events.length === 0) return 'No counts yet';
  const parts = events.map((e) => formatEventLabel(e, item));
  const total = events.reduce((sum, e) => sum + e.qty, 0);
  const totalLabel = item?.is_batch
    ? `${total}${item.base_unit}`
    : String(total);
  return `${parts.join(' + ')} = ${totalLabel}`;
}

export function computeSessionTotal(events: CountEvent[]): number {
  return events.reduce((sum, event) => sum + event.qty, 0);
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
  const snapped = Math.round(value / granularity) * granularity;
  return Math.max(0, Math.min(1, Number(snapped.toFixed(4))));
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
      const nestedFill =
        component.qty <= 1
          ? component.qty
          : scaledQty / (component.nestedRecipe.containerSize || 1);
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

export function mergeBomComponents(components: BomComponent[]): BomComponent[] {
  const merged = new Map<string, BomComponent>();
  for (const component of components) {
    const existing = merged.get(component.itemId);
    if (existing) {
      existing.qty += component.qty;
    } else {
      merged.set(component.itemId, { ...component });
    }
  }
  return Array.from(merged.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));
}
