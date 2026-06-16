/** Extract spirit/product names from the Whisper/Wispr catalog priming string. */
export function dictionaryFromCatalogPrompt(catalogPrompt: string): string[] {
  const trimmed = catalogPrompt.trim();
  if (!trimmed) return [];

  const prefixes = ['Bar spirits inventory: ', 'Bar stock take spirits: '];
  let body = trimmed;
  for (const prefix of prefixes) {
    if (body.startsWith(prefix)) {
      body = body.slice(prefix.length);
      break;
    }
  }

  return [...new Set(body.split(',').map((name) => name.trim()).filter(Boolean))].slice(0, 200);
}
