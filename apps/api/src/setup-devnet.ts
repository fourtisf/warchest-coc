/**
 * One-shot devnet bootstrap: hot wallet keypair + $WAR mint + initial float.
 * Appends WAR_MINT / TREASURY_ATA / CLAIM_MODE=chain to the env file.
 * Usage: pnpm --filter @warchest/api setup:devnet [envFile]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { ENV } from './env';
import { WAR_DECIMALS, connection } from './solana';

const envFile = process.argv[2] ?? '/var/www/warchest/.env';

async function main(): Promise<void> {
  if (ENV.SOLANA_CLUSTER !== 'devnet') {
    console.error('setup:devnet only runs with SOLANA_CLUSTER=devnet');
    process.exit(1);
  }
  // 1. hot wallet
  let hot: Keypair;
  if (existsSync(ENV.HOT_WALLET_KEYPAIR)) {
    hot = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(readFileSync(ENV.HOT_WALLET_KEYPAIR, 'utf8')) as number[]),
    );
    console.log('hot wallet exists:', hot.publicKey.toBase58());
  } else {
    hot = Keypair.generate();
    mkdirSync(dirname(ENV.HOT_WALLET_KEYPAIR), { recursive: true, mode: 0o700 });
    writeFileSync(ENV.HOT_WALLET_KEYPAIR, JSON.stringify([...hot.secretKey]), { mode: 0o600 });
    console.log('hot wallet created:', hot.publicKey.toBase58());
  }
  const conn = connection();
  // 2. devnet SOL for fees
  const bal = await conn.getBalance(hot.publicKey);
  if (bal < 0.5 * LAMPORTS_PER_SOL) {
    console.log('requesting devnet airdrop…');
    try {
      const sig = await conn.requestAirdrop(hot.publicKey, 2 * LAMPORTS_PER_SOL);
      await conn.confirmTransaction(sig, 'confirmed');
      console.log('airdrop confirmed');
    } catch (e) {
      console.error('airdrop failed (rate limit?) — fund manually:', hot.publicKey.toBase58());
      if (bal === 0) process.exit(1);
    }
  }
  // 3. mint
  if (ENV.WAR_MINT) {
    console.log('WAR_MINT already configured:', ENV.WAR_MINT);
    return;
  }
  const mint = await createMint(conn, hot, hot.publicKey, null, WAR_DECIMALS);
  const ata = await getOrCreateAssociatedTokenAccount(conn, hot, mint, hot.publicKey);
  await mintTo(conn, hot, mint, ata.address, hot, 1_000_000n * 10n ** BigInt(WAR_DECIMALS));
  console.log('WAR mint:', mint.toBase58());
  console.log('treasury ATA:', ata.address.toBase58());
  const lines = `\n# added by setup:devnet\nWAR_MINT=${mint.toBase58()}\nTREASURY_ATA=${ata.address.toBase58()}\nCLAIM_MODE=chain\n`;
  if (existsSync(envFile)) appendFileSync(envFile, lines);
  else console.log('add to your env:', lines);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
