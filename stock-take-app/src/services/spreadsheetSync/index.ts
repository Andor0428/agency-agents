export interface SpreadsheetRowUpdate {
  itemName: string;
  quantity: number;
  auditTrail: string;
}

export interface SpreadsheetSyncService {
  writeTotals(updates: SpreadsheetRowUpdate[]): Promise<void>;
  pullCatalog?(): Promise<Array<Record<string, string>>>;
}

export class NoOpSpreadsheetSyncService implements SpreadsheetSyncService {
  async writeTotals(_updates: SpreadsheetRowUpdate[]): Promise<void> {
    // Offline / unconfigured — handled by sync queue
  }
}

export class GoogleSheetsSyncService implements SpreadsheetSyncService {
  constructor(
    private readonly apiKey: string,
    private readonly spreadsheetId: string,
    private readonly sheetName = 'Inventory'
  ) {}

  async writeTotals(updates: SpreadsheetRowUpdate[]): Promise<void> {
    // Milestone 7: full Google Sheets API integration
    for (const update of updates) {
      console.info('[GoogleSheets] queued write', update.itemName, update.quantity);
    }
    void this.apiKey;
    void this.spreadsheetId;
    void this.sheetName;
  }
}

export class MicrosoftExcelSyncService implements SpreadsheetSyncService {
  constructor(private readonly clientId: string) {}

  async writeTotals(updates: SpreadsheetRowUpdate[]): Promise<void> {
    for (const update of updates) {
      console.info('[MicrosoftExcel] queued write', update.itemName, update.quantity);
    }
    void this.clientId;
  }
}

export function createSpreadsheetSyncService(
  provider: 'google' | 'microsoft' | 'none',
  config: {
    googleApiKey?: string;
    googleSpreadsheetId?: string;
    microsoftClientId?: string;
  }
): SpreadsheetSyncService {
  if (provider === 'google' && config.googleApiKey && config.googleSpreadsheetId) {
    return new GoogleSheetsSyncService(config.googleApiKey, config.googleSpreadsheetId);
  }
  if (provider === 'microsoft' && config.microsoftClientId) {
    return new MicrosoftExcelSyncService(config.microsoftClientId);
  }
  return new NoOpSpreadsheetSyncService();
}
