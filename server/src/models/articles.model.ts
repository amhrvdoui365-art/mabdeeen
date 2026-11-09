import { db } from '../config/db';

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  authorName: string;
  authorAvatar: string | null;
  authorId: string | null;
  publishedAt: string;
  readTime: number;
}

type ArticleRow = Omit<Article, 'coverImage' | 'authorName' | 'authorAvatar' | 'authorId' | 'publishedAt' | 'readTime'> & {
  cover_image: string; author_name: string; author_avatar: string | null; author_id: string | null; published_at: string; read_time: number;
};

const mapArticle = (row: ArticleRow): Article => ({
  id: row.id, title: row.title, slug: row.slug, excerpt: row.excerpt, content: row.content,
  coverImage: row.cover_image, category: row.category, authorName: row.author_name,
  authorAvatar: row.author_avatar, publishedAt: row.published_at, readTime: row.read_time,
  authorId: row.author_id,
});

export const findArticles = (options: { query?: string; category?: string; limit: number }): Article[] => {
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  if (options.category) { conditions.push('category = ?'); values.push(options.category); }
  if (options.query) {
    conditions.push("(title LIKE ? ESCAPE '!' OR excerpt LIKE ? ESCAPE '!')");
    const escaped = options.query.replace(/[!%_]/g, '!$&');
    values.push(`%${escaped}%`, `%${escaped}%`);
  }
  values.push(options.limit);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM articles ${where} ORDER BY published_at DESC LIMIT ?`).all(...values) as unknown as ArticleRow[];
  return rows.map(mapArticle);
};

export const findArticleBySlug = (slug: string): Article | null => {
  const row = db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug) as ArticleRow | undefined;
  return row ? mapArticle(row) : null;
};

export const findArticleSlugById = (id: string): string | null => {
  const row = db.prepare('SELECT slug FROM articles WHERE id = ?').get(id) as { slug: string } | undefined;
  return row?.slug ?? null;
};
