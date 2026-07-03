'use client';
/** Live player counters on the landing page — polls the public /api/stats. */
import { useEffect, useState } from 'react';

interface Stats {
  players: number;
  online: number;
}

const fmt = (n: number): string => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));

export default function LiveStats(): JSX.Element | null {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    let dead = false;
    const load = (): void => {
      fetch('/api/stats')
        .then((r) => (r.ok ? (r.json() as Promise<Stats>) : null))
        .then((s) => {
          if (!dead && s) setStats(s);
        })
        .catch(() => {
          /* stats are decorative — fail silently */
        });
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);
  if (!stats) return null;
  return (
    <div className="stats">
      <span className="stat-pill">⚔️ {fmt(stats.players)} commanders</span>
      <span className="stat-pill live">
        <i /> {fmt(stats.online)} online now
      </span>
    </div>
  );
}
