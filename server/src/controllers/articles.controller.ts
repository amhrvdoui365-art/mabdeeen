import type { Request, Response } from 'express';
import { getArticle, listArticles } from '../services/articles.service';
import { addArticleComment, getArticleComments, toggleArticleLike } from '../services/post-interactions.service';

export const list = async (req: Request, res: Response): Promise<void> => {
  const query = typeof req.query.q === 'string' ? req.query.q : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  res.status(200).json({ success: true, data: listArticles(query, category) });
};

export const detail = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: getArticle(String(req.params.slug), req.user?.id) });
};

export const comments = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: { items: getArticleComments(String(req.params.slug)) } });
};

export const comment = async (req: Request, res: Response): Promise<void> => {
  const result = await addArticleComment(String(req.params.slug), { id: req.user!.id, name: req.user!.name }, String(req.body.content ?? ''), req.file);
  res.status(201).json({ success: true, data: { comment: result } });
};

export const like = async (req: Request, res: Response): Promise<void> => {
  const result = toggleArticleLike(String(req.params.slug), { id: req.user!.id, name: req.user!.name });
  res.status(200).json({ success: true, data: result });
};
