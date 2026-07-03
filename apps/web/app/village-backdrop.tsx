'use client';
/**
 * Living village backdrop for the landing page — rendered with the game's own
 * procedural art (zero assets): waving flags, flickering fires, the works.
 */
import { useEffect, useRef } from 'react';
import { TH, TW, iso, type BuildingType } from '@warchest/game-core';
import { ART } from '../game/art/buildings';
import { OBST_ART } from '../game/art/obstacles';
import type { DrawableBuilding, DrawableObstacle } from '../game/art/drawable';

interface SceneB {
  type: BuildingType;
  gx: number;
  gy: number;
  level: number;
}

const SCENE: SceneB[] = [
  { type: 'keep', gx: 12, gy: 21, level: 5 },
  { type: 'well', gx: 15, gy: 26, level: 3 },
  { type: 'tank', gx: 10, gy: 16, level: 2 },
  { type: 'barracks', gx: 11, gy: 27, level: 3 },
  { type: 'cannon', gx: 23, gy: 27, level: 3 },
  { type: 'vault', gx: 24, gy: 12, level: 2 },
  { type: 'mine', gx: 27, gy: 16, level: 3 },
  { type: 'arrow', gx: 29, gy: 19, level: 4 },
  { type: 'mortar', gx: 25, gy: 23, level: 2 },
  { type: 'camp', gx: 29, gy: 23, level: 3 },
];

const TREES: Array<[number, number]> = [
  [7, 13], [8, 24], [9, 29], [18, 29], [26, 28], [31, 26], [33, 17], [28, 10], [21, 9], [14, 9], [6, 19], [32, 21],
];

export default function VillageBackdrop(): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    // walls ring the keep, auto-connecting within the scene list
    const walls: SceneB[] = [];
    for (let x = 11; x <= 16; x++) walls.push({ type: 'wall', gx: x, gy: 20, level: 3 }, { type: 'wall', gx: x, gy: 25, level: 3 });
    for (let y = 21; y <= 24; y++) walls.push({ type: 'wall', gx: 11, gy: y, level: 3 }, { type: 'wall', gx: 16, gy: y, level: 3 });
    const list: DrawableBuilding[] = [...SCENE, ...walls].map((b, i) => ({
      id: i + 1, type: b.type, gx: b.gx, gy: b.gy, level: b.level, hp: 1, maxhp: 1, stored: 320,
    }));
    for (const b of list) (b as { _list?: DrawableBuilding[] })._list = list;
    const obst: DrawableObstacle[] = TREES.map(([gx, gy], i) => ({ id: 900 + i, kind: 'tree', gx, gy }));
    const items = [
      ...list.map((b) => ({ z: b.gx + b.gy + (b.type === 'wall' ? 1 : 3), draw: (t: number) => ART[b.type](ctx, b, t) })),
      ...obst.map((o) => ({ z: o.gx + o.gy + 1, draw: (t: number) => OBST_ART[o.kind](ctx, o, t) })),
    ].sort((a, b) => a.z - b.z);

    let ground: HTMLCanvasElement | null = null;
    let scale = 1;
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    const rebuild = (): void => {
      const w = window.innerWidth, h = window.innerHeight;
      cv.width = Math.floor(w * DPR);
      cv.height = Math.floor(h * DPR);
      cv.style.width = w + 'px';
      cv.style.height = h + 'px';
      scale = Math.min(1.3, Math.max(0.75, w / 1500));
      // pre-render the grass diamonds once per resize
      ground = document.createElement('canvas');
      ground.width = cv.width;
      ground.height = cv.height;
      const g = ground.getContext('2d')!;
      applyCamera(g, w, h);
      for (let gy = -14; gy < 54; gy++)
        for (let gx = -14; gx < 54; gx++) {
          const p = iso(gx, gy);
          g.fillStyle = (gx + gy) % 2 ? '#7bb558' : '#74ad52';
          g.beginPath();
          g.moveTo(p.x, p.y);
          g.lineTo(p.x + TW / 2, p.y + TH / 2);
          g.lineTo(p.x, p.y + TH);
          g.lineTo(p.x - TW / 2, p.y + TH / 2);
          g.closePath();
          g.fill();
        }
    };

    const applyCamera = (c: CanvasRenderingContext2D, w: number, h: number): void => {
      const center = iso(20, 20);
      c.setTransform(DPR * scale, 0, 0, DPR * scale, DPR * (w / 2 - center.x * scale), DPR * (h * 0.62 - center.y * scale));
    };

    rebuild();
    window.addEventListener('resize', rebuild);

    let raf = 0;
    const frame = (ms: number): void => {
      const t = ms / 1000;
      const w = window.innerWidth, h = window.innerHeight;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (ground) ctx.drawImage(ground, 0, 0);
      applyCamera(ctx, w, h);
      for (const it of items) {
        try {
          it.draw(t);
        } catch {
          /* decorative — a bad frame must never break the landing */
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', rebuild);
    };
  }, []);

  return <canvas ref={ref} className="bgvillage" aria-hidden />;
}
