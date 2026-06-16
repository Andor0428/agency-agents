import { getSpellingCorrections, normalizeSpelling } from './spelling';
import type {
  FlaggedStockItem,
  MergedDuplicateEntry,
  ParsedStockItem,
  StockCleaningOptions,
  StockCleaningResult,
  StockCleaningSeverity,
} from './types';

export type {
  FlaggedStockItem,
  FlagReason,
  MergedDuplicateEntry,
  ParsedStockItem,
  StockCleaningOptions,
  StockCleaningResult,
  StockCleaningSeverity,
} from './types';

const KNOWN_UNITS = [
  'ml',
  'cl',
  'l',
  'oz',
  'g',
  'kg',
  'bottle',
  'bottles',
  'btl',
  'case',
  'cases',
  'pc',
  'pcs',
  'unit',
  'units',
] as const;

const UNIT_PATTERN = KNOWN_UNITS.join('|');
const NUMERIC_ONLY_PATTERN = /^\d+(?:\.\d+)?$/;
const QUANTITY_LINE_PATTERN = new RegExp(
  `^(\\d+(?:\\.\\d+)?)\\s*(?:(${UNIT_PATTERN}))?\\s*$`,
  'i'
);
const LEADING_QUANTITY_PATTERN = new RegExp(
  `^(\\d+(?:\\.\\d+)?)\\s*(?:(${UNIT_PATTERN}))?\\s+(.+)$`,
  'i'
);
const TRAILING_QUANTITY_PATTERN = new RegExp(
  `^(.+?)\\s+(\\d+(?:\\.\\d+)?)\\s*(?:(${UNIT_PATTERN}))?\\s*$`,
  'i'
);
const ATTACHED_TRAILING_NUMBER_PATTERN = /([a-zA-Z])(\d+(?:\.\d+)?)$/;
const ATTACHED_UNIT_PATTERN = new RegExp(`(\\d+(?:\\.\\d+)?)(${UNIT_PATTERN})\\b`, 'gi');

type DraftEntry = {
  lineNumber: number;
  raw: string;
  product: string;
  quantity: number | null;
  unit: string | null;
};

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeUnit(unit: string | null | undefined): string | null {
  if (!unit) return null;
  const lower = unit.toLowerCase();
  if (lower === 'btl') return 'bottle';
  if (lower === 'bottles') return 'bottle';
  if (lower === 'cases') return 'case';
  if (lower === 'pcs' || lower === 'pc') return 'unit';
  if (lower === 'units') return 'unit';
  if (lower === 'l') return 'L';
  return lower;
}

