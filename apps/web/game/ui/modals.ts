/**
 * Overlay modals: wallet (real Solana SIWS + $WAR claims), season leaderboard,
 * War Orders + tap-to-guide, defense mail ("you were raided"), settings.
 */
import { BUILD, QUESTS, fmt, iso, mmss, type QuestDef } from '@warchest/game-core';
import { api, hydrate, serverConfig, withVillage, type DefenseEntry } from '../api';
import { CAM, view } from '../camera';
import { $, $maybe } from '../dom';
import { SFX } from '../sfx';
import { G } from '../state';
import { questView, updateQuestBadge } from '../systems';
import { renderHUD } from './hud';
import { closeSheet, openSheet, setSheetHL } from './sheet';
import { toast } from './toasts';

export function openOv(id: string): void {
  $(id).classList.add('show');
}
export function closeOv(id: string): void {
  $(id).classList.remove('show');
}

/* ------------------------- Solana wallet (SIWS) ------------------------- */
interface SolProvider {
  publicKey?: { toBase58(): string } | null;
  connect(): Promise<{ publicKey?: { toBase58(): string } } | void>;
  signMessage(msg: Uint8Array, display?: string): Promise<{ signature: Uint8Array } | Uint8Array>;
}

type WalletKind = 'phantom' | 'solflare' | 'okx' | 'backpack';

const WALLETS: Record<WalletKind, { name: string; icon: string; install: string }> = {
  phantom: { name: 'Phantom', icon: '👻', install: 'https://phantom.app/download' },
  solflare: { name: 'Solflare', icon: '🔆', install: 'https://solflare.com/download' },
  okx: { name: 'OKX Wallet', icon: '⬛', install: 'https://www.okx.com/web3' },
  backpack: { name: 'Backpack', icon: '🎒', install: 'https://backpack.app/download' },
};

function providerFor(kind: WalletKind): SolProvider | null {
  const w = window as unknown as {
    phantom?: { solana?: SolProvider };
    solana?: SolProvider & { isPhantom?: boolean };
    solflare?: SolProvider;
    okxwallet?: { solana?: SolProvider };
    backpack?: SolProvider;
  };
  if (kind === 'phantom') return w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null);
  if (kind === 'solflare') return w.solflare ?? null;
  if (kind === 'okx') return w.okxwallet?.solana ?? null;
  return w.backpack ?? null;
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58encode(bytes: Uint8Array): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits: number[] = [];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i]! << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = '1'.repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) out += B58[digits[i]!];
  return out;
}

async function connectWallet(kind: WalletKind): Promise<void> {
  const provider = providerFor(kind);
  if (!provider) {
    window.open(WALLETS[kind].install, '_blank', 'noopener');
    toast(`${WALLETS[kind].name} is not installed — opening its download page`, 'warn');
    return;
  }
  const res = await provider.connect();
  const pk =
    provider.publicKey?.toBase58() ??
    (res && 'publicKey' in res ? res.publicKey?.toBase58() : undefined);
  if (!pk) throw new Error('wallet did not expose a public key');
  const { nonce } = await api.nonce();
  const message = `WARCHEST wants you to sign in with your Solana account:\n${pk}\n\nDomain: ${serverConfig.domain}\nNonce: ${nonce}`;
  const signed = await provider.signMessage(new TextEncoder().encode(message), 'utf8');
  const sigBytes = signed instanceof Uint8Array ? signed : signed.signature;
  const payload = await api.walletLogin(pk, b58encode(sigBytes), nonce);
  hydrate(payload);
  renderHUD();
  updateQuestBadge();
  toast('Wallet connected', 'ok');
  SFX.play('done');
}

