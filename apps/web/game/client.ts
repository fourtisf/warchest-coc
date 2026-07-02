/**
 * Game bootstrap: injects the (verbatim) prototype markup, initialises every
 * subsystem, wires the UI, and runs the fixed-timestep main loop. React mounts
 * this exactly once — the loop is fully imperative and isolated from React.
 */
import { lerp } from '@warchest/game-core';
import {
  disposeBattle,
  endBattlePressed,
  exitBattle,
  openMatchmaking,
  rerollScout,
  startBattle,
  tickBattle,
} from './battle';
import { CAM, clampCam, disposeCamera, initCamera, view } from './camera';
import { $ } from './dom';
import { FX } from './fx';
import { buildGround } from './ground';
import { initInput } from './input';
import { GAME_MARKUP } from './markup';
import { render } from './render';
import { SFX } from './sfx';
import { freshState, G, jobOf, mkB, rebuildOcc, resetBid } from './state';
import { checkQuests, placeCancel, placeConfirm, tickJobs, tickProduction, tickTraining } from './systems';
import { world } from './world';
import { renderHUD } from './ui/hud';
import { fillWallet, initModals, openLeaderboard, openOv, openQuests } from './ui/modals';
import { initSheet, openSheet, refreshSheet, sheetInfoArg, sheetIs } from './ui/sheet';
import { toast } from './ui/toasts';

function initVillage(): void {
  Object.assign(G, freshState());
  resetBid();
  const S: ReadonlyArray<readonly [Parameters<typeof mkB>[0], number, number]> = [
    ['keep', 18, 18], ['mine', 24, 19], ['well', 13, 19], ['vault', 24, 14], ['tank', 13, 14],
    ['cannon', 19, 24], ['barracks', 12, 24], ['camp', 25, 24],
  ];
  for (const [t, x, y] of S) G.buildings.push(mkB(t, x, y, 1));
  for (let x = 17; x <= 22; x++) {
    G.buildings.push(mkB('wall', x, 17, 1));
    G.buildings.push(mkB('wall', x, 22, 1));
  }
  for (let y = 18; y <= 21; y++) {
    G.buildings.push(mkB('wall', 17, y, 1));
    G.buildings.push(mkB('wall', 22, y, 1));
  }
  let oid = 1;
  const OBS: ReadonlyArray<readonly ['tree' | 'rock', number, number]> = [
    ['tree', 6, 8], ['tree', 30, 6], ['tree', 8, 29], ['tree', 31, 30], ['tree', 26, 5],
    ['tree', 5, 20], ['tree', 33, 17], ['tree', 12, 33], ['rock', 28, 11], ['rock', 10, 12],
  ];
  for (const [k, x, y] of OBS) G.obstacles.push({ id: oid++, kind: k, gx: x, gy: y });
  // head start, as in the prototype
  const mine = G.buildings.find((b) => b.type === 'mine');
  if (mine) mine.stored = 120;
  const well = G.buildings.find((b) => b.type === 'well');
  if (well) well.stored = 120;
}

function wireButtons(): void {
  $('shopBtn').onclick = () => {
    SFX.play('tap');
    openSheet('shop');
  };
  $('armyBtn').onclick = () => {
    SFX.play('tap');
    openSheet('army');
  };
  $('builderChip').onclick = () => {
    SFX.play('tap');
    openSheet('jobs');
  };
  $('setBtn').onclick = () => openOv('settings');
  $('sfxToggle').onclick = () => {
    G.sfx = !G.sfx;
    $('sfxToggle').textContent = G.sfx ? 'On' : 'Off';
  };
  $('resetBtn').onclick = () => {
    if (confirm('Reset the village? Session progress will be lost.')) location.reload();
  };
  $('raidBtn').onclick = () => {
    SFX.play('tap');
    let tot = 0;
    for (const k in G.army) tot += G.army[k as keyof typeof G.army];
    if (tot <= 0) {
      toast('Train an army first', 'warn');
      openSheet('army');
      return;
    }
    openMatchmaking();
  };
  $('mmGo').onclick = () => startBattle();
  $('mmHome').onclick = () => $('mm').classList.remove('show');
  $('mmNext').onclick = () => rerollScout();
  $('endBattle').onclick = () => endBattlePressed();
  $('resHome').onclick = () => exitBattle();
  $('placeOK').onclick = () => placeConfirm();
  $('placeNO').onclick = () => placeCancel();
  $('introGo').onclick = () => {
    SFX.init();
    $('intro').classList.remove('show');
    SFX.play('done');
    toast('Tip: tap your Gold Mine to collect 🪙', 'ok');
  };
  $('walletBtn').onclick = () => {
    fillWallet();
    openOv('wallet');
  };
  $('lbBtn').onclick = () => openLeaderboard();
  $('questBtn').onclick = () => openQuests();
}

let hudAcc = 0;

function update(dt: number): void {
  G.t += dt;
  FX.update(dt);
  const CAMT = view.CAMT;
  if (CAMT) {
    CAMT.t += dt * 2;
    const k = Math.min(1, CAMT.t), e2 = k * k * (3 - 2 * k);
    CAM.x = lerp(CAMT.sx, CAMT.x, e2);
    CAM.y = lerp(CAMT.sy, CAMT.y, e2);
    CAM.z = lerp(CAMT.sz, CAMT.z, e2);
    clampCam();
    if (k >= 1) view.CAMT = null;
  }
  if (G.mode === 'battle' || G.mode === 'battle_deploy') tickBattle();
  tickProduction(dt);
  tickJobs(dt);
  tickTraining(dt);
  hudAcc += dt;
  if (hudAcc > 0.25) {
    hudAcc = 0;
    renderHUD();
    const infoArg = sheetInfoArg();
    if (sheetIs('army') || sheetIs('jobs') || (infoArg !== undefined && jobOf(infoArg))) refreshSheet();
  }
}

export function bootGame(root: HTMLElement): () => void {
  document.documentElement.classList.add('wc-play');
  root.innerHTML = GAME_MARKUP;
  initVillage();
  initCamera($('game') as unknown as HTMLCanvasElement);
  world.ground = buildGround();
  rebuildOcc();
  renderHUD();
  checkQuests();
  initSheet();
  initModals();
  initInput();
  wireButtons();

  let raf = 0;
  let last = performance.now(), accu = 0;
  const frame = (ts: number): void => {
    const el = Math.min(0.1, (ts - last) / 1000);
    last = ts;
    accu += el;
    while (accu >= 1 / 60) {
      update(1 / 60);
      accu -= 1 / 60;
    }
    render();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    disposeBattle();
    disposeCamera();
    world.ground = null;
    document.documentElement.classList.remove('wc-play');
    root.innerHTML = '';
  };
}
