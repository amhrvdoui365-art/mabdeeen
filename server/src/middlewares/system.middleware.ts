import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { getSystemStatus, isRequestBlocked, trackRequestSession } from '../services/system.service';
import { verifyToken } from '../utils/jwt';

const TRACKED_PREFIX = '/api/';
const WRITE_COOLDOWN_MS = 30_000;

const exemptPaths = new Set(['/api/health', '/api/system/status']);

const lastWriteAt = new Map<string, number>();

const readToken = (req: Request): string | null => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice(7).trim() || null;
};

const readPayload = (req: Request) => {
  const token = readToken(req);

  if (!token) {
    return null;
  }

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
};

export const ipBlockMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip ?? '';

  if (ip && isRequestBlocked(ip)) {
    res.status(403).json({
      success: false,
      code: 'IP_BLOCKED',
      message: 'تم حظر هذا العنوان من الوصول للمنصة. تواصل مع الإدارة.',
    });
    return;
  }

  next();
};

export const maintenanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const status = getSystemStatus();

  if (!status.maintenanceEnabled) {
    next();
    return;
  }

  const path = req.path;

  if (exemptPaths.has(path) || path.startsWith('/api/auth/') || path.startsWith('/uploads/')) {
    next();
    return;
  }

  const payload = readPayload(req);

  if (payload?.role === 'Admin' && (!payload.demo || (payload.fullDemoAdmin && env.DEMO_ADMIN_FULL_ACCESS === 'true'))) {
    next();
    return;
  }

  if (path.startsWith(TRACKED_PREFIX)) {
    res.status(503).json({
      success: false,
      code: 'MAINTENANCE',
      message: status.maintenanceMessage,
      data: { returnsAt: status.maintenanceReturnsAt },
    });
    return;
  }

  next();
};

export const sessionTrackingMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.method === 'OPTIONS' || !req.path.startsWith(TRACKED_PREFIX)) {
    next();
    return;
  }

  const payload = readPayload(req);
  const userId = payload?.role === 'Admin' && !payload.demo && payload.sub ? null : (payload?.sub ?? null);
  const ip = req.ip ?? 'unknown';
  const userAgent = req.get('user-agent') ?? '';
  const key = `${userId ?? 'anon'}|${ip}`;
  const now = Date.now();
  const last = lastWriteAt.get(key);

  if (last !== undefined && now - last < WRITE_COOLDOWN_MS) {
    next();
    return;
  }

  if (lastWriteAt.size > 2000) {
    lastWriteAt.clear();
  }

  lastWriteAt.set(key, now);

  try {
    trackRequestSession({ userId, ip, userAgent });
  } catch (error) {
    console.error('Failed to track session:', error);
  }

  next();
};