export function fillWallet(): void {
  const w = $('walletBody');
  if (!G.wallet) {
    const rows = (Object.keys(WALLETS) as WalletKind[])
      .map((k) => {
        const detected = !!providerFor(k);
        return `<button class="btn ${detected ? '' : 'ghost'}" data-wallet="${k}" style="width:100%;padding:12px;margin-top:8px;display:flex;align-items:center;gap:10px;justify-content:flex-start">
          <span style="font-size:18px">${WALLETS[k].icon}</span>
          <span style="flex:1;text-align:left">${WALLETS[k].name}</span>
          <span style="font-size:10.5px;font-weight:800;letter-spacing:.5px;opacity:.8">${detected ? 'DETECTED' : 'INSTALL ↗'}</span>
        </button>`;
      })
      .join('');
    w.innerHTML = `<div class="meta" style="color:var(--dim);font-size:12.5px;margin-bottom:2px">One wallet = one village. Pick yours:</div>
      ${rows}
      <div class="meta" style="margin-top:10px;color:var(--dim);text-align:center;font-size:11px">You'll be asked to sign a login message — no transaction, no fee.</div>`;
    w.querySelectorAll<HTMLButtonElement>('[data-wallet]').forEach((btn) => {
      btn.onclick = () => {
        const kind = btn.dataset.wallet as WalletKind;
        btn.textContent = 'Connecting…';
        connectWallet(kind)
          .then(() => fillWallet())
          .catch((e: unknown) => {
            toast(e instanceof Error ? e.message : 'Wallet connection failed', 'warn');
            fillWallet();
          });
      };
    });
    return;
  }
  const claimable = Math.min(Math.floor(G.res.w), serverConfig.claimDailyCap);
  const canClaim = claimable >= serverConfig.claimMin;
  const feePct = serverConfig.claimFeeBps / 100;
  w.innerHTML = `
    <div class="stat"><span>Address</span><b style="font-family:monospace">${G.wallet.short}</b></div>
    <div class="stat"><span>$WAR balance</span><b style="color:var(--war)">◆ ${fmt(G.res.w)}</b></div>
    <div class="stat"><span>Bridged (lifetime)</span><b>◆ ${fmt(G.stat.warClaimed)}</b></div>
    <button class="btn war" id="wClaim" style="width:100%;margin-top:14px;padding:11px" ${canClaim ? '' : 'disabled'}>⛓️ Claim ◆${canClaim ? fmt(claimable) : fmt(serverConfig.claimMin)} on-chain</button>
    <div class="meta" style="margin-top:8px;color:var(--dim);font-size:11.5px">Min ◆${serverConfig.claimMin} · ${feePct}% fee to treasury · daily cap ◆${serverConfig.claimDailyCap} · 1 claim/hour.</div>
    <div id="wClaims" style="margin-top:10px"></div>`;
  $('wClaim').onclick = () => {
    if (!canClaim) return;
    $('wClaim').textContent = 'Claiming…';
    api
      .claim(claimable)
      .then((r) => {
        hydrate(r.village);
        renderHUD();
        toast(`Claim ◆${r.claim.amount} queued (fee ◆${r.claim.fee}) — settling on-chain`, 'ok');
        SFX.play('coin');
        fillWallet();
      })
      .catch((e: unknown) => {
        toast(e instanceof Error ? e.message : 'Claim failed', 'warn');
        fillWallet();
      });
  };
  void api.claims().then(({ claims }) => {
    const box = $maybe('wClaims');
    if (!box || !claims.length) return;
    box.innerHTML =
      `<div class="meta" style="margin:6px 0 2px;color:var(--dim)">Recent claims</div>` +
      claims
        .slice(0, 5)
        .map(
          (c) =>
            `<div class="stat"><span>◆${c.amount} · ${new Date(c.at).toLocaleDateString()}</span><b style="color:${c.status === 'confirmed' ? 'var(--war)' : c.status === 'failed' ? 'var(--bad)' : 'var(--gold2)'}">${c.status}${c.txSig && !c.txSig.startsWith('mock') ? ' · ' + c.txSig.slice(0, 4) + '…' : ''}</b></div>`,
        )
        .join('');
  });
}

/* ---------------------------- leaderboard ---------------------------- */
export function openLeaderboard(): void {
  $('lbBody').innerHTML = '<div class="meta" style="color:var(--dim);padding:10px 0">Loading…</div>';
  openOv('lbModal');
  api
    .leaderboard()
    .then(({ top, me }) => {
      let h = top
        .slice(0, 100)
        .map(
          (r) =>
            `<div class="lb ${r.me ? 'me' : ''}"><span class="rk">${r.rank}</span><span class="nm">${r.me ? 'You' : r.name}</span><span class="tp">🏆 ${r.trophies}</span></div>`,
        )
        .join('');
      if (me && !top.some((r) => r.me))
        h += `<div class="meta" style="text-align:center;padding:4px">···</div>
          <div class="lb me"><span class="rk">${me.rank}</span><span class="nm">You</span><span class="tp">🏆 ${me.trophies}</span></div>`;
      $('lbBody').innerHTML = h || '<div class="meta">No raiders yet — be the first!</div>';
    })
    .catch(() => {
      $('lbBody').innerHTML = '<div class="meta" style="color:var(--bad)">Failed to load leaderboard</div>';
    });
}

