/** Canvas viewport + isometric camera, ported verbatim from the prototype. */
import { MAP, PAD, TH, TW, clamp, iso } from '@warchest/game-core';

export interface CamTween {
  sx: number; sy: number; sz: number;
  x: number; y: number; z: number;
  t: number;
}

export interface Guide {
  gx: number; gy: number; s: number; h: number; until: number;
}

export const VP = { W: 0, H: 0, DPR: 1 };
export const CAM = { x: 0, y: (MAP * TH) / 2, z: 1, min: 0.45, max: 2.2 };
/** mutable holders for the camera tween + quest guide arrow */
export const view: { CAMT: CamTween | null; GUIDE: Guide | null } = { CAMT: null, GUIDE: null };

let cvEl: HTMLCanvasElement | null = null;
let ctxEl: CanvasRenderingContext2D | null = null;

export const cv = (): HTMLCanvasElement => {
  if (!cvEl) throw new Error('camera not initialised');
  return cvEl;
};
export const ctx2d = (): CanvasRenderingContext2D => {
  if (!ctxEl) throw new Error('camera not initialised');
  return ctxEl;
};

function resize(): void {
  VP.W = window.innerWidth;
  VP.H = window.innerHeight;
  VP.DPR = Math.min(window.devicePixelRatio || 1, 1.5); // 2.0 doubled the fill cost for little visible gain
  if (cvEl) {
    cvEl.width = VP.W * VP.DPR;
    cvEl.height = VP.H * VP.DPR;
    cvEl.style.width = VP.W + 'px';
    cvEl.style.height = VP.H + 'px';
  }
}

export function camMin(): number {
  return Math.max(0.36, VP.W / ((MAP + 2 * PAD - 2) * TW), VP.H / ((MAP + 2 * PAD - 2) * TH));
}

export function fitCam(): void {
  CAM.min = camMin();
  CAM.z = clamp(Math.min(VP.W / (MAP * TW * 0.8), VP.H / (MAP * TH * 0.9)), CAM.min, CAM.max);
  clampCam();
}

export function w2s(wx: number, wy: number): { x: number; y: number } {
  const p = iso(wx, wy);
  return { x: (p.x - CAM.x) * CAM.z + VP.W / 2, y: (p.y - CAM.y) * CAM.z + VP.H / 2 };
}

export function s2w(sx: number, sy: number): { x: number; y: number } {
  const ix = (sx - VP.W / 2) / CAM.z + CAM.x;
  const iy = (sy - VP.H / 2) / CAM.z + CAM.y;
  return { x: (ix / (TW / 2) + iy / (TH / 2)) / 2, y: (iy / (TH / 2) - ix / (TW / 2)) / 2 };
}

/** Edge-aware clamp: the void outside the decorated forest ring must never be visible. */
export function clampCam(): void {
  const hw = VP.W / (2 * CAM.z), hh = VP.H / (2 * CAM.z);
  const X = ((MAP + 2 * PAD) * TW) / 2 - 12, Y0 = -PAD * TH + 12, Y1 = (MAP + PAD) * TH - 12;
  CAM.x = X - hw <= -X + hw ? 0 : clamp(CAM.x, -X + hw, X - hw);
  const cy = (Y0 + Y1) / 2;
  CAM.y = Y1 - hh <= Y0 + hh ? cy : clamp(CAM.y, Y0 + hh, Y1 - hh);
}

const onResize = (): void => {
  resize();
  CAM.min = camMin();
  if (CAM.z < CAM.min) CAM.z = CAM.min;
  clampCam();
};

export function initCamera(canvas: HTMLCanvasElement): void {
  cvEl = canvas;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('no 2d context');
  ctxEl = c;
  window.addEventListener('resize', onResize);
  resize();
  fitCam();
}

export function disposeCamera(): void {
  window.removeEventListener('resize', onResize);
  cvEl = null;
  ctxEl = null;
}
