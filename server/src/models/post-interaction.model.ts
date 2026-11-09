import { randomUUID } from 'node:crypto';
import { db } from '../config/db';
import type { UserRole } from '../types/auth';

export type InteractionTarget = { kind: 'post' | 'article'; id: string };
export type CommentAttachmentType = 'IMAGE' | 'VIDEO' | 'FILE';

export interface PostComment {
  id: string;
  postId: string | null;
  articleId: string | null;
  userId: string;
  authorName: string;
  authorAvatar: string | null;
  authorRole: UserRole;
  content: string;
  attachmentUrl: string | null;
  attachmentType: CommentAttachmentType | null;
  createdAt: string;
}

const targetColumn = (target: InteractionTarget): 'post_id' | 'article_id' =>
  target.kind === 'post' ? 'post_id' : 'article_id';

const targetValues = (target: InteractionTarget): [string | null, string | null] =>
  target.kind === 'post' ? [target.id, null] : [null, target.id];

export const listPostComments = (target: InteractionTarget): PostComment[] => {
  const column = targetColumn(target);
  const rows = db.prepare(`SELECT c.id, c.post_id, c.article_id, c.user_id, u.name AS author_name,
      u.avatar_url AS author_avatar, u.role AS author_role, c.content, c.attachment_url,
      c.attachment_type, c.created_at
    FROM post_comments c JOIN users u ON u.id = c.user_id
    WHERE c.${column} = ? ORDER BY c.created_at ASC LIMIT 300`).all(target.id) as Array<{
      id: string; post_id: string | null; article_id: string | null; user_id: string;
      author_name: string; author_avatar: string | null; author_role: UserRole; content: string;
      attachment_url: string | null; attachment_type: CommentAttachmentType | null; created_at: string;
    }>;
  return rows.map((row) => ({ id: row.id, postId: row.post_id, articleId: row.article_id,
    userId: row.user_id, authorName: row.author_name, authorAvatar: row.author_avatar,
    authorRole: row.author_role, content: row.content, attachmentUrl: row.attachment_url,
    attachmentType: row.attachment_type, createdAt: row.created_at }));
};

export const insertPostComment = (
  target: InteractionTarget,
  userId: string,
  content: string,
  attachment?: { url: string; type: CommentAttachmentType },
): PostComment => {
  const id = randomUUID();
  const [postId, articleId] = targetValues(target);
  db.prepare(`INSERT INTO post_comments
    (id, post_id, article_id, user_id, content, attachment_url, attachment_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, postId, articleId, userId, content,
    attachment?.url ?? null, attachment?.type ?? null);
  const inserted = listPostComments(target).find((comment) => comment.id === id);
  if (!inserted) throw new Error('Could not read newly created comment');
  return inserted;
};

export const removePostComment = (commentId: string, userId: string, isAdmin: boolean): string | null | undefined => {
  const existing = db.prepare('SELECT user_id, attachment_url FROM post_comments WHERE id = ?')
    .get(commentId) as { user_id: string; attachment_url: string | null } | undefined;
  if (!existing || (!isAdmin && existing.user_id !== userId)) return undefined;
  db.prepare('DELETE FROM post_comments WHERE id = ?').run(commentId);
  return existing.attachment_url;
};

export const togglePostLike = (target: InteractionTarget, userId: string): { liked: boolean; likesCount: number } => {
  const column = targetColumn(target);
  const existing = db.prepare(`SELECT 1 FROM post_likes WHERE ${column} = ? AND user_id = ?`).get(target.id, userId);
  if (existing) db.prepare(`DELETE FROM post_likes WHERE ${column} = ? AND user_id = ?`).run(target.id, userId);
  else {
    const [postId, articleId] = targetValues(target);
    db.prepare('INSERT INTO post_likes (id, post_id, article_id, user_id) VALUES (?, ?, ?, ?)')
      .run(randomUUID(), postId, articleId, userId);
  }
  const result = db.prepare(`SELECT COUNT(*) AS count FROM post_likes WHERE ${column} = ?`).get(target.id) as { count: number };
  if (target.kind === 'post') db.prepare('UPDATE community_posts SET likes_count = ? WHERE id = ?').run(result.count, target.id);
  return { liked: !existing, likesCount: Number(result.count) };
};

export const hasPostLike = (target: InteractionTarget, userId: string): boolean => {
  const column = targetColumn(target);
  return Boolean(db.prepare(`SELECT 1 FROM post_likes WHERE ${column} = ? AND user_id = ?`).get(target.id, userId));
};

export const getInteractionCounts = (target: InteractionTarget): { likesCount: number; commentsCount: number } => {
  const column = targetColumn(target);
  const row = db.prepare(`SELECT
    (SELECT COUNT(*) FROM post_likes WHERE ${column} = ?) AS likes_count,
    (SELECT COUNT(*) FROM post_comments WHERE ${column} = ?) AS comments_count`).get(target.id, target.id) as {
      likes_count: number; comments_count: number;
    };
  return { likesCount: Number(row.likes_count), commentsCount: Number(row.comments_count) };
};

export const findPostOwner = (target: InteractionTarget): string | null => {
  if (target.kind === 'post') {
    const row = db.prepare('SELECT author_id FROM community_posts WHERE id = ?').get(target.id) as { author_id: string } | undefined;
    return row?.author_id ?? null;
  }
  const row = db.prepare('SELECT author_id FROM articles WHERE id = ?').get(target.id) as { author_id: string | null } | undefined;
  return row?.author_id ?? null;
};

export const interactionTargetExists = (target: InteractionTarget): boolean => {
  const table = target.kind === 'post' ? 'community_posts' : 'articles';
  const statusClause = target.kind === 'post' ? " AND status = 'PUBLISHED'" : '';
  return Boolean(db.prepare(`SELECT 1 FROM ${table} WHERE id = ?${statusClause}`).get(target.id));
};
