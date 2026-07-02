'use client';

import { useEffect, useRef } from 'react';
import { bootGame } from './client';
import './game.css';

/**
 * Single mount point for the imperative game engine. React renders this once
 * and never re-renders it — the canvas loop, HUD and modals are driven
 * imperatively by game/client.ts (P0 quality bar: canvas isolated from React).
 */
export default function GameRoot(): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return bootGame(root);
  }, []);

  return <div className="wc-game" ref={rootRef} />;
}
