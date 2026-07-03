/**
 * Client battle controller (P2): the server scouts a target (real village
 * snapshot or procedural fallback) and validates the recorded deploy log by
 * re-simulating it with the same game-core code. The local sim is pure
 * prediction/rendering; rewards shown come from the SERVER outcome.
 */
import {
  BattleSim,
  MAP,
  SPELL,
  TH,
  TROOP_ORDER,
  TW,
  baseFromList,
  fmt,
  iso,
  type EnemyBase,
} from '@warchest/game-core';
import { api, hydrate, withVillage, type BattleOutcomeDto } from './api';
import { CAM, fitCam } from './camera';
import { $ } from './dom';
import { FX } from './fx';
import { MUSIC } from './music';
import { SFX } from './sfx';
import { G, rebuildOcc } from './state';
import { updateQuestBadge } from './systems';
import { groundOrThrow } from './world';
import { buildTroopBar, renderHUD, updBattleHUD } from './ui/hud';
import { closeSheet } from './ui/sheet';
import { closeOv, openOv, refreshMailBadge } from './ui/modals';
import { toast } from './ui/toasts';

interface Scout {
  battleId: string;
  base: EnemyBase;
}

let SCOUT: Scout | null = null;

async function fetchScout(rerollFrom?: string): Promise<void> {
  $('mmSpin').style.display = 'block';
  $('mmScout').style.display = 'none';
  try {
    const r = await api.scout(rerollFrom);
    hydrate(r.village);
    renderHUD();
    SCOUT = { battleId: r.battleId, base: baseFromList(r.list, r.seed, r.th, r.lootG + r.lootM) };
    $('mmTH').textContent = 'Level ' + r.th;
    $('mmG').textContent = fmt(r.lootG);
    $('mmM').textContent = fmt(r.lootM);
    $('mmSpin').style.display = 'none';
    $('mmScout').style.display = 'block';
  } catch (e) {
    closeOv('mm');
    toast(e instanceof Error ? e.message : 'Matchmaking failed', 'warn');
  }
}

export function openMatchmaking(): void {
  openOv('mm');
  void fetchScout();
}

export function rerollScout(): void {
  if (!SCOUT) return;
  void fetchScout(SCOUT.battleId);
}

export function startBattle(): void {
  if (!SCOUT) return;
  closeOv('mm');
  closeSheet();
  G.sel = null;
  const sim = new BattleSim(SCOUT.base, { ...G.army }, { ...G.spells });
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
  G.battle = { sim, base: SCOUT.base, sel: firstAvail, selSpell: null, red, battleId: SCOUT.battleId };
  G.mode = 'battle_deploy';
  MUSIC.setScene('battle');
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
  if (B.selSpell) {
    const s = B.selSpell;
    if (B.sim.spells[s] <= 0 || !B.sim.castSpell(s, wx, wy)) {
      SFX.play('err');
      return;
    }
    if (G.mode === 'battle_deploy') {
      G.mode = 'battle';
      $('deployHint').style.display = 'none';
    }
    if (B.sim.spells[s] <= 0) B.selSpell = null; // last one — back to troops
    buildTroopBar();
    return;
  }
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
      case 'spell':
        SFX.play(e.spell === 'bolt' ? 'mortar' : 'mana');
        FX.float(e.x, e.y, SPELL[e.spell].emoji, e.spell === 'rage' ? '#ff7a5c' : '#c9a6ff');
        break;
      case 'trap':
        SFX.play(e.kind === 'bomb' ? 'mortar' : 'deploy');
        FX.dust(e.x, e.y);
        if (e.kind === 'spring') FX.float(e.x, e.y, '🌀', '#8fd0ff');
        break;
      case 'heal':
        FX.float(e.x, e.y, '＋', '#3fe0a3');
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
        void submitResult();
        break;
    }
  }
  sim.events.length = 0;
}

/** "End Battle" button: abort silently before first deploy, otherwise finish + submit. */
export function endBattlePressed(): void {
  const B = G.battle;
  if (!B) return;
  if (!B.sim.started) {
    G.battle = null;
    SCOUT = null;
    exitBattleUI();
    return;
  }
  B.sim.requestEnd();
  drainEvents(B.sim);
}

/** POST the deploy log; the server re-simulates and returns the authoritative outcome. */
async function submitResult(): Promise<void> {
  const B = G.battle;
  if (!B) return;
  const local = B.sim.outcome();
  let outcome: BattleOutcomeDto = local;
  try {
    const r = await api.resolve(B.battleId, B.sim.log);
    outcome = r.outcome;
    hydrate(r.village);
  } catch (e) {
    toast(e instanceof Error ? e.message : 'Could not submit battle — rewards not applied', 'warn');
  }
  SCOUT = null;
  showResult(outcome);
}

function showResult(o: BattleOutcomeDto): void {
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
  updateQuestBadge();
  renderHUD();
}

export function exitBattle(): void {
  closeOv('result');
  G.battle = null;
  exitBattleUI();
}

export function exitBattleUI(): void {
  G.mode = 'village';
  MUSIC.setScene('village');
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
  void refreshMailBadge();
}

export function disposeBattle(): void {
  SCOUT = null;
}

// keep the /me poller honest while a raid is being played
export const inBattle = (): boolean => !!G.battle;
export { withVillage };
