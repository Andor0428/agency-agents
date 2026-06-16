export type GoogleSpreadsheetSummary = {
  id: string;
  name: string;
};

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Catalog + sync columns — name/quantity/notes first for session sync (A:C). */
export const DEFAULT_INVENTORY_HEADERS = [
  'name',
  'quantity',
  'notes',
  'brand',
  'sku',
  'barcode',
  'color',
  'size',
  'category',
  'storage_location',
  'base_unit',
  'display_unit',
  'container_size',
  'par_level',
  'aliases',
] as const;

export const DEFAULT_INVENTORY_TAB = 'Inventory';

export function pickDefaultTabName(tabs: string[], preferred = 'Inventory'): string {
  if (tabs.includes(preferred)) return preferred;
  return tabs[0] ?? preferred;
}

export async function listUserSpreadsheets(
  accessToken: string,
  pageToken?: string
): Promise<{ files: GoogleSpreadsheetSummary[]; nextPageToken?: string }> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const fields = encodeURIComponent('nextPageToken,files(id,name)');
  let url = `${DRIVE_FILES_URL}?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=50`;
  if (pageToken) {
    url += `&pageToken=${encodeURIComponent(pageToken)}`;
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Could not list Google Sheets (${response.status}): ${body}`);
  }

  const json = (await response.json()) as {
    files?: Array<{ id?: string; name?: string }>;
    nextPageToken?: string;
  };

  const files = (json.files ?? [])
    .filter((file): file is { id: string; name: string } => Boolean(file.id && file.name))
    .map((file) => ({ id: file.id, name: file.name }));

  return { files, nextPageToken: json.nextPageToken };
}

export async function listSpreadsheetTabs(
  accessToken: string,
  spreadsheetId: string
): Promise<string[]> {
  const response = await fetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Could not read sheet tabs (${response.status}): ${body}`);
  }

  const json = (await response.json()) as {
    sheets?: Array<{ properties?: { title?: string } }>;
  };

  return (json.sheets ?? [])
    .map((sheet) => sheet.properties?.title?.trim())
    .filter((title): title is string => Boolean(title));
}

function headerRange(tabName: string): string {
  const lastCol = String.fromCharCode('A'.charCodeAt(0) + DEFAULT_INVENTORY_HEADERS.length - 1);
  return `${tabName}!A1:${lastCol}1`;
}

export async function createInventorySpreadsheet(
  accessToken: string,
  title: string,
  tabName = DEFAULT_INVENTORY_TAB
): Promise<GoogleSpreadsheetSummary & { tabName: string }> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error('Enter a name for your spreadsheet');
  }

  const createResponse = await fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: trimmedTitle },
      sheets: [{ properties: { title: tabName } }],
    }),
  });

  if (!createResponse.ok) {
    const body = await createResponse.text();
    throw new Error(`Could not create spreadsheet (${createResponse.status}): ${body}`);
  }

  const created = (await createResponse.json()) as {
    spreadsheetId?: string;
    properties?: { title?: string };
  };

  if (!created.spreadsheetId) {
    throw new Error('Google did not return a spreadsheet ID');
  }

  const headersResponse = await fetch(
    `${SHEETS_API_BASE}/${created.spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: headerRange(tabName),
            values: [Array.from(DEFAULT_INVENTORY_HEADERS)],
          },
        ],
      }),
    }
  );

  if (!headersResponse.ok) {
    const body = await headersResponse.text();
    throw new Error(`Spreadsheet created but headers failed (${headersResponse.status}): ${body}`);
  }

  return {
    id: created.spreadsheetId,
    name: created.properties?.title ?? trimmedTitle,
    tabName,
  };
}
