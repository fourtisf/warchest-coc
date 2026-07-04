/** Bottom sheet (shop / army / info / obstacle / builders) — ported verbatim. */
import {
  BUILD,
  OBSTACLE_COST,
  SHOP_ORDER,
  SPELL,
  SPELL_CAP,
  SPELL_ORDER,
  TROOP,
  TROOP_ORDER,
  fmt,
  tstr,
  type BuildingType,
  type ResourceKey,
  type SpellType,
  type TroopType,
} from '@warchest/game-core';
import { prodPerSec } from '../api';
import { iconHTML } from '../art/icons';
import { $ } from '../dom';
import {
  G,
  MAX_BUILDERS,
  armyCap,
  clearingObstacles,
  countOf,
  freeBuilders,
  housingUsed,
  jobOf,
  keepLv,
  maxBarracksLv,
  nowMs,
} from '../state';
import {
  brewSpell,
  canUpgrade,
  clearObstacle,
  finishNow,
  rushTraining,
  startMove,
  startPlace,
  startUpgrade,
  trainTroop,
  uiBuildSeconds,
  uiFinishCost,
  uiTrainSeconds,
} from '../systems';

export type SheetKind = 'shop' | 'army' | 'info' | 'obst' | 'jobs';

interface SheetState {
  kind: SheetKind;
  arg?: number;
}

let SHEET: SheetState | null = null;
export let SHEET_HL: string | null = null;
export function setSheetHL(hl: string | null): void {
  SHEET_HL = hl;
}

/**
 * Re-render guard. Sheets with live countdowns refresh 4×/s via innerHTML,
 * which destroys the pressed button between pointerdown and click — the
 * browser then never dispatches the click ("press Finish Now five times"
 * bug). While a pointer is down inside the sheet we defer re-renders; the
 * deferred paint runs after the tap's click event has been delivered.
 */
let pressing = false;
let pendingRefresh = false;
/** Last painted body HTML — identical frames skip the (destructive) repaint. */
let lastPaint = '';

function paint(html: string): void {
  if (html === lastPaint) return;
  lastPaint = html;
  $('sheetBody').innerHTML = html;
}

export function openSheet(kind: SheetKind, arg?: number): void {
  SHEET = { kind, arg };
  lastPaint = '';
  renderSheet();
  $('sheet').classList.add('open');
}

export function closeSheet(): void {
  SHEET = null;
  SHEET_HL = null;
  lastPaint = '';
  $('sheet').classList.remove('open');
}

export function refreshSheet(): void {
  if (!SHEET) return;
  if (pressing) {
    pendingRefresh = true;
    return;
  }
  renderSheet();
}

export function sheetIs(kind: SheetKind): boolean {
  return SHEET?.kind === kind;
}

export function sheetInfoArg(): number | undefined {
  return SHEET?.kind === 'info' ? SHEET.arg : undefined;
}

function costHTML(res: ResourceKey, c: number): string {
  const cls = res === 'g' ? 'g' : res === 'm' ? 'm' : 'w';
  const ic = res === 'g' ? '🪙' : res === 'm' ? '🔮' : '◆';
  return `<span class="cost"><span class="d ${cls}"></span>${ic} ${fmt(c)}</span>`;
}

/** Progress-bar width, quantized so the HTML only changes ~1×/s (see paint). */
const pct = (x: number): string => (Math.max(0, Math.min(100, x))).toFixed(1);

