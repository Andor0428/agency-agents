export type StockCleaningFlagCode = 'missing_quantity' | 'missing_product' | 'ambiguous';

export type StockCleaningFlagSeverity = 'RED' | 'WARNING';

export type CleanStockItem = {
  product: string;
  quantity: number;
  unit: string | null;
  quantityText: string;
  sourceLines: number[];
};

export type FlaggedStockItem = {
  code: StockCleaningFlagCode;
  severity: StockCleaningFlagSeverity;
  raw: string;
  message: string;
  sourceLines: number[];
  product?: string;
  quantityText?: string;
};

export type MergedStockDuplicate = {
  product: string;
  unit: string | null;
  quantity: number;
  quantityText: string;
  sourceLines: number[];
  mergedFrom: CleanStockItem[];
};

export type StockCleaningResult = {
  cleanList: CleanStockItem[];
  flaggedItems: FlaggedStockItem[];
  mergedDuplicates: MergedStockDuplicate[];
};

type RawLine = {
  raw: string;
  text: string;
  sourceLine: number;
};

type ParsedLine =
  | {
      kind: 'item';
      item: CleanStockItem;
    }
  | {
      kind: 'missing_quantity';
      product: string;
      raw: string;
      sourceLines: number[];
    }
  | {
      kind: 'missing_product';
      raw: string;
      quantityText: string;
      sourceLines: number[];
    }
  | {
      kind: 'ambiguous';
      product?: string;
      raw: string;
      message: string;
      quantityText?: string;
      sourceLines: number[];
    };

const UNIT_CANONICAL: Record<string, string> = {
  bottle: 'bottle',
  bottles: 'bottles',
  case: 'case',
  cases: 'cases',
  each: 'each',
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  l: 'L',
  litre: 'L',
  litres: 'L',
  liter: 'L',
  liters: 'L',
  ml: 'ml',
  ounce: 'oz',
  ounces: 'oz',
  oz: 'oz',
  pack: 'pack',
  packs: 'packs',
  piece: 'piece',
  pieces: 'pieces',
  unit: 'unit',
  units: 'units',
};

const PRODUCT_PHRASE_NORMALIZATIONS: Array<[RegExp, string]> = [
  [/\bjohnny\s+walker\b/gi, 'Johnnie Walker'],
  [/\bjohnnie\s+walker\b/gi, 'Johnnie Walker'],
  [/\bmcallen\b/gi, 'Macallan'],
  [/\bmacallen\b/gi, 'Macallan'],
  [/\bmacallan\b/gi, 'Macallan'],
];

const UNIT_PATTERN = Object.keys(UNIT_CANONICAL)
  .sort((a, b) => b.length - a.length)
  .join('|');

const QUANTITY_WITH_OPTIONAL_UNIT = new RegExp(
  `^(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})?\\b`,
  'i'
);

const QUANTITY_ONLY = new RegExp(`^\\d+(?:\\.\\d+)?(?:\\s*(?:${UNIT_PATTERN}))?$`, 'i');

const SIZE_UNIT = new Set(['ml', 'L', 'g', 'kg', 'oz']);

export function cleanStockLines(input: string | string[]): StockCleaningResult {
  const lines = splitStockInput(input);
  const parsed: ParsedLine[] = [];
  const flaggedItems: FlaggedStockItem[] = [];

  for (let index = 0; index < lines.length; index++) {
    const current = lines[index];
    const next = lines[index + 1];
    const transferred = maybeParseTransferredQuantity(next);

    if (transferred && !hasQuantity(current.text)) {
      const product = normalizeProductName(current.text);
      if (!product) {
        flaggedItems.push({
          code: 'missing_product',
          severity: 'RED',
          raw: `${current.raw}\n${next.raw}`,
          message: 'Quantity has no product name.',
          quantityText: transferred.quantityText,
          sourceLines: [current.sourceLine, next.sourceLine],
        });
      } else {
        parsed.push({
          kind: 'item',
          item: {
            product,
            quantity: transferred.quantity,
            unit: transferred.unit,
            quantityText: transferred.quantityText,
            sourceLines: [current.sourceLine, next.sourceLine],
          },
        });
      }
      index++;
      continue;
    }

    parsed.push(parseStockLine(current));
  }

  for (const entry of parsed) {
    if (entry.kind === 'missing_quantity') {
      flaggedItems.push({
        code: 'missing_quantity',
        severity: 'RED',
        raw: entry.raw,
        product: entry.product,
        message: 'Product has no quantity.',
        sourceLines: entry.sourceLines,
      });
    } else if (entry.kind === 'missing_product') {
      flaggedItems.push({
        code: 'missing_product',
        severity: 'RED',
        raw: entry.raw,
        quantityText: entry.quantityText,
        message: 'Quantity has no product name.',
        sourceLines: entry.sourceLines,
      });
    } else if (entry.kind === 'ambiguous') {
      flaggedItems.push({
        code: 'ambiguous',
        severity: 'WARNING',
        raw: entry.raw,
        product: entry.product,
        quantityText: entry.quantityText,
        message: entry.message,
        sourceLines: entry.sourceLines,
      });
    }
  }

  const items = parsed.flatMap((entry) => (entry.kind === 'item' ? [entry.item] : []));
  const { cleanList, mergedDuplicates } = mergeDuplicateItems(items, flaggedItems);

  return {
    cleanList,
    flaggedItems,
    mergedDuplicates,
  };
}

