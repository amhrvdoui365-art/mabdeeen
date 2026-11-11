import { existsSync } from 'node:fs';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { clientDistDir, clientIndexFile, uploadsDir } from './config/paths';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { metricsMiddleware } from './middlewares/metrics.middleware';
import {
  ipBlockMiddleware,
  maintenanceMiddleware,
  sessionTrackingMiddleware,
} from './middlewares/system.middleware';
import { apiRouter } from './routes';
import { buildProfilePageHtml } from './services/seo.service';
import { asyncHandler } from './utils/async-handler';

export const app = express();

const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowAllOrigins = corsOrigins.includes('*');

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(metricsMiddleware);
app.use(ipBlockMiddleware);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", 'https://accounts.google.com'],
        connectSrc: ["'self'", 'https://accounts.google.com'],
        frameSrc: ["'self'", 'https:', 'http:', 'blob:'],
        mediaSrc: ["'self'", 'https:', 'blob:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }),
);
app.use(
  cors({
    origin: allowAllOrigins ? true : corsOrigins,
    credentials: !allowAllOrigins,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(sessionTrackingMiddleware);
app.use(maintenanceMiddleware);

app.use(
  '/uploads',
  express.static(uploadsDir, {
    maxAge: '30d',
    immutable: true,
  }),
);

app.use('/api', apiRouter);

if (existsSync(clientIndexFile)) {
  app.get(
    '/freelancers/:id',
    asyncHandler(async (req, res, next) => {
      const host = req.get('host') ?? 'localhost';
      const html = await buildProfilePageHtml(
        String(req.params.id),
        `${req.protocol}://${host}`,
      );

      if (!html) {
        next();
        return;
      }

      res.status(200).type('html').send(html);
    }),
  );

  app.use(express.static(clientDistDir));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      next();
      return;
    }

    res.sendFile(clientIndexFile);
  });
}

app.use(notFoundHandler);
app.use(errorHandler);