export function renderSheet(): void {
  if (!SHEET) return;
  if (SHEET.kind === 'shop') {
    $('sheetTitle').textContent = 'Shop';
    $('sheetSub').textContent = 'Keep Level ' + keepLv();
    let h = '<div class="grid">';
    for (const type of SHOP_ORDER) {
      const B = BUILD[type];
      const cnt = countOf(type);
      const maxNow = B.max[keepLv() - 1]!;
      const isHut = type === 'hut';
      const hutMax = MAX_BUILDERS, hutCnt = G.buildersTotal;
      const capped = isHut ? hutCnt >= hutMax : cnt >= maxNow;
      let lockTxt = '';
      if (capped && !isHut) {
        let nx = 0;
        for (let i = keepLv(); i < 5; i++)
          if (B.max[i]! > cnt) {
            nx = i + 1;
            break;
          }
        lockTxt = nx ? `Requires Keep L${nx}` : 'Max built';
      }
      if (capped && isHut) lockTxt = 'Max builders';
      h += `<div class="card ${capped ? 'locked' : ''} ${SHEET_HL === type ? 'hl' : ''}">
        ${iconHTML('b', type)}
        <div class="nm">${B.emoji} ${B.n}</div>
        <div class="meta">${isHut ? hutCnt + '/' + hutMax + ' builders' : cnt + '/' + maxNow + ' built'}</div>
        ${
          capped
            ? `<div class="meta" style="color:var(--bad)">${lockTxt}</div>`
            : `<button class="btn ${B.res === 'm' ? 'mana' : B.res === 'w' ? 'war' : ''}" data-act="buy" data-arg="${type}">${costHTML(B.res, B.lv[0]!.c)}</button>`
        }
      </div>`;
    }
    h += '</div>';
    paint(h);
  } else if (SHEET.kind === 'army') {
    $('sheetTitle').textContent = 'Army';
    const used = housingUsed(), cap = armyCap();
    $('sheetSub').textContent = '';
    let h = `<div class="row" style="margin:2px 0 12px"><b style="font-size:13px">🗡️ ${used}/${cap}</b><div class="capBar"><i style="width:${pct(cap ? (used / cap) * 100 : 0)}%"></i></div></div><div class="grid">`;
    for (const t of TROOP_ORDER) {
      const T = TROOP[t];
      const locked = maxBarracksLv() < T.unlock;
      h += `<div class="card ${locked ? 'locked' : ''} ${SHEET_HL === t ? 'hl' : ''}">
        <span class="cnt" style="position:absolute;top:6px;right:6px;background:var(--gold);color:#1d1503;font-weight:900;font-size:11px;padding:2px 8px;border-radius:9px">×${G.army[t]}</span>
        ${iconHTML('t', t)}
        <div class="nm">${T.emoji} ${T.n}</div>
        <div class="meta">${T.d}</div>
        <div class="meta">❤️${T.hp} · ⚔️${Math.round(T.dmg / T.rate)}/s · 🏠${T.house}</div>
        ${
          locked
            ? `<div class="meta" style="color:var(--bad)">Barracks L${T.unlock} required</div>`
            : `<button class="btn mana" data-act="train" data-arg="${t}">${costHTML('m', T.cost)} · ${tstr(uiTrainSeconds(t))}</button>`
        }
      </div>`;
    }
    h += '</div>';
    {
      const brewed = G.spells.heal + G.spells.rage + G.spells.bolt;
      h += `<div class="row" style="margin:16px 0 10px"><b style="font-size:13px">🧪 Spells · ${brewed}/${SPELL_CAP}</b><div class="capBar"><i style="width:${pct((brewed / SPELL_CAP) * 100)}%;background:linear-gradient(90deg,#7a3bd8,#c9a6ff)"></i></div></div><div class="grid">`;
      for (const s of SPELL_ORDER) {
        const S = SPELL[s];
        const locked = keepLv() < S.unlock;
        h += `<div class="card ${locked ? 'locked' : ''} ${SHEET_HL === s ? 'hl' : ''}">
          <span class="cnt" style="position:absolute;top:6px;right:6px;background:#c9a6ff;color:#241040;font-weight:900;font-size:11px;padding:2px 8px;border-radius:9px">×${G.spells[s]}</span>
          <div style="height:74px;display:flex;align-items:center;justify-content:center;font-size:40px;border-radius:9px;background:radial-gradient(circle at 50% 30%,#2d2347,#160f26)">${S.emoji}</div>
          <div class="nm">${S.emoji} ${S.n}</div>
          <div class="meta">${S.d}</div>
          ${
            locked
              ? `<div class="meta" style="color:var(--bad)">Keep L${S.unlock} required</div>`
              : `<button class="btn mana" data-act="brew" data-arg="${s}">Brew ${costHTML('m', S.cost)}</button>`
          }
        </div>`;
      }
      h += '</div>';
    }
    if (G.trainQ.length) {
      const totRem = G.trainQ.reduce((a, q) => a + q.tLeft, 0);
      const rush = uiFinishCost(totRem);
      h += `<div class="row" style="margin-top:14px"><b style="font-size:13px">Training queue · ${tstr(Math.max(0, totRem))} left</b><span class="spacer"></span>
        <button class="btn war" data-act="rushq">Rush ◆${rush}</button></div><div class="qWrap">`;
      G.trainQ.forEach((q, i) => {
        h += `<div class="qItem">${TROOP[q.type].emoji}
        ${i === 0 ? `<div class="prog"><i style="width:${pct((1 - q.tLeft / q.total) * 100)}%"></i></div>` : ''}</div>`;
      });
      h += '</div>';
    }
    paint(h);
  } else if (SHEET.kind === 'info') {
    const b = G.buildings.find((x) => x.id === SHEET!.arg);
    if (!b) {
      closeSheet();
      return;
    }
    const B = BUILD[b.type], L = B.lv[b.level - 1]!;
    $('sheetTitle').innerHTML = `${B.emoji} ${B.n} <span class="lvlTag">Lv ${b.level}</span>`;
    $('sheetSub').textContent = '';
    let h = `<div class="meta" style="margin-bottom:8px;color:var(--dim);font-size:12.5px">${B.d}</div>`;
    h += `<div class="stat"><span>Hitpoints</span><b>${L.hp}</b></div>`;
    if (L.rate && B.cat === 'res')
      h += `<div class="stat"><span>Production</span><b>${Math.round(prodPerSec(b.type, b.level) * 3600)}/h</b></div><div class="stat"><span>Storage (on site)</span><b>${Math.floor(b.stored ?? 0)} / ${L.cap}</b></div>`;
    if (L.add) h += `<div class="stat"><span>Capacity bonus</span><b>+${fmt(L.add)}</b></div>`;
    if (L.dmg)
      h += `<div class="stat"><span>Damage</span><b>${Math.round(L.dmg / L.rate!)}/s</b></div><div class="stat"><span>Range</span><b>${L.rng}${L.min ? ' (min ' + L.min + ')' : ''}</b></div>`;
    if (L.cap && b.type === 'camp') h += `<div class="stat"><span>Housing</span><b>${L.cap}</b></div>`;
    const job = jobOf(b.id);
    if (job) {
      const fin = uiFinishCost(job.tLeft);
      h += `<div class="row" style="margin-top:12px"><div class="capBar"><i style="width:${pct((1 - job.tLeft / job.total) * 100)}%;background:linear-gradient(90deg,#c98a12,var(--gold2))"></i></div>
        <b style="font-size:12px;min-width:44px;text-align:right">${tstr(job.tLeft)}</b></div>
      <div class="row" style="margin-top:10px"><button class="btn war" style="flex:1" data-act="fin" data-arg="${b.id}">⚡ Finish now ◆${fin}</button></div>`;
    } else {
      const up = canUpgrade(b);
      const nxt = b.level < B.lv.length ? B.lv[b.level]! : null;
      h += `<div class="row" style="margin-top:12px;gap:8px">`;
      if (nxt)
        h += `<button class="btn ${B.res === 'm' ? 'mana' : ''}" style="flex:1.5" data-act="upg" data-arg="${b.id}" ${up.ok ? '' : 'disabled'}>
        ⬆ Upgrade ${costHTML(B.res, nxt.c)} · ${tstr(uiBuildSeconds(b.type, b.level + 1))}</button>`;
      else h += `<button class="btn" disabled style="flex:1.5">★ Max level</button>`;
      h += `<button class="btn ghost" data-act="move" data-arg="${b.id}">✥ Move</button></div>`;
      if (nxt && !up.ok) {
        h += `<div class="meta" style="margin-top:8px;color:var(--bad)">${up.why}</div>`;
        if (up.why?.startsWith('Requires Keep'))
          h += `<button class="btn ghost" style="width:100%;margin-top:8px" data-act="goKeep">🏰 Upgrade your Keep first — open it</button>`;
      }
      if (b.type === 'barracks')
        h += `<button class="btn ghost" style="width:100%;margin-top:10px" data-act="openArmy">🗡️ Train units</button>`;
    }
    paint(h);
  } else if (SHEET.kind === 'obst') {
    const ob = G.obstacles.find((o) => o.id === SHEET!.arg);
    if (!ob || ob.dead) {
      closeSheet();
      return;
    }
    $('sheetTitle').textContent = ob.kind === 'tree' ? '🌳 Tree' : '🪨 Rock';
    $('sheetSub').textContent = '';
    const clearing = ob.clearUntil !== undefined && ob.clearUntil > nowMs();
    if (clearing) {
      const tLeft = (ob.clearUntil! - nowMs()) / 1000;
      const total = ob.clearTotalS ?? Math.max(1, tLeft);
      paint(`<div class="meta" style="color:var(--dim)">A builder is clearing this — the $WAR pops out when they're done.</div>
        <div class="row" style="margin-top:12px"><div class="capBar"><i style="width:${pct((1 - tLeft / total) * 100)}%;background:linear-gradient(90deg,#c98a12,var(--gold2))"></i></div>
        <b style="font-size:12px;min-width:44px;text-align:right">${tstr(tLeft)}</b></div>`);
    } else {
      paint(`<div class="meta" style="color:var(--dim)">Clearing obstacles tidies the camp — and sometimes shakes loose a little $WAR. Takes a builder a moment.</div>
        <button class="btn" style="width:100%;margin-top:12px" data-act="clear" data-arg="${ob.id}">Clear ${costHTML('g', OBSTACLE_COST[ob.kind])}</button>`);
    }
  } else if (SHEET.kind === 'jobs') {
    $('sheetTitle').textContent = '🔨 Builders';
    $('sheetSub').textContent = freeBuilders() + ' of ' + G.buildersTotal + ' available';
    let h = '';
    if (!G.jobs.length && !clearingObstacles().length)
      h = '<div class="meta" style="color:var(--dim);padding:8px 0">All builders are resting. Start an upgrade!</div>';
    for (const j of G.jobs) {
      const b = G.buildings.find((x) => x.id === j.bid);
      if (!b) continue;
      const B = BUILD[b.type];
      const fin = uiFinishCost(j.tLeft);
      h += `<div class="row" style="padding:9px 0;border-bottom:1px dashed rgba(255,255,255,.08)">
        <span style="font-size:18px">${B.emoji}</span><div style="flex:1"><b style="font-size:13px">${B.n} ${j.kind === 'up' ? '→ Lv ' + (b.level + 1) : '(building)'}</b>
        <div class="capBar" style="margin-top:5px"><i style="width:${pct((1 - j.tLeft / j.total) * 100)}%;background:linear-gradient(90deg,#c98a12,var(--gold2))"></i></div></div>
        <b style="font-size:12px">${tstr(j.tLeft)}</b>
        <button class="btn war" data-act="fin" data-arg="${b.id}">◆${fin}</button></div>`;
    }
    for (const o of clearingObstacles()) {
      const tLeft = (o.clearUntil! - nowMs()) / 1000;
      const total = o.clearTotalS ?? Math.max(1, tLeft);
      h += `<div class="row" style="padding:9px 0;border-bottom:1px dashed rgba(255,255,255,.08)">
        <span style="font-size:18px">${o.kind === 'tree' ? '🌳' : '🪨'}</span><div style="flex:1"><b style="font-size:13px">Clearing ${o.kind}</b>
        <div class="capBar" style="margin-top:5px"><i style="width:${pct((1 - tLeft / total) * 100)}%;background:linear-gradient(90deg,#c98a12,var(--gold2))"></i></div></div>
        <b style="font-size:12px">${tstr(tLeft)}</b></div>`;
    }
    if (G.buildersTotal < MAX_BUILDERS)
      h += `<div class="meta" style="margin-top:10px;color:var(--dim)">Need more hands? Buy a Builder Hut in the Shop (◆200).</div>`;
    paint(h);
  }
}

