'use client';
/**
 * Dev tool: contact sheet of every building at levels 1-10 — instant visual
 * regression check for the per-tier art themes. Not linked from anywhere;
 * open /artsheet directly.
 */
import { useEffect, useRef } from 'react';
import { BUILD, type BuildingType } from '@warchest/game-core';
import { ART } from '../../game/art/buildings';
import type { DrawableBuilding } from '../../game/art/drawable';

const TYPES: BuildingType[] = [
  'keep', 'barracks', 'arrow', 'cannon', 'mortar', 'airdef', 'lab', 'vault', 'tank',
  'mine', 'well', 'camp', 'hut', 'wall',
];

export default function ArtSheetPage() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    // solo mode (?solo=airdef&lv=10&px=760): one building, huge, transparent —
    // used to bake crisp marketing/promo art straight from the game renderer
    const qs = new URLSearchParams(location.search);
    const solo = qs.get('solo') as BuildingType | null;
    if (solo && BUILD[solo]) {
      const px = Number(qs.get('px') ?? 760);
      const lv = Math.min(Math.max(Number(qs.get('lv') ?? 10), 1), BUILD[solo].lv.length);
      cv.width = px;
      cv.height = px;
      const g = cv.getContext('2d')!;
      const s = BUILD[solo].s;
      const sc = (px / 220) * Number(qs.get('z') ?? 1);
      g.setTransform(sc, 0, 0, sc, px / 2, px * Number(qs.get('cy') ?? 0.72));
      const b: DrawableBuilding = { id: 7, type: solo, gx: -s / 2, gy: -s / 2, level: lv, hp: 1, stored: 0, _list: [] };
      try {
        ART[solo](g, b, 0.5);
      } catch (e) {
        console.error(solo, e);
      }
      return;
    }
    const CW = 160, CHT = 200;
    cv.width = CW * 10;
    cv.height = CHT * TYPES.length;
    const c = cv.getContext('2d')!;
    c.fillStyle = '#233a21';
    c.fillRect(0, 0, cv.width, cv.height);
    c.strokeStyle = 'rgba(255,255,255,.08)';
    for (let i = 1; i < 10; i++) {
      c.beginPath(); c.moveTo(i * CW, 0); c.lineTo(i * CW, cv.height); c.stroke();
    }
    TYPES.forEach((type, r) => {
      for (let lv = 1; lv <= 10; lv++) {
        const s = BUILD[type].s;
        c.save();
        c.beginPath();
        c.rect((lv - 1) * CW, r * CHT, CW, CHT);
        c.clip();
        c.translate((lv - 1) * CW + CW / 2, r * CHT + CHT * 0.8);
        const scale = type === 'keep' ? 0.55 : type === 'camp' ? 0.66 : type === 'arrow' ? 0.7 : 0.8;
        c.scale(scale, scale);
        const b: DrawableBuilding = {
          id: r * 16 + lv, type, gx: -s / 2, gy: -s / 2, level: lv, hp: 1, stored: 0, _list: [],
        };
        try {
          ART[type](c, b, 0.5);
        } catch (e) {
          console.error(type, lv, e);
        }
        c.restore();
        c.fillStyle = '#cfe3c8';
        c.font = 'bold 12px monospace';
        c.textAlign = 'center';
        c.fillText(`${type} L${lv}`, (lv - 1) * CW + CW / 2, r * CHT + CHT - 8);
      }
    });
  }, []);
  return <canvas ref={ref} style={{ display: 'block' }} />;
}
