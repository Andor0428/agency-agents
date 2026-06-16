export type GoogleSpreadsheetSummary = {
  id: string;
  name: string;
};

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

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