/** Wire the sheet's close button + delegated card actions. Call once at boot. */
export function initSheet(): void {
  $('sheetX').onclick = closeSheet;
  // Press guard: hold re-renders while a pointer is down over the sheet, and
  // release only AFTER the tap's click has been dispatched (window bubble
  // listeners run after the sheetBody delegate below). pointerup alone isn't
  // enough — the click event follows it, and repainting in between would
  // still destroy the tap target.
  $('sheetBody').addEventListener('pointerdown', () => {
    pressing = true;
  });
  const releasePress = (): void => {
    if (!pressing) return;
    pressing = false;
    if (pendingRefresh) {
      pendingRefresh = false;
      refreshSheet();
    }
  };
  window.addEventListener('click', releasePress);
  window.addEventListener('pointercancel', releasePress);
  // drags/scrolls end with pointerup but no click — release shortly after
  window.addEventListener('pointerup', () => {
    setTimeout(releasePress, 150);
  });
  $('sheetBody').addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el) return;
    const act = el.dataset.act, arg = el.dataset.arg;
    if (act === 'buy') startPlace(arg as BuildingType);
    else if (act === 'train') trainTroop(arg as TroopType);
    else if (act === 'brew') brewSpell(arg as SpellType);
    else if (act === 'upg') {
      const b = G.buildings.find((x) => x.id === Number(arg));
      if (b) startUpgrade(b);
    } else if (act === 'move') {
      const b = G.buildings.find((x) => x.id === Number(arg));
      if (b) startMove(b);
    } else if (act === 'fin') finishNow(Number(arg));
    else if (act === 'clear') {
      const ob = G.obstacles.find((o) => o.id === Number(arg));
      if (ob) clearObstacle(ob);
    } else if (act === 'rushq') {
      rushTraining();
    } else if (act === 'goKeep') {
      const keep = G.buildings.find((x) => x.type === 'keep');
      if (keep) {
        G.sel = keep.id;
        openSheet('info', keep.id);
      }
    } else if (act === 'openArmy') openSheet('army');
  });
}
