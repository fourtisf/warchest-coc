import Link from 'next/link';
import LiveStats from './live-stats';
import TokenCa from './token-ca';
import VillageBackdrop from './village-backdrop';

export default function Landing(): JSX.Element {
  return (
    <main className="landing">
      <VillageBackdrop />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mark" src="/logo.svg" alt="WARCHEST" width={132} height={132} />
      <h1 className="logo">WARCHEST</h1>
      <div className="tag">BUILD · RAID · EARN</div>
      <TokenCa />
      <Link className="cta" href="/play" prefetch>
        ⚔️ Enter Village
      </Link>
      <LiveStats />
      <div className="feats">
        <div className="feat">
          <b>🏰 Build your warcamp</b>
          Mine Gold, harvest Mana, wall it all in before raiders come knocking.
        </div>
        <div className="feat">
          <b>⚔️ Raid enemy bases</b>
          Train an army, deploy at the edges, and let the AI fight. Three stars, full loot.
        </div>
        <div className="feat">
          <b>◆ Earn $WAR on-chain</b>
          Raids and quests pay out $WAR on Solana — spend it to rush timers or hire builders.
        </div>
      </div>
      <div className="links">
        <a
          className="xlink"
          href="https://x.com/Warchestfun"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow WARCHEST on X"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Follow @Warchestfun
        </a>
        <a
          className="xlink"
          href="https://t.me/warchestfun"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Join WARCHEST on Telegram"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          Join Telegram
        </a>
      </div>
      <div className="fine">$WAR is a utility token. Raid responsibly.</div>
    </main>
  );
}
