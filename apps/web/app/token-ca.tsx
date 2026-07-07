'use client';
/** $WAR contract-address chip on the landing page.
 *  LAUNCH DAY: paste the live mint address into WAR_CA below — the chip flips
 *  from "COMING SOON" to a tap-to-copy CA automatically. */
import { useState } from 'react';

const WAR_CA = 'HDifg6Dr6zhfEfFHDr2o4xspJzxeydSDLK4fw2zGpump';

export default function TokenCa(): JSX.Element {
  const [flash, setFlash] = useState<string | null>(null);
  const live = WAR_CA.length > 0;
  const short = live ? `${WAR_CA.slice(0, 4)}…${WAR_CA.slice(-4)}` : '';

  const blip = (msg: string): void => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2200);
  };
  const onClick = (): void => {
    if (!live) {
      blip('Dropping soon — follow @Warchestfun 👀');
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(WAR_CA).then(
        () => blip('Copied ✓'),
        () => prompt('$WAR contract address:', WAR_CA),
      );
    } else {
      prompt('$WAR contract address:', WAR_CA);
    }
  };

  return (
    <button
      type="button"
      className={`ca-chip${live ? ' live' : ''}`}
      onClick={onClick}
      title={live ? 'Tap to copy the $WAR contract address' : '$WAR contract address — dropping soon'}
    >
      <span className="ca-label">◆ $WAR CA</span>
      {flash ? (
        <span className="ca-flash">{flash}</span>
      ) : live ? (
        <span className="ca-value">
          {short} <span className="ca-copy">⧉</span>
        </span>
      ) : (
        <span className="ca-soon">
          COMING SOON<span className="ca-dot" />
        </span>
      )}
    </button>
  );
}
