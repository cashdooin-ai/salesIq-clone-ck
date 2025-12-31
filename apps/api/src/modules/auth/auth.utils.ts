import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';

interface TokenPayload {
  userId: string;
  organizationId: string;
}

export async function signTokens(userId: string, organizationId: string) {
  const payload: TokenPayload = { userId, organizationId };

  const accessToken = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  return jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;
}
