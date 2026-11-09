import { randomUUID } from 'node:crypto';
import { db } from '../config/db';
import type { PortfolioItem } from '../types/freelancer';
import type { CreatePortfolioInput } from '../validators/portfolio.validator';

interface PortfolioRow {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  project_url: string | null;
  created_at: string;
}

const mapPortfolioItem = (row: PortfolioRow): PortfolioItem => {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    projectUrl: row.project_url,
    createdAt: row.created_at,
  };
};

export const listPortfolioByUser = async (userId: string): Promise<PortfolioItem[]> => {
  const rows = db
    .prepare(
      `SELECT id, title, description, image_url, project_url, created_at
       FROM portfolio_items
       WHERE user_id = ?
       ORDER BY created_at DESC`,
    )
    .all(userId) as unknown as PortfolioRow[];

  return rows.map(mapPortfolioItem);
};

export const countPortfolioItems = async (userId: string): Promise<number> => {
  const row = db
    .prepare('SELECT COUNT(*) AS total FROM portfolio_items WHERE user_id = ?')
    .get(userId) as { total: number } | undefined;

  return row ? row.total : 0;
};

export const createPortfolioItem = async (
  userId: string,
  input: CreatePortfolioInput,
): Promise<PortfolioItem> => {
  const id = randomUUID();

  db.prepare(
    `INSERT INTO portfolio_items (id, user_id, title, description, image_url, project_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    input.title,
    input.description ?? null,
    input.imageUrl ?? null,
    input.projectUrl ?? null,
  );

  const row = db
    .prepare(
      `SELECT id, title, description, image_url, project_url, created_at
       FROM portfolio_items WHERE id = ?`,
    )
    .get(id) as PortfolioRow | undefined;

  if (!row) {
    throw new Error('Failed to create portfolio item');
  }

  return mapPortfolioItem(row);
};

export const deletePortfolioItem = async (
  itemId: string,
  userId: string,
): Promise<string | null | undefined> => {
  const row = db
    .prepare(
      'SELECT image_url FROM portfolio_items WHERE id = ? AND user_id = ?',
    )
    .get(itemId, userId) as { image_url: string | null } | undefined;

  if (!row) {
    return undefined;
  }

  db.prepare('DELETE FROM portfolio_items WHERE id = ? AND user_id = ?').run(
    itemId,
    userId,
  );

  return row.image_url;
};
