import { Router } from 'express';
import { changePassword, completeGoogleProfile, githubCallback, githubStart, googleCallback, googleNonce, googleStart, googleVerify, login, me, register, stopImpersonation } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authLimiter } from '../middlewares/rate-limit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { changePasswordSchema, googleCredentialSchema, googleProfileCompletionSchema, loginSchema, registerSchema } from '../validators/auth.validator';

export const authRouter = Router();

authRouter.get('/google', authLimiter, googleStart);
authRouter.get('/google/callback', googleCallback);
authRouter.get('/google/nonce', authLimiter, googleNonce);
authRouter.post('/google/verify', authLimiter, validate({ body: googleCredentialSchema }), asyncHandler(googleVerify));
authRouter.get('/github', authLimiter, githubStart);
authRouter.get('/github/callback', githubCallback);
authRouter.patch(
  '/google/complete-profile',
  authenticate,
  validate({ body: googleProfileCompletionSchema }),
  asyncHandler(completeGoogleProfile),
);

authRouter.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(register),
);

authRouter.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(login),
);

authRouter.get('/me', authenticate, asyncHandler(me));
authRouter.post('/impersonation/stop', authenticate, asyncHandler(stopImpersonation));
authRouter.post('/change-password', authLimiter, authenticate, validate({ body: changePasswordSchema }), asyncHandler(changePassword));
