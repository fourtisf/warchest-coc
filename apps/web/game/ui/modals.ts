/** Overlay modals: wallet (mock), leaderboard, War Orders + tap-to-guide, settings. Ported verbatim. */
import { BUILD, QUESTS, fmt, iso, mulberry32, type QuestDef } from '@warchest/game-core';
import { CAM, view } from '../camera';
import { $ } from '../dom';
import { SFX } from '../sfx';
import { G } from '../state';
import { checkQuests, questView } from '../systems';
import { renderHUD } from './hud';
import { closeSheet, openSheet, setSheetHL } from './sheet';
import { toast } from './toasts';

export function openOv(id: string): void {
  $(id).classList.add('show');
}
export function closeOv(id: string): void {
  $(id).classList.remove('show');
}

/* ---------------- wallet (mock — production build settles on Solana) ---------------- */
export function fillWallet(): void {
  const w = $('walletBody');
  if (!G.wallet) {
    w.innerHTML = `<button class="btn" id="wConnect" style="width:100%;padding:12px">🔗 Connect Wallet</button>
    <div class="meta" style="margin-top:10px;color:var(--dim);text-align:center;font-size:11.5px">Mock connection — no real wallet is used in the prototype.</div>`;
    $('wConnect').onclick = () => {
      $('wConnect').textContent = 'Connecting…';
      setTimeout(() => {
        const a =
          '0x' +
          Array.from({ length: 4 }, () =>
            Math.floor(Math.random() * 65536).toString(16).padStart(4, '0'),
          ).join('');
        G.wallet = { addr: a, short: a.slice(0, 6) + '…' + a.slice(-4) };
        renderHUD();
        fillWallet();
        checkQuests();
        toast('Wallet connected', 'ok');
        SFX.play('done');
      }, 900);
    };
  } else {
    w.innerHTML = `
    <div class="stat"><span>Address</span><b style="font-family:monospace">${G.wallet.short}</b></div>
    <div class="stat"><span>$WAR balance</span><b style="color:var(--war)">◆ ${fmt(G.res.w)}</b></div>
    <div class="stat"><span>Bridged (lifetime)</span><b>◆ ${fmt(G.stat.warClaimed)}</b></div>
    <button class="btn war" id="wClaim" style="width:100%;margin-top:14px;padding:11px">⛓️ Claim $WAR on-chain</button>
    <div class="meta" style="margin-top:10px;color:var(--dim);font-size:11.5px">Production build: SPL token settlement + season escrow. Prototype: simulated tx.</div>`;
    $('wClaim').onclick = () => {
      if (G.res.w <= 0) {
        toast('Nothing to claim', 'warn');
        return;
      }
      G.stat.warClaimed += G.res.w;
      G.stat.claims++;
      checkQuests();
      const tx =
        '0x' + Math.random().toString(16).slice(2, 6) + '…' + Math.random().toString(16).slice(2, 6);
      toast(`Tx confirmed · ${tx} · ◆${fmt(G.res.w)} bridged (mock)`, 'ok');
      SFX.play('coin');
      fillWallet();
    };
  }
}

/* ---------------- leaderboard ---------------- */
const LB_NAMES = [
  '0xRaidLord', 'GoblinSlayer.sol', 'xX_Deg3n_Xx', 'SatoshiKnight', 'wagmi_warlord', 'MoonKeep',
  'ser_pump', 'anon4471', 'ChainBarbarian', 'FloorSweeper', '0xValkyrie', 'rugproof.eth',
];

export function openLeaderboard(): void {
  const rng = mulberry32(20260702);
  const rows: Array<{ n: string; t: number; me?: 1 }> = [];
  for (let i = 0; i < 9; i++) rows.push({ n: LB_NAMES[i % LB_NAMES.length]!, t: Math.floor(40 + rng() * 860) });
  rows.push({ n: 'You', t: G.trophies, me: 1 });
  rows.sort((a, b) => b.t - a.t);
  $('lbBody').innerHTML = rows
    .map(
      (r, i) =>
        `<div class="lb ${r.me ? 'me' : ''}"><span class="rk">${i + 1}</span><span class="nm">${r.n}</span><span class="tp">🏆 ${r.t}</span></div>`,
    )
    .join('');
  openOv('lbModal');
}

/* ---------------- quest guide (tap-to-guide routing, client-side) ---------------- */
export function focusAt(gx: number, gy: number, s: number, h: number): void {
  const p = iso(gx, gy);
  view.CAMT = { sx: CAM.x, sy: CAM.y, sz: CAM.z, x: p.x, y: p.y, z: Math.max(CAM.z, 1.05), t: 0 };
  view.GUIDE = { gx, gy, s, h, until: G.t + 8 };
}

export function guideTo(q: QuestDef): void {
  const go = q.go;
  if (!go) return;
  setSheetHL(null);
  closeSheet();
  if (go.k === 'raid') {
    $('raidBtn').click();
    return;
  }
  if (go.k === 'wallet') {
    fillWallet();
    openOv('wallet');
    return;
  }
  if (go.k === 'sheet') {
    setSheetHL(go.hl ?? null);
    openSheet(go.s);
    return;
  }
  if (go.k === 'obst') {
    const ob = G.obstacles.find((o) => !o.dead);
    if (!ob) {
      toast('No obstacles left to clear', 'warn');
      return;
    }
    focusAt(ob.gx + 0.5, ob.gy + 0.5, 1.2, 34);
    if (q.tip) toast(q.tip, 'ok');
    return;
  }
  if (go.k === 'keep') {
    const b = G.buildings.find((x) => x.type === 'keep');
    if (!b) return;
    focusAt(b.gx + 2, b.gy + 2, 4, 120);
    G.sel = b.id;
    openSheet('info', b.id);
    return;
  }
  if (go.k === 'b') {
    const b =
      G.buildings.find((x) => x.type === go.t && !x.busy) ?? G.buildings.find((x) => x.type === go.t);
    if (!b) {
      setSheetHL(go.t);
      openSheet('shop');
      return;
    }
    const s = BUILD[b.type].s;
    focusAt(b.gx + s / 2, b.gy + s / 2, s, b.type === 'arrow' ? 96 : 70);
    if (q.tip) toast(q.tip, 'ok');
  }
}

/* ---------------- quests modal ---------------- */
export function openQuests(): void {
  const done = QUESTS.filter((q) => G.questDone[q.id]).length;
  $('questCount').textContent = done + ' / ' + QUESTS.length;
  const v = questView();
  $('questBody').innerHTML = QUESTS.map((q) => {
    const tx = q.txt(v);
    const dn = G.questDone[q.id];
    return `<div class="qst ${dn ? 'done' : 'go'}" data-q="${q.id}"><div class="qi">${q.ico}</div><div class="qt">${tx}</div><div class="qr">◆ ${q.reward}</div>${dn ? '' : '<div class="qgo">GO</div>'}</div>`;
  }).join('');
  openOv('quests');
}

/** Wire modal close buttons + quest row taps. Call once at boot. */
export function initModals(): void {
  document.querySelectorAll<HTMLElement>('[data-close]').forEach((b) => {
    b.onclick = () => closeOv(b.dataset.close!);
  });
  $('questBody').addEventListener('click', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('.qst[data-q]');
    if (!row) return;
    const q = QUESTS.find((x) => x.id === row.dataset.q);
    if (!q || G.questDone[q.id]) return;
    closeOv('quests');
    SFX.play('tap');
    guideTo(q);
  });
}
