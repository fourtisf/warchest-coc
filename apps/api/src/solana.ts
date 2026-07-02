/** Solana helpers: hot wallet, $WAR SPL transfers (devnet first). */
import { readFileSync } from 'node:fs';
import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  transferChecked,
} from '@solana/spl-token';
import { ENV, rpcUrl } from './env';

export const WAR_DECIMALS = 6;

export function connection(): Connection {
  return new Connection(rpcUrl(), 'confirmed');
}

export function loadHotWallet(): Keypair {
  const raw = JSON.parse(readFileSync(ENV.HOT_WALLET_KEYPAIR, 'utf8')) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

/** Send `amount` whole ◆ to `toWallet`; returns the tx signature. */
export async function sendWar(amount: number, toWallet: string): Promise<string> {
  const conn = connection();
  const hot = loadHotWallet();
  const mint = new PublicKey(ENV.WAR_MINT);
  const to = new PublicKey(toWallet);
  const fromAta = await getOrCreateAssociatedTokenAccount(conn, hot, mint, hot.publicKey);
  const toAta = await getOrCreateAssociatedTokenAccount(conn, hot, mint, to);
  const base = BigInt(amount) * 10n ** BigInt(WAR_DECIMALS);
  return transferChecked(conn, hot, fromAta.address, mint, toAta.address, hot, base, WAR_DECIMALS);
}
