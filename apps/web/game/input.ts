/** Pointer / pinch / wheel / tap input — ported verbatim from the prototype. */
import { BUILD, MAP, clamp, dist } from '@warchest/game-core';
import { deployAt } from './battle';
import { CAM, clampCam, cv, s2w, view, VP } from './camera';
import { SFX } from './sfx';
import { G, OCC } from './state';
import { collect } from './systems';
import { closeSheet, openSheet } from './ui/sheet';

interface Ptr {
  x: number;
  y: number;
}

export function initInput(): void {
  const canvas = cv();
  const PTRS = new Map<number, Ptr>();
  let pinch0: { d: number; z: number; ix: number; iy: number } | null = null;
  let downInfo: { x: number; y: number; t: number; moved: boolean } | null = null;

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    PTRS.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (PTRS.size === 1) {
      view.CAMT = null;
      downInfo = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    }
    canvas.classList.add('grabbing');
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = PTRS.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (PTRS.size === 2) {
      const [a, b] = [...PTRS.values()] as [Ptr, Ptr];
      const d = dist(a.x, a.y, b.x, b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (!pinch0)
        pinch0 = { d, z: CAM.z, ix: (mx - VP.W / 2) / CAM.z + CAM.x, iy: (my - VP.H / 2) / CAM.z + CAM.y };
      CAM.z = clamp((pinch0.z * d) / pinch0.d, CAM.min, CAM.max);
      CAM.x = pinch0.ix - (mx - VP.W / 2) / CAM.z;
      CAM.y = pinch0.iy - (my - VP.H / 2) / CAM.z;
      clampCam();
      return;
    }
    if (!downInfo) return;
    if (Math.abs(e.clientX - downInfo.x) + Math.abs(e.clientY - downInfo.y) > 7) downInfo.moved = true;
    if (G.mode === 'placing' && G.place) {
      const w = s2w(e.clientX, e.clientY);
      const s = BUILD[G.place.type].s;
      G.place.gx = clamp(Math.floor(w.x - s / 2 + 0.5), 0, MAP - s);
      G.place.gy = clamp(Math.floor(w.y - s / 2 + 0.5), 0, MAP - s);
      return;
    }
    if (downInfo.moved) {
      CAM.x -= dx / CAM.z;
      CAM.y -= dy / CAM.z;
      clampCam();
    }
  });

  const endPtr = (e: PointerEvent): void => {
    PTRS.delete(e.pointerId);
    if (PTRS.size < 2) pinch0 = null;
    canvas.classList.remove('grabbing');
    if (PTRS.size === 0 && downInfo) {
      const dt = performance.now() - downInfo.t;
      if (!downInfo.moved && dt < 400) tap(downInfo.x, downInfo.y);
      downInfo = null;
    }
  };
  canvas.addEventListener('pointerup', endPtr);
  canvas.addEventListener('pointercancel', endPtr);

  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const f = Math.pow(1.0016, -e.deltaY);
      const ix = (e.clientX - VP.W / 2) / CAM.z + CAM.x, iy = (e.clientY - VP.H / 2) / CAM.z + CAM.y;
      CAM.z = clamp(CAM.z * f, CAM.min, CAM.max);
      CAM.x = ix - (e.clientX - VP.W / 2) / CAM.z;
      CAM.y = iy - (e.clientY - VP.H / 2) / CAM.z;
      clampCam();
    },
    { passive: false },
  );
}

function tap(sx: number, sy: number): void {
  const w = s2w(sx, sy);
  const gx = Math.floor(w.x), gy = Math.floor(w.y);
  if (G.mode === 'placing' && G.place) {
    const s = BUILD[G.place.type].s;
    G.place.gx = clamp(Math.floor(w.x - s / 2 + 0.5), 0, MAP - s);
    G.place.gy = clamp(Math.floor(w.y - s / 2 + 0.5), 0, MAP - s);
    return;
  }
  if (G.mode === 'battle_deploy' || G.mode === 'battle') {
    deployAt(w.x, w.y);
    return;
  }
  if (gx < 0 || gy < 0 || gx >= MAP || gy >= MAP) {
    G.sel = null;
    closeSheet();
    return;
  }
  const id = OCC[gy * MAP + gx] ?? 0;
  if (id > 0) {
    const b = G.buildings.find((x) => x.id === id);
    if (!b) return;
    SFX.play('tap');
    if ((b.type === 'mine' || b.type === 'well') && (b.stored ?? 0) >= 5) {
      collect(b);
      G.sel = b.id;
      openSheet('info', b.id);
      return;
    }
    G.sel = b.id;
    openSheet('info', b.id);
  } else if (id < 0) {
    const ob = G.obstacles.find((o) => o.id === -id);
    if (ob && !ob.dead) {
      SFX.play('tap');
      G.sel = null;
      openSheet('obst', ob.id);
    }
  } else {
    G.sel = null;
    closeSheet();
  }
}
