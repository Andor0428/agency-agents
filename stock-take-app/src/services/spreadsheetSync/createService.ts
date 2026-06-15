import { env } from '@/config/env';
import { loadSettings } from '@/config/settings';
import { createGoogleSheetsService } from './googleSheets';
import type { SpreadsheetRowUpdate, SpreadsheetSyncResult, SpreadsheetSyncService } from './types';

export class NoOpSpreadsheetSyncService implements SpreadsheetSyncService {
  async writeTotals(_updates: SpreadsheetRowUpdate[]): Promise<SpreadsheetSyncResult> {
    return { updated: 0, appended: 0, conflicts: [] };
  }
}

export class MicrosoftExcelSyncService implements SpreadsheetSyncService {
  constructor(private readonly clientId: string) {}

  async writeTotals(updates: SpreadsheetRowUpdate[]): Promise<SpreadsheetSyncResult> {
    for (const update of updates) {
      console.info('[MicrosoftExcel] queued write', update.itemName, update.quantity);
    }
    void this.clientId;
    return { updated: updates.length, appended: 0, conflicts: [] };
  }
}

export async function createSpreadsheetSyncService(): Promise<SpreadsheetSyncService> {
  const settings = await loadSettings();

  if (settings.spreadsheetProvider === 'google') {
    const service = createGoogleSheetsService();
    if (service) return service;
  }

  if (settings.spreadsheetProvider === 'microsoft' && env.microsoftGraphClientId) {
    return new MicrosoftExcelSyncService(env.microsoftGraphClientId);
  }

  return new NoOpSpreadsheetSyncService();
}
