import { env } from '@/config/env';
import { findRowIndexByName } from './sessionTotals';
import type { SpreadsheetConflict, SpreadsheetRowUpdate, SpreadsheetSyncResult } from './types';

const API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

type BatchValueRange = {
  range: string;
  values: Array<Array<string | number>>;
};

export class GoogleSheetsSyncService {
  constructor(
    private readonly apiKey: string,
    private readonly spreadsheetId: string,
    private readonly sheetName = 'Inventory'
  ) {}

  private sheetRange(columns: string, row?: number): string {
    if (row != null) {
      return `${this.sheetName}!${columns}${row}`;
    }
    return `${this.sheetName}!${columns}`;
  }

  private async fetchSheet(path: string, init?: RequestInit): Promise<Response> {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${API_BASE}/${this.spreadsheetId}${path}${separator}key=${encodeURIComponent(this.apiKey)}`;
    return fetch(url, init);
  }

  async readInventoryRows(): Promise<string[][]> {
    const response = await this.fetchSheet(`/values/${encodeURIComponent(this.sheetRange('A:C'))}`);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google Sheets read failed (${response.status}): ${body}`);
    }

    const json = (await response.json()) as { values?: string[][] };
    return json.values ?? [];
  }

  async writeTotals(updates: SpreadsheetRowUpdate[]): Promise<SpreadsheetSyncResult> {
    if (updates.length === 0) {
      return { updated: 0, appended: 0, conflicts: [] };
    }

    const rows = await this.readInventoryRows();
    const hasHeader = rows.length > 0;
    const data: BatchValueRange[] = [];
    const conflicts: SpreadsheetConflict[] = [];
    let updated = 0;
    let appended = 0;
    let nextRow = Math.max(rows.length + 1, 2);

    for (const update of updates) {
      const existingIndex = findRowIndexByName(rows, update.itemName);

      if (existingIndex >= 0) {
        const sheetRowNumber = existingIndex + 1;
        const existingQty = rows[existingIndex]?.[1];
        const parsedSheetQty =
          existingQty != null && existingQty !== '' ? Number(existingQty) : null;

        if (
          parsedSheetQty != null &&
          Number.isFinite(parsedSheetQty) &&
          parsedSheetQty !== update.quantity
        ) {
          conflicts.push({
            itemName: update.itemName,
            sheetQuantity: parsedSheetQty,
            localQuantity: update.quantity,
          });
        }

        data.push({
          range: this.sheetRange('B:C', sheetRowNumber),
          values: [[update.quantity, update.auditTrail]],
        });
        updated++;
      } else {
        data.push({
          range: this.sheetRange('A:C', nextRow),
          values: [[update.itemName, update.quantity, update.auditTrail]],
        });
        rows.push([update.itemName, String(update.quantity), update.auditTrail]);
        nextRow++;
        appended++;
      }
    }

    if (!hasHeader && data.length > 0) {
      data.unshift({
        range: this.sheetRange('A:C', 1),
        values: [['name', 'quantity', 'notes']],
      });
    }

    const response = await this.fetchSheet('/values:batchUpdate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google Sheets write failed (${response.status}): ${body}`);
    }

    return { updated, appended, conflicts };
  }

  async pullCatalog(): Promise<Array<Record<string, string>>> {
    const rows = await this.readInventoryRows();
    if (rows.length <= 1) return [];

    const header = rows[0].map((cell) => cell.toLowerCase().trim());
    const nameIdx = header.indexOf('name');
    const categoryIdx = header.indexOf('category');
    const qtyIdx = header.indexOf('quantity');

    return rows.slice(1).map((row) => ({
      name: row[nameIdx] ?? row[0] ?? '',
      category: categoryIdx >= 0 ? row[categoryIdx] ?? '' : '',
      quantity: qtyIdx >= 0 ? row[qtyIdx] ?? '' : '',
    }));
  }
}

export function createGoogleSheetsService(sheetName?: string): GoogleSheetsSyncService | null {
  if (!env.googleSheetsApiKey || !env.googleSheetsSpreadsheetId) {
    return null;
  }
  return new GoogleSheetsSyncService(
    env.googleSheetsApiKey,
    env.googleSheetsSpreadsheetId,
    sheetName ?? env.googleSheetsSheetName ?? 'Inventory'
  );
}