function splitStockInput(input: string | string[]): RawLine[] {
  const rawLines = Array.isArray(input) ? input : input.split(/\r?\n/);

  return rawLines
    .map((raw, index) => ({
      raw,
      text: cleanupSpacing(raw),
      sourceLine: index + 1,
    }))
    .filter((line) => line.text.length > 0);
}

function cleanupSpacing(value: string): string {
  return value
    .trim()
    .replace(/[,\t]+/g, ' ')
    .replace(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})\\b`, 'gi'), (_match, qty, unit) => {
      return `${qty} ${canonicalUnit(unit)}`;
    })
    .replace(/([A-Za-z])(\d+(?:\.\d+)?)\b/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseStockLine(line: RawLine): ParsedLine {
  if (QUANTITY_ONLY.test(line.text)) {
    const quantity = parseQuantityPhrase(line.text);
    return {
      kind: 'missing_product',
      raw: line.raw,
      quantityText: quantity.quantityText,
      sourceLines: [line.sourceLine],
    };
  }

  const leading = parseLeadingQuantity(line.text);
  if (leading) {
    const product = normalizeProductName(leading.productText);
    if (!product) {
      return {
        kind: 'missing_product',
        raw: line.raw,
        quantityText: leading.quantityText,
        sourceLines: [line.sourceLine],
      };
    }
    return {
      kind: 'item',
      item: {
        product,
        quantity: leading.quantity,
        unit: leading.unit,
        quantityText: leading.quantityText,
        sourceLines: [line.sourceLine],
      },
    };
  }

  const trailing = parseTrailingQuantity(line.text);
  if (trailing) {
    const product = normalizeProductName(trailing.productText);
    if (!product) {
      return {
        kind: 'missing_product',
        raw: line.raw,
        quantityText: trailing.quantityText,
        sourceLines: [line.sourceLine],
      };
    }
    return {
      kind: 'item',
      item: {
        product,
        quantity: trailing.quantity,
        unit: trailing.unit,
        quantityText: trailing.quantityText,
        sourceLines: [line.sourceLine],
      },
    };
  }

  return {
    kind: 'missing_quantity',
    product: normalizeProductName(line.text),
    raw: line.raw,
    sourceLines: [line.sourceLine],
  };
}

function parseLeadingQuantity(text: string) {
  const match = text.match(QUANTITY_WITH_OPTIONAL_UNIT);
  if (!match) return null;

  const quantityEnd = match[0].length;
  const productText = text.slice(quantityEnd).trim();
  if (!productText) return null;

  const quantity = Number(match[1]);
  const unit = match[2] ? canonicalUnit(match[2]) : null;

  return {
    quantity,
    unit,
    quantityText: formatQuantityText(quantity, unit),
    productText,
  };
}

function parseTrailingQuantity(text: string) {
  const match = text.match(new RegExp(`^(.*?)(\\d+(?:\\.\\d+)?)(?:\\s*(${UNIT_PATTERN}))?$`, 'i'));
  if (!match) return null;

  const productText = match[1].trim();
  if (!productText) return null;

  const quantity = Number(match[2]);
  const unit = match[3] ? canonicalUnit(match[3]) : null;
  if (unit && SIZE_UNIT.has(unit) && countNumericTokens(productText) === 0) {
    return null;
  }

  return {
    quantity,
    unit,
    quantityText: formatQuantityText(quantity, unit),
    productText,
  };
}

function maybeParseTransferredQuantity(line: RawLine | undefined) {
  if (!line) return null;
  if (!line.text.match(QUANTITY_WITH_OPTIONAL_UNIT)) return null;

  const quantity = parseQuantityPhrase(line.text);
  const remainder = line.text.replace(QUANTITY_WITH_OPTIONAL_UNIT, '').trim();
  if (remainder) {
    return null;
  }

  return quantity;
}

function parseQuantityPhrase(text: string) {
  const match = text.match(QUANTITY_WITH_OPTIONAL_UNIT);
  const quantity = match ? Number(match[1]) : 0;
  const unit = match?.[2] ? canonicalUnit(match[2]) : null;

  return {
    quantity,
    unit,
    quantityText: formatQuantityText(quantity, unit),
  };
}

function hasQuantity(text: string): boolean {
  if (QUANTITY_ONLY.test(text)) return true;
  return Boolean(parseLeadingQuantity(text) || parseTrailingQuantity(text));
}

function mergeDuplicateItems(
  items: CleanStockItem[],
  flaggedItems: FlaggedStockItem[]
): Pick<StockCleaningResult, 'cleanList' | 'mergedDuplicates'> {
  const grouped = new Map<string, CleanStockItem[]>();

  for (const item of items) {
    const key = `${canonicalProductKey(item.product)}::${item.unit ?? ''}`;
    const existing = grouped.get(key) ?? [];
    existing.push(item);
    grouped.set(key, existing);
  }

  const cleanList: CleanStockItem[] = [];
  const mergedDuplicates: MergedStockDuplicate[] = [];

  for (const group of grouped.values()) {
    const first = group[0];
    const quantity = group.reduce((total, item) => total + item.quantity, 0);
    const sourceLines = group.flatMap((item) => item.sourceLines);
    const merged = {
      product: first.product,
      quantity,
      unit: first.unit,
      quantityText: formatQuantityText(quantity, first.unit),
      sourceLines,
    };

    cleanList.push(merged);

    if (group.length > 1) {
      mergedDuplicates.push({
        ...merged,
        mergedFrom: group,
      });
    }
  }

  flagUnitAmbiguity(items, flaggedItems);

  return {
    cleanList: cleanList.sort((a, b) => a.product.localeCompare(b.product)),
    mergedDuplicates: mergedDuplicates.sort((a, b) => a.product.localeCompare(b.product)),
  };
}

function flagUnitAmbiguity(items: CleanStockItem[], flaggedItems: FlaggedStockItem[]) {
  const unitsByProduct = new Map<string, Set<string>>();
  const sourceByProduct = new Map<string, number[]>();

  for (const item of items) {
    const key = canonicalProductKey(item.product);
    unitsByProduct.set(key, (unitsByProduct.get(key) ?? new Set()).add(item.unit ?? ''));
    sourceByProduct.set(key, [...(sourceByProduct.get(key) ?? []), ...item.sourceLines]);
  }

  for (const [key, units] of unitsByProduct) {
    if (units.size <= 1) continue;
    const product = items.find((item) => canonicalProductKey(item.product) === key)?.product;
    flaggedItems.push({
      code: 'ambiguous',
      severity: 'WARNING',
      raw: product ?? key,
      product,
      message: 'Same product uses multiple units; quantities were not merged across units.',
      sourceLines: sourceByProduct.get(key) ?? [],
    });
  }
}

function normalizeProductName(value: string): string {
  let product = cleanupSpacing(value);
  for (const [pattern, replacement] of PRODUCT_PHRASE_NORMALIZATIONS) {
    product = product.replace(pattern, replacement);
  }

  return titleCasePreservingKnownPhrases(product).trim();
}

function titleCasePreservingKnownPhrases(value: string): string {
  const protectedPhrases: string[] = [];
  let text = value;

  for (const [, replacement] of PRODUCT_PHRASE_NORMALIZATIONS) {
    if (protectedPhrases.includes(replacement)) continue;
    const token = `__PHRASE_${protectedPhrases.length}__`;
    protectedPhrases.push(replacement);
    text = text.replace(new RegExp(replacement, 'gi'), token);
  }

  text = text
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
    .replace(/\b(ml|g|kg|oz)\b/gi, (unit) => canonicalUnit(unit))
    .replace(/\bL\b/gi, 'L');

  protectedPhrases.forEach((phrase, index) => {
    text = text.replace(`__phrase_${index}__`, phrase);
  });

  return text;
}

function canonicalProductKey(value: string): string {
  return normalizeProductName(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function canonicalUnit(value: string): string {
  return UNIT_CANONICAL[value.toLowerCase()] ?? value;
}

function formatQuantityText(quantity: number, unit: string | null): string {
  return unit ? `${quantity} ${unit}` : String(quantity);
}

function countNumericTokens(value: string): number {
  return [...value.matchAll(/\d+(?:\.\d+)?/g)].length;
}