function parseQuantity(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isQuantityOnlyLine(line: string): boolean {
  return NUMERIC_ONLY_PATTERN.test(line) || QUANTITY_LINE_PATTERN.test(line);
}

function extractQuantityFromLine(line: string): { quantity: number; unit: string | null } | null {
  const numericOnly = line.match(NUMERIC_ONLY_PATTERN);
  if (numericOnly) {
    return { quantity: parseQuantity(numericOnly[0])!, unit: null };
  }

  const withUnit = line.match(QUANTITY_LINE_PATTERN);
  if (withUnit) {
    return {
      quantity: parseQuantity(withUnit[1])!,
      unit: normalizeUnit(withUnit[2]),
    };
  }

  return null;
}

export function cleanupFormat(line: string): string {
  let value = collapseWhitespace(line);

  value = value.replace(ATTACHED_UNIT_PATTERN, '$1 $2');
  value = value.replace(ATTACHED_TRAILING_NUMBER_PATTERN, '$1 $2');
  value = collapseWhitespace(value);

  return value;
}

function parseLine(lineNumber: number, rawLine: string): DraftEntry {
  const raw = rawLine.trim();
  const formatted = cleanupFormat(raw);

  const leading = formatted.match(LEADING_QUANTITY_PATTERN);
  if (leading) {
    return {
      lineNumber,
      raw,
      product: leading[3].trim(),
      quantity: parseQuantity(leading[1]),
      unit: normalizeUnit(leading[2]),
    };
  }

  const trailing = formatted.match(TRAILING_QUANTITY_PATTERN);
  if (trailing) {
    return {
      lineNumber,
      raw,
      product: trailing[1].trim(),
      quantity: parseQuantity(trailing[2]),
      unit: normalizeUnit(trailing[3]),
    };
  }

  const quantityOnly = extractQuantityFromLine(formatted);
  if (quantityOnly) {
    return {
      lineNumber,
      raw,
      product: '',
      quantity: quantityOnly.quantity,
      unit: quantityOnly.unit,
    };
  }

  return {
    lineNumber,
    raw,
    product: formatted,
    quantity: null,
    unit: null,
  };
}

export function applyQuantityTransfer(lines: string[]): DraftEntry[] {
  const entries: DraftEntry[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const currentLine = lines[index].trim();
    if (!currentLine) continue;

    const nextLine = lines[index + 1]?.trim() ?? '';
    const current = parseLine(lineNumber, currentLine);

    if (
      current.product &&
      current.quantity === null &&
      nextLine &&
      isQuantityOnlyLine(cleanupFormat(nextLine))
    ) {
      const transferred = extractQuantityFromLine(cleanupFormat(nextLine));
      if (transferred) {
        entries.push({
          ...current,
          quantity: transferred.quantity,
          unit: transferred.unit ?? current.unit,
        });
        index += 1;
        continue;
      }
    }

    entries.push(current);
  }

  return entries;
}

function mergeKey(item: Pick<ParsedStockItem, 'normalizedProduct' | 'unit'>): string {
  return `${item.normalizedProduct.toLowerCase()}|${item.unit ?? ''}`;
}

function sumQuantities(values: Array<number | null>): number | null {
  if (values.every((value) => value === null)) return null;
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function flag(
  item: ParsedStockItem,
  reason: FlaggedStockItem['reason'],
  severity: StockCleaningSeverity,
  message: string
): FlaggedStockItem {
  return { item, reason, severity, message };
}

export function cleanStockList(
  input: string | string[],
  options: StockCleaningOptions = {}
): StockCleaningResult {
  const lines = (Array.isArray(input) ? input : input.split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean);

  const corrections = getSpellingCorrections(options.spellingCorrections);
  const drafts = applyQuantityTransfer(lines);

  const parsedItems: ParsedStockItem[] = drafts.map((draft) => {
    const spelling = normalizeSpelling(draft.product, corrections);
    return {
      lineNumber: draft.lineNumber,
      product: draft.product,
      quantity: draft.quantity,
      unit: draft.unit,
      raw: draft.raw,
      normalizedProduct: spelling.normalized,
    };
  });

  const flaggedItems: FlaggedStockItem[] = [];
  const mergeGroups = new Map<string, ParsedStockItem[]>();

  for (const item of parsedItems) {
    const spelling = normalizeSpelling(item.product, corrections);

    if (!item.product.trim() && item.quantity !== null) {
      flaggedItems.push(
        flag(
          item,
          'missing_product',
          'error',
          `⚠️ Unknown product — numeric-only entry "${item.raw}"`
        )
      );
      continue;
    }

    if (spelling.ambiguous) {
      flaggedItems.push(
        flag(
          { ...item, normalizedProduct: spelling.normalized },
          'ambiguous',
          'warning',
          `⚠️ Ambiguous product "${item.product}" — possible matches: ${spelling.candidates.join(', ')}`
        )
      );
    }

    if (item.quantity === null && item.product.trim()) {
      flaggedItems.push(
        flag(
          item,
          'missing_quantity',
          'error',
          `🔴 Missing quantity for "${item.normalizedProduct || item.product}"`
        )
      );
    }

    const normalizedItem: ParsedStockItem = {
      ...item,
      normalizedProduct: spelling.normalized,
    };

    const key = mergeKey(normalizedItem);
    const group = mergeGroups.get(key) ?? [];
    group.push(normalizedItem);
    mergeGroups.set(key, group);
  }

  const mergedDuplicates: MergedDuplicateEntry[] = [];
  const cleanList: ParsedStockItem[] = [];

  for (const group of mergeGroups.values()) {
    if (group.length === 1) {
      cleanList.push(group[0]);
      continue;
    }

    const mergedQuantity = sumQuantities(group.map((item) => item.quantity));
    const mergedItem: ParsedStockItem = {
      ...group[0],
      quantity: mergedQuantity,
      raw: group.map((item) => item.raw).join(' | '),
      lineNumber: group[0].lineNumber,
    };

    cleanList.push(mergedItem);
    mergedDuplicates.push({
      product: mergedItem.normalizedProduct,
      quantity: mergedQuantity,
      unit: mergedItem.unit,
      mergedCount: group.length,
      sourceLines: group.map((item) => item.lineNumber),
    });

    flaggedItems.push(
      flag(
        mergedItem,
        'merged_duplicate',
        'warning',
        `Merged ${group.length} duplicate entries for "${mergedItem.normalizedProduct}"`
      )
    );
  }

  cleanList.sort((left, right) => left.lineNumber - right.lineNumber);

  return {
    cleanList,
    flaggedItems,
    mergedDuplicates,
  };
}

export function formatStockCleaningResult(result: StockCleaningResult): string {
  const sections: string[] = [];

  sections.push('## Clean List');
  if (result.cleanList.length === 0) {
    sections.push('(empty)');
  } else {
    for (const item of result.cleanList) {
      const qty = item.quantity === null ? '—' : String(item.quantity);
      const unit = item.unit ? ` ${item.unit}` : '';
      sections.push(`- ${item.normalizedProduct}: ${qty}${unit}`);
    }
  }

  sections.push('', '## Flagged Items');
  if (result.flaggedItems.length === 0) {
    sections.push('(none)');
  } else {
    for (const flagged of result.flaggedItems) {
      sections.push(`- ${flagged.message}`);
    }
  }

  sections.push('', '## Merged Duplicates');
  if (result.mergedDuplicates.length === 0) {
    sections.push('(none)');
  } else {
    for (const merged of result.mergedDuplicates) {
      const qty = merged.quantity === null ? '—' : String(merged.quantity);
      const unit = merged.unit ? ` ${merged.unit}` : '';
      sections.push(
        `- ${merged.product}: ${qty}${unit} (merged ${merged.mergedCount} lines: ${merged.sourceLines.join(', ')})`
      );
    }
  }

  return sections.join('\n');
}
