/** Isometric projection math (world tile coords ⇄ iso pixel space at zoom 1). */
import { TH, TW } from './config';

export interface Pt {
  x: number;
  y: number;
}

export const iso = (x: number, y: number): Pt => ({ x: ((x - y) * TW) / 2, y: ((x + y) * TH) / 2 });

/** Inverse of iso(): iso-space pixels → world tile coords. */
export const unIso = (ix: number, iy: number): Pt => ({
  x: (ix / (TW / 2) + iy / (TH / 2)) / 2,
  y: (iy / (TH / 2) - ix / (TW / 2)) / 2,
});
