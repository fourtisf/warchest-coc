import Link from 'next/link';

export default function Landing(): JSX.Element {
  return (
    <main className="landing">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mark" src="/logo.svg" alt="WARCHEST" width={132} height={132} />
      <h1 className="logo">WARCHEST</h1>
      <div className="tag">BUILD · RAID · EARN</div>
      <Link className="cta" href="/play" prefetch>
        ⚔️ Enter Village
      </Link>
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
      <div className="fine">$WAR is a utility token. Raid responsibly.</div>
    </main>
  );
}
