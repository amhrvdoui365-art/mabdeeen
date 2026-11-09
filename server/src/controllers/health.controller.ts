import type { Request, Response } from 'express';
import { db } from '../config/db';

export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    db.prepare('SELECT 1').get();

    res.status(200).json({
      success: true,
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      success: false,
      status: 'degraded',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
};
