/** Icon baker — renders building / troop art into cached offscreen canvases (prototype getIcon/iconHTML). */
import { BUILD, TH, TW, type BuildingType, type TroopType } from '@warchest/game-core';
import { ART } from './buildings';
import { UNIT_ART } from './units';
import type { DrawableBuilding, DrawableUnit } from './drawable';

const ICON: Record<string, HTMLCanvasElement> = {};
const ICON_URL: Record<string, string> = {};

export function getIcon(kind: 'b' | 't', key: string): HTMLCanvasElement {
  const k = kind + ':' + key;
  const hit = ICON[k];
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 150; c.height = 104;
  const g = c.getContext('2d')!;
  if (kind === 'b') {
    const bKey = key as BuildingType;
    const s = BUILD[bKey].s;
    const HH: Record<string, number> = { keep: 128, arrow: 106, tank: 80, mine: 78, well: 64, vault: 62, cannon: 60, mortar: 52, barracks: 74, camp: 62, hut: 56, wall: 32, bomb: 26, spring: 24, airdef: 74, lab: 70 };
    const sc = Math.min(112 / ((s + 1.1) * TW), 78 / (s * TH * 0.9 + (HH[key] ?? 66)));
    g.setTransform(sc, 0, 0, sc, 75, 96);
    const dummy: DrawableBuilding = { id: 9000, type: bKey, gx: -s / 2, gy: -s / 2, level: 1, hp: 1, stored: 0, _list: [] };
    try { ART[bKey](g, dummy, 0.6); } catch { /* icon bake best-effort, as in prototype */ }
  } else {
    const tKey = key as TroopType;
    g.setTransform(2.6, 0, 0, 2.6, 75, 92);
    const dummy: DrawableUnit = { id: 1, type: tKey, x: 0, y: 0, hp: 1, maxhp: 1, moving: false, swing: 0 };
    try { UNIT_ART[tKey](g, dummy, 0.4, 0); } catch { /* icon bake best-effort, as in prototype */ }
  }
  ICON[k] = c;
  return c;
}

export function iconHTML(kind: 'b' | 't', key: string): string {
  // PNG-encoding on every sheet repaint was measurably expensive — cache the
  // data URL alongside the canvas (icons never change once baked)
  const k = kind + ':' + key;
  let url = ICON_URL[k];
  if (!url) {
    url = getIcon(kind, key).toDataURL();
    ICON_URL[k] = url;
  }
  return `<img src="${url}" width="150" height="104" style="width:100%;height:74px;object-fit:contain;border-radius:9px;background:radial-gradient(circle at 50% 30%,#27354d,#141b26)">`;
}
