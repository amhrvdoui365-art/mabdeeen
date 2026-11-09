import { app } from './app';
import { closeDatabase, db } from './config/db';
import { env } from './config/env';
import { recordUncaughtError } from './middlewares/metrics.middleware';

const server = app.listen(env.PORT, () => {
  console.log(`API running at http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

try {
  db.prepare('SELECT 1').get();
  console.log('Connected to local SQLite database');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Database connection failed:', message);
}

let isShuttingDown = false;

const shutdown = (signal: string): void => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received, shutting down gracefully...`);

  server.close(() => {
    try {
      closeDatabase();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error while closing database:', message);
    } finally {
      process.exit(0);
    }
  });

  setTimeout(() => {
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  recordUncaughtError();
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (error) => {
  recordUncaughtError();
  console.error('Uncaught exception:', error);
  shutdown('uncaughtException');
});
