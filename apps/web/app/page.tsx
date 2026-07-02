import Link from 'next/link';

export default function Landing(): JSX.Element {
  return (
    <main className="landing">
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
      <div className="fine">$WAR is a utility token. Raid responsibly.</div>
    </main>
  );
}
