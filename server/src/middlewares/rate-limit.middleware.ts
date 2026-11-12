import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const windowMs = 15 * 60 * 1000;

export const authLimiter = rateLimit({
  windowMs,
  limit: env.NODE_ENV === 'production' ? 20 : 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'عدد المحاولات كبير، يرجى المحاولة بعد قليل',
  },
});

// Demo discovery and sign-in use an independent bucket so page loads and
// presentation logins do not consume the real account authentication budget.
export const demoLimiter = rateLimit({
  windowMs,
  limit: env.NODE_ENV === 'production' ? 60 : 2000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'عدد محاولات العرض التجريبي كبير، يرجى المحاولة بعد قليل',
  },
});

export const publicActionLimiter = rateLimit({
  windowMs,
  limit: env.NODE_ENV === 'production' ? 30 : 2000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'عدد المحاولات كبير، يرجى المحاولة بعد قليل',
  },
});

