import { createId as uuidv4 } from '@/utils/uuid';
import type * as SQLite from 'expo-sqlite';
import type { Recipe, RecipeComponent, RecipeWithComponents } from '@/types';
import { mapRecipeRow } from '../mappers';

export type RecipeComponentInput = {
  componentItemId: string;
  qty: number;
  unit: string;
};

export class RecipesRepository {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async getBatchItems(): Promise<Array<{ item_id: string; item_name: string; recipe_version: number | null }>> {
    return this.db.getAllAsync(
      `SELECT i.id as item_id, i.name as item_name, r.version as recipe_version
       FROM items i
       LEFT JOIN recipes r ON r.item_id = i.id AND r.is_current = 1
       WHERE i.is_batch = 1
       ORDER BY i.name COLLATE NOCASE ASC`
    );
  }

  async getVersions(itemId: string): Promise<Recipe[]> {
    const rows = await this.db.getAllAsync<{
      id: string;
      item_id: string;
      version: number;
      yield_pct: number;
      is_current: number;
      created_at: string;
    }>(
      'SELECT * FROM recipes WHERE item_id = ? ORDER BY version DESC',
      [itemId]
    );
    return rows.map(mapRecipeRow);
  }

  async getCurrent(itemId: string): Promise<RecipeWithComponents | null> {
    const recipeRow = await this.db.getFirstAsync<{
      id: string;
      item_id: string;
      version: number;
      yield_pct: number;
      is_current: number;
      created_at: string;
    }>('SELECT * FROM recipes WHERE item_id = ? AND is_current = 1 LIMIT 1', [itemId]);

    if (!recipeRow) return null;

    const recipe = mapRecipeRow(recipeRow);
    const components = await this.getComponents(recipe.id);
    return { ...recipe, components };
  }

  async getById(recipeId: string): Promise<RecipeWithComponents | null> {
    const recipeRow = await this.db.getFirstAsync<{
      id: string;
      item_id: string;
      version: number;
      yield_pct: number;
      is_current: number;
      created_at: string;
    }>('SELECT * FROM recipes WHERE id = ?', [recipeId]);

    if (!recipeRow) return null;

    const recipe = mapRecipeRow(recipeRow);
    const components = await this.getComponents(recipe.id);
    return { ...recipe, components };
  }

  async getComponents(recipeId: string): Promise<Array<RecipeComponent & { component_name: string }>> {
    return this.db.getAllAsync(
      `SELECT rc.*, i.name as component_name
       FROM recipe_components rc
       JOIN items i ON i.id = rc.component_item_id
       WHERE rc.recipe_id = ?
       ORDER BY i.name COLLATE NOCASE ASC`,
      [recipeId]
    );
  }

  async createVersion(
    itemId: string,
    yieldPct: number,
    components: RecipeComponentInput[]
  ): Promise<RecipeWithComponents> {
    const maxRow = await this.db.getFirstAsync<{ max_version: number | null }>(
      'SELECT MAX(version) as max_version FROM recipes WHERE item_id = ?',
      [itemId]
    );
    const nextVersion = (maxRow?.max_version ?? 0) + 1;
    const recipeId = uuidv4();
    const now = new Date().toISOString();

    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('UPDATE recipes SET is_current = 0 WHERE item_id = ?', [itemId]);
      await this.db.runAsync(
        `INSERT INTO recipes (id, item_id, version, yield_pct, is_current, created_at)
         VALUES (?, ?, ?, ?, 1, ?)`,
        [recipeId, itemId, nextVersion, yieldPct, now]
      );

      for (const component of components) {
        await this.db.runAsync(
          `INSERT INTO recipe_components (id, recipe_id, component_item_id, qty, unit)
           VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), recipeId, component.componentItemId, component.qty, component.unit]
        );
      }
    });

    const created = await this.getById(recipeId);
    if (!created) throw new Error('Failed to create recipe version');
    return created;
  }

  async duplicateAsTemplate(sourceRecipeId: string, targetItemId: string): Promise<RecipeWithComponents> {
    const source = await this.getById(sourceRecipeId);
    if (!source) throw new Error('Source recipe not found');

    return this.createVersion(
      targetItemId,
      source.yield_pct,
      source.components.map((c) => ({
        componentItemId: c.component_item_id,
        qty: c.qty,
        unit: c.unit,
      }))
    );
  }

  async deleteVersion(recipeId: string): Promise<void> {
    const recipe = await this.db.getFirstAsync<{ item_id: string; is_current: number }>(
      'SELECT item_id, is_current FROM recipes WHERE id = ?',
      [recipeId]
    );
    if (!recipe) return;

    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM recipe_components WHERE recipe_id = ?', [recipeId]);
      await this.db.runAsync('DELETE FROM recipes WHERE id = ?', [recipeId]);

      if (recipe.is_current === 1) {
        const latest = await this.db.getFirstAsync<{ id: string }>(
          'SELECT id FROM recipes WHERE item_id = ? ORDER BY version DESC LIMIT 1',
          [recipe.item_id]
        );
        if (latest) {
          await this.db.runAsync('UPDATE recipes SET is_current = 1 WHERE id = ?', [latest.id]);
        }
      }
    });
  }
}
