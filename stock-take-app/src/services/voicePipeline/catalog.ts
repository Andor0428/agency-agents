import type { Repositories } from '@/services/db/repositories';
import type { MatchableCatalogEntry } from '@/services/matcher';

export async function loadMatchableCatalog(repos: Repositories): Promise<MatchableCatalogEntry[]> {
  const items = await repos.items.getAll({ activeOnly: true });
  const aliases = await repos.aliases.getAll();

  const aliasesByItem = new Map<string, typeof aliases>();
  for (const alias of aliases) {
    const list = aliasesByItem.get(alias.item_id) ?? [];
    list.push(alias);
    aliasesByItem.set(alias.item_id, list);
  }

  return items.map((item) => ({
    item,
    aliases: aliasesByItem.get(item.id) ?? [],
  }));
}
