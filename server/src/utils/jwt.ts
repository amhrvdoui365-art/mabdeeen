import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { TokenPayload } from '../types/auth';

export const signToken = (payload: TokenPayload, expiresIn = env.JWT_EXPIRES_IN): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: expiresIn as SignOptions['expiresIn'],
  });
};

export const verifyToken = (token: string): TokenPayload & JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload & JwtPayload;
};
