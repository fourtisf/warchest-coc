/**
 * Client battle controller: matchmaking (scouting), driving the shared
 * game-core BattleSim, mapping sim events to FX/SFX, and the result flow.
 * The client renders sim state directly — the same sim code re-validates the
 * recorded deploy log server-side in P2.
 */
import {
  BattleSim,
  MAP,
  NEXT_COST,
  TH,
  TROOP_ORDER,
  TW,
  fmt,
  genEnemy,
  iso,
  nextSeed,
  type EnemyBase,
  type TroopType,
} from '@warchest/game-core';
import { CAM, fitCam } from './camera';
import { $ } from './dom';
import { FX } from './fx';
import { SFX } from './sfx';
import { G, addRes, keepLv, pay, rebuildOcc } from './state';
import { checkQuests } from './systems';
import { groundOrThrow } from './world';
import { buildTroopBar, renderHUD, updBattleHUD } from './ui/hud';
import { closeSheet } from './ui/sheet';
import { closeOv, openOv } from './ui/modals';
import { toast } from './ui/toasts';

let SCOUT: EnemyBase | null = null;
let mmTimer: ReturnType<typeof setTimeout> | null = null;

export function newScout(): void {
  G.seed = nextSeed(G.seed);
  SCOUT = genEnemy(G.seed, keepLv());
  $('mmTH').textContent = 'Level ' + SCOUT.th;
  $('mmG').textContent = fmt(SCOUT.list.reduce((a, b) => a + b.lootG, 0));
  $('mmM').textContent = fmt(SCOUT.list.reduce((a, b) => a + b.lootM, 0));
}

export function openMatchmaking(): void {
  openOv('mm');
  $('mmSpin').style.display = 'block';
  $('mmScout').style.display = 'none';
  mmTimer = setTimeout(() => {
    newScout();
    $('mmSpin').style.display = 'none';
    $('mmScout').style.display = 'block';
  }, 900);
}

export function rerollScout(): void {
  if (!pay(NEXT_COST, 'g')) {
    toast('Not enough Gold', 'warn');
    return;
  }
  renderHUD();
  $('mmSpin').style.display = 'block';
  $('mmScout').style.display = 'none';
  mmTimer = setTimeout(() => {
    newScout();
    $('mmSpin').style.display = 'none';
    $('mmScout').style.display = 'block';
  }, 500);
}

export function startBattle(): void {
  if (!SCOUT) return;
  closeOv('mm');
  closeSheet();
  G.sel = null;
  const sim = new BattleSim(SCOUT, { ...G.army });
  // red no-deploy overlay, baked once over the ground canvas space
  const ground = groundOrThrow();
  const red = document.createElement('canvas');
  red.width = ground.cv.width;
  red.height = ground.cv.height;
  const rc = red.getContext('2d')!;
  rc.translate(ground.ox, ground.oy);
  rc.fillStyle = 'rgba(224,60,60,.22)';
  for (let y = 0; y < MAP; y++)
    for (let x = 0; x < MAP; x++)
      if (!sim.deployOK[y * MAP + x]) {
        const p = iso(x, y);
        rc.beginPath();
        rc.moveTo(p.x, p.y);
        rc.lineTo(p.x + TW / 2, p.y + TH / 2);
        rc.lineTo(p.x, p.y + TH);
        rc.lineTo(p.x - TW / 2, p.y + TH / 2);
        rc.closePath();
        rc.fill();
      }
  const firstAvail = TROOP_ORDER.find((t) => G.army[t] > 0) ?? 'raider';
  G.battle = { sim, base: SCOUT, sel: firstAvail, red };
  G.mode = 'battle_deploy';
  $('hudTop').style.display = 'none';
  $('dock').style.display = 'none';
  $('battleTop').style.display = 'flex';
  $('deployHint').style.display = 'block';
  $('troopBar').style.display = 'flex';
  buildTroopBar();
  updBattleHUD();
  CAM.x = 0;
  CAM.y = (MAP * TH) / 2;
  fitCam();
}

