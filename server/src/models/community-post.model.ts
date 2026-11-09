import { randomUUID } from 'node:crypto';
import { db } from '../config/db';
import type { UserRole } from '../types/auth';

export type CommunityAuthorRole = 'FREELANCER' | 'CLIENT' | 'ADMIN';
export type CommunityPostStatus = 'PUBLISHED' | 'DRAFT';

export interface CommunityPost {
  id: string; title: string; content: string; coverImage: string | null;
  authorId: string; authorName: string; authorAvatar: string | null;
  authorRole: CommunityAuthorRole; category: string; status: CommunityPostStatus;
  createdAt: string; viewsCount: number; likesCount: number;
}

interface PostRow {
  id: string; title: string; content: string; cover_image: string | null;
  author_id: string; author_name: string; author_avatar: string | null;
  author_role: CommunityAuthorRole; category: string; status: CommunityPostStatus;
  created_at: string; views_count: number; likes_count: number;
}

const columns = `p.id, p.title, p.content, p.cover_image, p.author_id, u.name AS author_name,
  u.avatar_url AS author_avatar, p.author_role, p.category, p.status, p.created_at,
  p.views_count, p.likes_count`;
const mapPost = (row: PostRow): CommunityPost => ({
  id: row.id, title: row.title, content: row.content, coverImage: row.cover_image,
  authorId: row.author_id, authorName: row.author_name, authorAvatar: row.author_avatar,
  authorRole: row.author_role, category: row.category, status: row.status,
  createdAt: row.created_at, viewsCount: row.views_count, likesCount: row.likes_count,
});

export const mapAuthorRole = (role: UserRole): CommunityAuthorRole =>
  role === 'Freelancer' ? 'FREELANCER' : role === 'Admin' ? 'ADMIN' : 'CLIENT';

export const listCommunityPosts = (options: { query?: string; category?: string; authorId?: string; includeDrafts?: boolean }): CommunityPost[] => {
  const where: string[] = [];
  const args: string[] = [];
  if (!options.includeDrafts) where.push("p.status = 'PUBLISHED'");
  if (options.category) { where.push('p.category = ?'); args.push(options.category); }
  if (options.authorId) { where.push('p.author_id = ?'); args.push(options.authorId); }
  if (options.query) { where.push('(p.title LIKE ? OR p.content LIKE ?)'); args.push(`%${options.query}%`, `%${options.query}%`); }
  const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT ${columns} FROM community_posts p JOIN users u ON u.id = p.author_id ${sqlWhere} ORDER BY p.created_at DESC LIMIT 100`).all(...args) as unknown as PostRow[];
  return rows.map(mapPost);
};

export const findCommunityPost = (id: string): CommunityPost | null => {
  const row = db.prepare(`SELECT ${columns} FROM community_posts p JOIN users u ON u.id = p.author_id WHERE p.id = ?`).get(id) as PostRow | undefined;
  return row ? mapPost(row) : null;
};

export const createCommunityPost = (input: {
  title: string; content: string; coverImage?: string; authorId: string;
  authorRole: CommunityAuthorRole; category: string; status: CommunityPostStatus;
}): CommunityPost => {
  const id = randomUUID();
  db.prepare(`INSERT INTO community_posts (id, title, content, cover_image, author_id, author_role, category, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, input.title, input.content, input.coverImage ?? null, input.authorId, input.authorRole, input.category, input.status);
  const created = findCommunityPost(id);
  if (!created) throw new Error('Failed to create community post');
  return created;
};

export const updateCommunityPost = (id: string, authorId: string, input: {
  title?: string; content?: string; coverImage?: string | null; category?: string; status?: CommunityPostStatus;
}, allowAnyAuthor = false): CommunityPost | null => {
  const fields: string[] = [];
  const values: (string | null)[] = [];
  for (const [key, column] of [['title', 'title'], ['content', 'content'], ['coverImage', 'cover_image'], ['category', 'category'], ['status', 'status']] as const) {
    if (input[key] !== undefined) { fields.push(`${column} = ?`); values.push(input[key]!); }
  }
  if (!fields.length) return findCommunityPost(id);
  values.push(id);
  if (!allowAnyAuthor) values.push(authorId);
  const result = db.prepare(`UPDATE community_posts SET ${fields.join(', ')} WHERE id = ?${allowAnyAuthor ? '' : ' AND author_id = ?'}`).run(...values);
  return Number(result.changes) ? findCommunityPost(id) : null;
};

export const deleteCommunityPost = (id: string, authorId?: string): string | null | undefined => {
  const existing = db.prepare('SELECT cover_image FROM community_posts WHERE id = ?').get(id) as { cover_image: string | null } | undefined;
  if (!existing) return undefined;
  if (authorId) {
    const result = db.prepare('DELETE FROM community_posts WHERE id = ? AND author_id = ?').run(id, authorId);
    if (!Number(result.changes)) return undefined;
  } else db.prepare('DELETE FROM community_posts WHERE id = ?').run(id);
  return existing.cover_image;
};

export const incrementCommunityPostViews = (id: string): void => {
  db.prepare("UPDATE community_posts SET views_count = views_count + 1 WHERE id = ? AND status = 'PUBLISHED'").run(id);
};

