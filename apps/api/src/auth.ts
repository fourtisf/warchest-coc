/** JWT session (cookie) + SIWS-style wallet signature login. */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SignJWT, jwtVerify } from 'jose';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { ENV } from './env';

const secret = new TextEncoder().encode(ENV.JWT_SECRET);
export const COOKIE = 'wc_session';

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('180d')
    .sign(secret);
}

export async function userIdFromRequest(req: FastifyRequest): Promise<string | null> {
  const token = req.cookies[COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.uid === 'string' ? payload.uid : null;
  } catch {
    return null;
  }
}

export function setSessionCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 180 * 24 * 3600,
  });
}

/** The exact message the wallet signs (client builds the same string). */
export function siwsMessage(wallet: string, nonce: string): string {
  return `WARCHEST wants you to sign in with your Solana account:\n${wallet}\n\nDomain: ${ENV.WARCHEST_DOMAIN}\nNonce: ${nonce}`;
}

export function verifyWalletSignature(wallet: string, nonce: string, signatureB58: string): boolean {
  try {
    const msg = new TextEncoder().encode(siwsMessage(wallet, nonce));
    const sig = bs58.decode(signatureB58);
    const pub = bs58.decode(wallet);
    return nacl.sign.detached.verify(msg, sig, pub);
  } catch {
    return false;
  }
}