export function deployAt(wx: number, wy: number): void {
  const B = G.battle;
  if (!B || B.sim.over) return;
  const t = B.sel;
  if (!t || B.sim.army[t] <= 0) {
    SFX.play('err');
    return;
  }
  if (!B.sim.deploy(t, wx, wy)) {
    SFX.play('err');
    return;
  }
  if (G.mode === 'battle_deploy') {
    G.mode = 'battle';
    $('deployHint').style.display = 'none';
  }
  if (B.sim.army[t] <= 0) {
    const nx = TROOP_ORDER.find((k) => B.sim.army[k] > 0);
    if (nx) B.sel = nx;
  }
  buildTroopBar();
}

/** One fixed 1/60 step of the battle + event → FX/SFX mapping. */
export function tickBattle(): void {
  const B = G.battle;
  if (!B || B.sim.over) return;
  B.sim.step();
  drainEvents(B.sim);
  updBattleHUD();
}

function drainEvents(sim: BattleSim): void {
  for (const e of sim.events) {
    switch (e.k) {
      case 'deploy':
        SFX.play('deploy');
        FX.dust(e.x, e.y);
        break;
      case 'melee-hit':
      case 'building-hit':
        FX.hit(e.x, e.y);
        break;
      case 'proj':
        SFX.play(e.kind === 'arrow' ? 'arrowS' : e.kind === 'ball' ? 'shoot' : 'mortar');
        break;
      case 'boom':
        FX.boom(e.x, e.y, e.big);
        break;
      case 'loot':
        if (e.g) FX.float(e.x, e.y, '🪙 +' + fmt(e.g), '#ffd977');
        if (e.m) FX.float(e.x, e.y - 1, '🔮 +' + fmt(e.m), '#c9a6ff');
        break;
      case 'star':
        SFX.play('star');
        break;
      case 'troop-died':
        FX.dust(e.x, e.y);
        break;
      case 'ended':
        showResult(sim);
        break;
    }
  }
  sim.events.length = 0;
}

/** "End Battle" button: abort silently before first deploy, otherwise finish + show results. */
export function endBattlePressed(): void {
  const B = G.battle;
  if (!B) return;
  if (!B.sim.started) {
    G.battle = null;
    exitBattleUI();
    return;
  }
  B.sim.requestEnd();
  drainEvents(B.sim);
}

function showResult(sim: BattleSim): void {
  const o = sim.outcome();
  G.trophies = Math.max(0, G.trophies + o.trophyDelta);
  addRes('g', o.lootG, true);
  addRes('m', o.lootM, true);
  if (o.warEarned) addRes('w', o.warEarned, true);
  G.army = { ...sim.army };
  G.stat.raids++;
  if (o.win) G.stat.wins++;
  G.stat.stars += o.stars;
  if (o.stars === 3) G.stat.threeStar++;
  G.stat.lootG += o.lootG;
  G.stat.lootM += o.lootM;
  // result modal
  const stars = $('resStars').children;
  for (let i = 0; i < 3; i++) {
    stars[i]!.classList.remove('on');
    (stars[i] as HTMLElement).style.animationDelay = i * 0.28 + 's';
  }
  setTimeout(() => {
    for (let i = 0; i < o.stars; i++) stars[i]!.classList.add('on');
  }, 60);
  $('resTitle').textContent = o.win ? (o.stars === 3 ? 'Total Victory!' : 'Victory!') : 'Raid Failed';
  $('resTitle').style.color = o.win ? 'var(--gold2)' : 'var(--bad)';
  $('resPct').textContent = Math.floor(o.pct) + '% destroyed';
  $('resG').textContent = fmt(o.lootG);
  $('resM').textContent = fmt(o.lootM);
  $('resW').textContent = String(o.warEarned);
  $('resT').textContent = (o.trophyDelta >= 0 ? '+' : '') + o.trophyDelta;
  openOv('result');
  SFX.play(o.win ? 'win' : 'lose');
  checkQuests();
  renderHUD();
}

export function exitBattle(): void {
  closeOv('result');
  G.battle = null;
  exitBattleUI();
}

export function exitBattleUI(): void {
  G.mode = 'village';
  $('hudTop').style.display = 'flex';
  $('dock').style.display = 'flex';
  $('battleTop').style.display = 'none';
  $('deployHint').style.display = 'none';
  $('troopBar').style.display = 'none';
  CAM.x = 0;
  CAM.y = (MAP * TH) / 2;
  fitCam();
  rebuildOcc();
  renderHUD();
}

export function disposeBattle(): void {
  if (mmTimer) clearTimeout(mmTimer);
  mmTimer = null;
  SCOUT = null;
}