/* ------------------- defense mail ("you were raided") ------------------- */
export function initDefenseMail(): void {
  // pill next to the leaderboard button
  const lbBtn = $('lbBtn');
  const pill = document.createElement('div');
  pill.className = 'pill';
  pill.id = 'mailBtn';
  pill.style.position = 'relative';
  pill.innerHTML = `📬<span class="badge" id="mailBadge" style="display:none">0</span>`;
  lbBtn.parentElement?.insertBefore(pill, lbBtn);
  // modal
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.id = 'mailModal';
  ov.innerHTML = `<div class="modal">
    <button class="x" data-close="mailModal">✕</button>
    <h2 class="disp">Defense Log</h2>
    <div class="sub">Raids against your warcamp while you were away</div>
    <div id="mailBody"></div>
  </div>`;
  document.querySelector('.wc-game')?.appendChild(ov);
  (ov.querySelector('[data-close]') as HTMLElement).onclick = () => closeOv('mailModal');
  pill.onclick = () => {
    SFX.play('tap');
    $('mailBody').innerHTML = '<div class="meta" style="color:var(--dim);padding:10px 0">Loading…</div>';
    openOv('mailModal');
    api
      .defenseLog()
      .then(({ entries }) => {
        $('mailBadge').style.display = 'none';
        $('mailBody').innerHTML = entries.length
          ? entries.map(renderMailRow).join('')
          : '<div class="meta" style="color:var(--dim);padding:10px 0">No raids yet. Your walls are doing their job.</div>';
      })
      .catch(() => {
        $('mailBody').innerHTML = '<div class="meta" style="color:var(--bad)">Failed to load</div>';
      });
  };
  // (badge refresh happens after the session opens — client.ts boot())
}

function renderMailRow(e: DefenseEntry): string {
  const stars = '★'.repeat(e.stars) + '<span style="opacity:.25">' + '★'.repeat(3 - e.stars) + '</span>';
  const actions = `<div class="row" style="gap:8px;margin-top:8px">
      <button class="btn ghost" data-replay="${e.id}" style="padding:6px 12px;font-size:12px">▶ Watch</button>
      ${e.canRevenge ? `<button class="btn red" data-revenge="${e.id}" style="padding:6px 12px;font-size:12px">⚔ Revenge</button>` : ''}
    </div>`;
  return `<div class="qst"><div class="qi">⚔️</div>
    <div class="qt"><b>${e.attacker}</b> raided you — ${Math.floor(e.pct)}% destroyed ${stars}<br>
    <span style="color:var(--dim);font-size:12px">−🪙${fmt(e.lootG)} · −🔮${fmt(e.lootM)} · ${new Date(e.at).toLocaleString()}</span>${actions}</div></div>`;
}

export async function refreshMailBadge(): Promise<void> {
  try {
    const res = await fetch('/api/battle/defense-log?peek=1', { credentials: 'same-origin' });
    if (!res.ok) return;
    const { unseen } = (await res.json()) as { unseen: number };
    const badge = $maybe('mailBadge');
    if (!badge) return;
    badge.style.display = unseen > 0 ? 'flex' : 'none';
    badge.textContent = String(unseen);
  } catch {
    /* offline — ignore */
  }
}

/* ------------------ quest guide (tap-to-guide routing) ------------------ */
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

/* ------------------------------ quests modal ------------------------------ */
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

/** Shield indicator helper for the HUD (optional surface). */
export function shieldText(until: number | null): string {
  if (!until || until < Date.now()) return '';
  return `🛡 ${mmss((until - Date.now()) / 1000)}`;
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
  initDefenseMail();
}

// re-export for callers that had used systems.checkQuests previously
export { withVillage };
