/**
 * War Room — clans + chat. One modal, two channels: Global (everyone with a
 * Clan Hall may talk; anyone may read) and Clan (browse/found/join, members,
 * clan chat). Chat polls every 4s while the modal is open; only #chatLog is
 * repainted on new messages so the input box never loses focus.
 */
import {
  CLAN_CREATE_COST,
  TROOP,
  TROOP_ORDER,
  fmt,
  reqResCap,
  reqTroopCap,
  type TroopType,
} from '@warchest/game-core';
import { api, ApiError, hydrate, type ChatMsg, type ClanBrief, type ClanDto, type ClanReq } from '../api';
import { $, $maybe } from '../dom';
import { SFX } from '../sfx';
import { G } from '../state';
import { openOv } from './modals';
import { toast } from './toasts';

type Tab = 'global' | 'clan';

const CS = {
  tab: 'global' as Tab,
  hallLv: 0,
  clan: null as ClanDto | null,
  loaded: false,
  msgs: { global: [] as ChatMsg[], clan: [] as ChatMsg[] },
  lastId: { global: 0, clan: 0 },
  browse: [] as ClanBrief[],
  reqs: [] as ClanReq[],
  inflight: false,
};

/** Sheet integration: the Clan Hall info card shows live clan status. */
export function clanState(): { hallLv: number; clan: ClanDto | null; loaded: boolean } {
  return CS;
}

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

const timeShort = (at: number): string =>
  new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function msgRow(m: ChatMsg): string {
  const mine = m.uid.slice(-6).toUpperCase() === G.playerId;
  return `<div style="padding:4px 0;font-size:12.5px;line-height:1.45">
    <b style="color:${mine ? 'var(--war)' : 'var(--gold2)'}">${esc(m.name)}</b>
    <span style="color:var(--dim);font-size:10.5px"> ${timeShort(m.at)}</span><br>${esc(m.text)}</div>`;
}

function paintLog(): void {
  const log = $maybe('chatLog');
  if (!log) return;
  const list = CS.msgs[CS.tab];
  const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
  log.innerHTML = list.length
    ? list.map(msgRow).join('')
    : `<div class="meta" style="color:var(--dim);padding:10px 0">No messages yet — say hello, commander.</div>`;
  if (nearBottom || log.scrollTop === 0) log.scrollTop = log.scrollHeight;
}

function chatBoxHTML(): string {
  const canTalk = CS.tab === 'clan' ? !!CS.clan : CS.hallLv >= 1;
  const hint =
    CS.tab === 'clan' ? '' : CS.hallLv >= 1 ? '' : '🛡️ Build a Clan Hall to talk here — reading is free.';
  return `<div id="chatLog" style="height:230px;overflow-y:auto;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:6px 10px;margin-top:2px"></div>
    ${
      canTalk
        ? `<div class="row" style="gap:8px;margin-top:8px">
            <input id="chatInput" maxlength="200" placeholder="Message…" autocomplete="off"
              style="flex:1;padding:10px 12px;border-radius:10px;border:1px solid rgba(240,180,80,.3);background:rgba(0,0,0,.35);color:var(--txt);font:600 13px Rubik,sans-serif;outline:none">
            <button class="btn" id="chatSend" style="padding:10px 16px">➤</button>
          </div>`
        : hint
          ? `<div class="meta" style="color:var(--dim);margin-top:8px">${hint}</div>`
          : ''
    }`;
}

const isMine = (uid: string): boolean => uid.slice(-6).toUpperCase() === G.playerId;

/* ------------------------- clan aid (requests) ------------------------- */
const REQ_ICON: Record<ClanReq['kind'], string> = { troops: '⚔️', gold: '🪙', mana: '🔮' };
const reqAmt = (r: ClanReq, n: number): string =>
  r.kind === 'troops' ? `${n} housing` : fmt(n);

function reqCardHTML(r: ClanReq): string {
  const mine = isMine(r.uid);
  const remaining = r.amount - r.filled;
  const pctW = Math.max(0, Math.min(100, (r.filled / r.amount) * 100)).toFixed(1);
  let controls = '';
  if (mine) {
    controls = `<button class="btn ghost" data-cact="reqCancel" style="padding:5px 10px;font-size:11px">Cancel</button>`;
  } else if (r.kind === 'troops') {
    const btns = TROOP_ORDER.filter((t) => G.army[t] > 0 && TROOP[t].house <= remaining)
      .map(
        (t) =>
          `<button class="btn ghost" data-cact="donT" data-arg="${r.id}:${t}" style="padding:4px 8px;font-size:12px" title="Send 1 ${TROOP[t].n} (${TROOP[t].house} housing)">${TROOP[t].emoji}<span style="font-size:10px">×${G.army[t]}</span></button>`,
      )
      .join('');
    controls = btns || `<span class="meta" style="color:var(--dim);font-size:10.5px">no troops that fit</span>`;
  } else {
    const stock = Math.floor(r.kind === 'gold' ? G.res.g : G.res.m);
    const chunk = Math.min(remaining, stock, Math.max(1, Math.ceil(r.amount / 4)));
    controls = chunk > 0
      ? `<button class="btn ghost" data-cact="donR" data-arg="${r.id}:${chunk}" style="padding:5px 10px;font-size:11.5px">Give ${REQ_ICON[r.kind]}${fmt(chunk)}</button>`
      : `<span class="meta" style="color:var(--dim);font-size:10.5px">nothing to give</span>`;
  }
  const donors = r.donors.length
    ? `<div class="meta" style="color:var(--dim);font-size:10.5px;margin-top:3px">🤝 ${r.donors.map((d) => `${esc(d.n)} ${esc(d.t)}`).join(' · ')}</div>`
    : '';
  return `<div style="padding:8px 10px;margin-top:6px;background:rgba(242,180,48,.06);border:1px solid rgba(242,180,48,.22);border-radius:10px">
    <div class="row" style="gap:8px">
      <span style="font-size:16px">${REQ_ICON[r.kind]}</span>
      <div style="flex:1;min-width:0">
        <b style="font-size:12.5px">${mine ? 'You' : esc(r.name)}</b>
        <span class="meta" style="color:var(--dim);font-size:11px"> needs ${reqAmt(r, r.amount)}</span>
        <div class="row" style="gap:6px;margin-top:4px"><div class="capBar" style="flex:1"><i style="width:${pctW}%"></i></div>
          <span style="font-size:10.5px;color:var(--gold2);font-weight:700">${r.kind === 'troops' ? r.filled : fmt(r.filled)}/${reqAmt(r, r.amount)}</span></div>
        ${donors}
      </div>
      <div class="row" style="gap:4px;flex-wrap:wrap;justify-content:flex-end;max-width:46%">${controls}</div>
    </div>
  </div>`;
}

function reqBoardHTML(): string {
  if (!CS.clan) return '';
  const myReq = CS.reqs.find((r) => isMine(r.uid));
  let h = `<div class="row" style="margin:8px 0 2px"><b style="font-size:12.5px">📦 Clan aid</b><span class="spacer"></span>`;
  if (!myReq) {
    const tc = reqTroopCap(CS.hallLv), rc = reqResCap(CS.hallLv);
    h += `<button class="btn ghost" data-cact="reqT" data-arg="${tc}" style="padding:5px 9px;font-size:11px" title="Ask clanmates for troops (max ${tc} housing at your hall level)">⚔️ +${tc}</button>
      <button class="btn ghost" data-cact="reqG" data-arg="${rc}" style="padding:5px 9px;font-size:11px" title="Ask for Gold (max ${fmt(rc)})">🪙 ${fmt(rc)}</button>
      <button class="btn ghost" data-cact="reqM" data-arg="${rc}" style="padding:5px 9px;font-size:11px" title="Ask for Mana (max ${fmt(rc)})">🔮 ${fmt(rc)}</button>`;
  }
  h += `</div>`;
  if (!CS.reqs.length && !myReq)
    h += `<div class="meta" style="color:var(--dim);font-size:11px">Ask your clan for troops or resources — caps grow with your Clan Hall.</div>`;
  h += CS.reqs.map(reqCardHTML).join('');
  return `<div id="reqBoard">${h}</div>`;
}

let lastReqPaint = '';
function paintReqs(force = false): void {
  const board = $maybe('reqBoard');
  if (!board) return;
  const html = reqBoardHTML();
  if (!force && html === lastReqPaint) return;
  lastReqPaint = html;
  board.outerHTML = html;
}

/** New reqs payload from the server: refresh the board; pull my own village
 *  when someone just donated to me (troops/loot landed while I watch). */
function takeReqs(reqs: ClanReq[] | undefined): void {
  if (!reqs) return;
  const myOld = CS.reqs.find((r) => isMine(r.uid));
  const myNew = reqs.find((r) => isMine(r.uid));
  CS.reqs = reqs;
  paintReqs();
  if (myOld && myNew && myNew.filled > myOld.filled) {
    const last = myNew.donors[myNew.donors.length - 1];
    toast(`🤝 ${last ? `${last.n} sent ${last.t}` : 'Your clan is helping'}!`, 'ok');
    SFX.play('done');
    void api.me().then(hydrate).catch(() => {});
  } else if (myOld && !myNew && myOld.filled < myOld.amount) {
    // request finished between polls (filled off-screen)
    void api.me().then(hydrate).catch(() => {});
  }
}

function clanTabHTML(): string {
  if (CS.hallLv < 1)
    return `<div style="text-align:center;padding:14px 0 6px">
      <div style="font-size:42px">🛡️</div>
      <div style="font-weight:700;margin:6px 0 4px">No Clan Hall yet</div>
      <div class="meta" style="color:var(--dim)">Build a Clan Hall to found or join a clan and unlock the war-room chat.</div>
      <button class="btn" data-cact="shop" style="margin-top:12px;padding:10px 18px">🏗️ Open the Shop</button>
    </div>`;
  if (!CS.clan) {
    const rows = CS.browse.length
      ? CS.browse
          .map(
            (c) => `<div class="row" style="padding:8px 0;border-bottom:1px dashed rgba(255,255,255,.08)">
        <span style="font-size:17px">🛡️</span>
        <div style="flex:1;min-width:0"><b style="font-size:13px">${esc(c.name)}</b>
          <span style="color:var(--dim);font-family:monospace;font-size:10.5px"> ${c.tag}</span>
          ${c.desc ? `<div class="meta" style="color:var(--dim);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.desc)}</div>` : ''}</div>
        <span class="meta" style="color:#ffd24a;font-weight:800">⚡${fmt(c.power)}</span>
        <span class="meta" style="color:var(--dim)">${c.count} ⚔</span>
        <button class="btn ghost" data-cact="join" data-arg="${c.id}" style="padding:6px 12px;font-size:12px">Join</button></div>`,
          )
          .join('')
      : `<div class="meta" style="color:var(--dim);padding:8px 0">No clans found. Found the first one!</div>`;
    return `<div style="font-weight:700;font-size:13px;margin:2px 0 6px">⚑ Found a clan</div>
      <div class="row" style="gap:8px">
        <input id="clanName" maxlength="20" placeholder="Clan name (3-20 chars)"
          style="flex:1;padding:10px 12px;border-radius:10px;border:1px solid rgba(240,180,80,.3);background:rgba(0,0,0,.35);color:var(--txt);font:600 13px Rubik,sans-serif;outline:none">
        <button class="btn" data-cact="create" style="padding:10px 12px;font-size:12.5px">🪙 ${fmt(CLAN_CREATE_COST)}</button>
      </div>
      <div class="row" style="margin:14px 0 4px;gap:8px">
        <b style="font-size:13px;flex:1">Join a clan</b>
        <input id="clanSearch" maxlength="20" placeholder="Name or #ID…"
          style="width:130px;padding:7px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.3);color:var(--txt);font:600 12px Rubik,sans-serif;outline:none">
      </div>
      <div id="clanBrowse">${rows}</div>`;
  }
  const c = CS.clan;
  const iAmLeader = c.members.some((m) => m.role === 'leader' && m.id.slice(-6).toUpperCase() === G.playerId);
  const members = c.members
    .map(
      (m) => `<div class="row" style="padding:6px 0;border-bottom:1px dashed rgba(255,255,255,.07)">
      <span>${m.role === 'leader' ? '👑' : '⚔️'}</span>
      <b style="flex:1;font-size:12.5px">${esc(m.name)}</b>
      <span class="meta" style="color:#ffd24a;font-weight:800">⚡${fmt(m.power)}</span>
      <span class="meta" style="color:var(--gold2)">🏆 ${m.trophies}</span>
      ${iAmLeader && m.role !== 'leader' ? `<button class="btn ghost" data-cact="kick" data-arg="${m.id}" style="padding:4px 9px;font-size:11px">✕</button>` : ''}
    </div>`,
    )
    .join('');
  return `<div class="row" style="margin:2px 0 4px">
      <span style="font-size:22px">🛡️</span>
      <div style="flex:1"><b style="font-size:14.5px">${esc(c.name)}</b>
        <button data-cact="copyTag" data-arg="${c.tag}" title="Copy clan ID — friends can find you with it"
          style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:7px;color:var(--dim);font:700 10.5px monospace;padding:2px 7px;margin-left:5px;cursor:pointer">${c.tag} ⧉</button>
        <div class="meta" style="color:var(--dim);font-size:11px">${c.count}/${c.cap} members · <span style="color:#ffd24a;font-weight:800">⚡${fmt(c.power)} clan power</span>${c.desc ? ' · ' + esc(c.desc) : ''}</div></div>
      <button class="btn ghost" data-cact="leave" style="padding:6px 11px;font-size:11.5px">Leave</button>
    </div>
    <details style="margin:4px 0 8px"><summary style="cursor:pointer;font-size:12px;color:var(--dim)">Members (${c.count})</summary>${members}</details>
    ${reqBoardHTML()}
    ${chatBoxHTML()}`;
}

function paintBody(): void {
  const gBtn = $maybe('clanTabG'), cBtn = $maybe('clanTabC');
  if (gBtn) gBtn.classList.toggle('ghost', CS.tab !== 'global');
  if (cBtn) cBtn.classList.toggle('ghost', CS.tab !== 'clan');
  $('clanBody').innerHTML = CS.tab === 'global' ? chatBoxHTML() : clanTabHTML();
  lastReqPaint = '';
  paintLog();
  const inp = $maybe('chatInput') as HTMLInputElement | null;
  if (inp)
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') sendMsg();
    };
  const search = $maybe('clanSearch') as HTMLInputElement | null;
  if (search)
    search.oninput = () => {
      const q = search.value.trim();
      void api.clanList(q || undefined).then(({ clans }) => {
        CS.browse = clans;
        const box = $maybe('clanBrowse');
        if (!box || ($maybe('clanSearch') as HTMLInputElement | null)?.value.trim() !== q) return;
        paintBody();
        ($('clanSearch') as HTMLInputElement).value = q;
        ($('clanSearch') as HTMLInputElement).focus();
      });
    };
}

async function pullChat(initial = false): Promise<void> {
  const ch = CS.tab;
  if (ch === 'clan' && !CS.clan) return;
  try {
    const { msgs, reqs } = await api.chatGet(ch, initial ? undefined : CS.lastId[ch] || undefined);
    if (ch === 'clan') takeReqs(reqs);
    if (!msgs.length) return;
    if (initial) CS.msgs[ch] = msgs;
    else CS.msgs[ch] = [...CS.msgs[ch], ...msgs].slice(-120);
    CS.lastId[ch] = msgs[msgs.length - 1]!.id;
    if (CS.tab === ch) paintLog();
  } catch {
    /* transient — next poll retries */
  }
}

function sendMsg(): void {
  const inp = $maybe('chatInput') as HTMLInputElement | null;
  if (!inp) return;
  const text = inp.value.trim();
  if (!text || CS.inflight) return;
  CS.inflight = true;
  inp.value = '';
  api
    .chatSend(CS.tab, text)
    .then(({ msg }) => {
      CS.msgs[CS.tab].push(msg);
      CS.lastId[CS.tab] = msg.id;
      paintLog();
    })
    .catch((e: unknown) => {
      inp.value = text; // give the message back — nothing was sent
      toast(e instanceof ApiError ? e.message : 'Could not send', 'warn');
    })
    .finally(() => {
      CS.inflight = false;
    });
}

async function refreshClanMe(): Promise<void> {
  try {
    const { hallLv, clan } = await api.clanMe();
    CS.hallLv = hallLv;
    CS.clan = clan;
    CS.loaded = true;
  } catch {
    /* keep the last snapshot */
  }
}

function setTab(tab: Tab): void {
  CS.tab = tab;
  paintBody();
  void pullChat(true);
  // the clan tab needs fresh status + a browse list when clanless
  if (tab === 'clan') {
    void (async () => {
      await refreshClanMe();
      if (CS.hallLv >= 1 && !CS.clan) {
        const { clans } = await api.clanList().catch(() => ({ clans: [] as ClanBrief[] }));
        CS.browse = clans;
      }
      if (CS.tab === 'clan') {
        paintBody();
        void pullChat(true);
      }
    })();
  }
}

export function openClanPanel(tab?: Tab): void {
  SFX.play('tap');
  if (tab) CS.tab = tab;
  openOv('clanModal');
  paintBody();
  void (async () => {
    await refreshClanMe();
    if (CS.tab === 'clan' && CS.hallLv >= 1 && !CS.clan) {
      const { clans } = await api.clanList().catch(() => ({ clans: [] as ClanBrief[] }));
      CS.browse = clans;
    }
    paintBody();
    void pullChat(true);
  })();
}

/** Build the modal + HUD pill, wire delegation, start the poll. Returns disposer. */
export function initClanUI(): () => void {
  // HUD pill, left of the mail pill
  const anchor = $maybe('mailBtn') ?? $('lbBtn');
  const pill = document.createElement('div');
  pill.className = 'pill';
  pill.id = 'clanBtn';
  pill.textContent = '🛡️';
  anchor.parentElement?.insertBefore(pill, anchor);
  pill.onclick = () => openClanPanel();
  // modal shell
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.id = 'clanModal';
  ov.innerHTML = `<div class="modal">
    <button class="x" data-close="clanModal">✕</button>
    <h2 class="disp">War Room</h2>
    <div class="row" style="gap:8px;margin:6px 0 10px">
      <button class="btn" id="clanTabG" style="flex:1;padding:8px">💬 Global</button>
      <button class="btn ghost" id="clanTabC" style="flex:1;padding:8px">🛡️ Clan</button>
    </div>
    <div id="clanBody"></div>
  </div>`;
  document.querySelector('.wc-game')?.appendChild(ov);
  (ov.querySelector('[data-close]') as HTMLElement).onclick = () => ov.classList.remove('show');
  $('clanTabG').onclick = () => setTab('global');
  $('clanTabC').onclick = () => setTab('clan');
  // delegated actions (rows re-render per paint)
  $('clanBody').addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-cact]');
    if (el) {
      const act = el.dataset.cact, arg = el.dataset.arg;
      SFX.play('tap');
      if (act === 'shop') {
        ov.classList.remove('show');
        $('shopBtn').click();
      } else if (act === 'copyTag' && arg) {
        const done = (): void => toast(`${arg} copied — share it so friends can find your clan`, 'ok');
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(arg).then(done, () => prompt('Clan ID:', arg));
        else prompt('Clan ID:', arg);
      } else if (act === 'create') {
        const name = (($maybe('clanName') as HTMLInputElement | null)?.value ?? '').trim();
        if (name.length < 3) {
          toast('Clan name must be 3-20 characters', 'warn');
          return;
        }
        api
          .clanCreate(name)
          .then(({ clan }) => {
            CS.clan = clan;
            toast(`⚑ ${clan.name} founded — you are the leader!`, 'ok');
            SFX.play('done');
            paintBody();
            void pullChat(true);
          })
          .catch((err: unknown) => toast(err instanceof ApiError ? err.message : 'Could not create clan', 'warn'));
      } else if (act === 'join' && arg) {
        api
          .clanJoin(arg)
          .then(({ clan }) => {
            CS.clan = clan;
            toast(`🛡️ Welcome to ${clan.name}!`, 'ok');
            SFX.play('done');
            paintBody();
            void pullChat(true);
          })
          .catch((err: unknown) => toast(err instanceof ApiError ? err.message : 'Could not join', 'warn'));
      } else if (act === 'leave') {
        if (!confirm('Leave your clan?')) return;
        api
          .clanLeave()
          .then(() => {
            CS.clan = null;
            CS.msgs.clan = [];
            CS.lastId.clan = 0;
            toast('You left the clan', 'ok');
            void api.clanList().then(({ clans }) => {
              CS.browse = clans;
              paintBody();
            });
            paintBody();
          })
          .catch((err: unknown) => toast(err instanceof ApiError ? err.message : 'Could not leave', 'warn'));
      } else if (act === 'kick' && arg) {
        api
          .clanKick(arg)
          .then(({ clan }) => {
            CS.clan = clan;
            toast('Member removed', 'ok');
            paintBody();
          })
          .catch((err: unknown) => toast(err instanceof ApiError ? err.message : 'Could not kick', 'warn'));
      } else if ((act === 'reqT' || act === 'reqG' || act === 'reqM') && arg) {
        const kind = act === 'reqT' ? 'troops' : act === 'reqG' ? 'gold' : 'mana';
        api
          .clanRequest(kind, Number(arg))
          .then(({ reqs }) => {
            CS.reqs = reqs;
            paintBody();
            toast('📦 Request posted — your clan can see it now', 'ok');
            void pullChat(true);
          })
          .catch((err: unknown) => toast(err instanceof ApiError ? err.message : 'Could not request', 'warn'));
      } else if (act === 'reqCancel') {
        api
          .clanReqCancel()
          .then(({ reqs }) => {
            CS.reqs = reqs;
            paintBody();
            toast('Request cancelled', 'ok');
          })
          .catch((err: unknown) => toast(err instanceof ApiError ? err.message : 'Could not cancel', 'warn'));
      } else if (act === 'donT' && arg) {
        const [id, troop] = arg.split(':');
        api
          .clanDonate(Number(id), { troop: troop as TroopType, n: 1 })
          .then((r) => {
            hydrate(r.village);
            CS.reqs = r.reqs;
            paintReqs(true);
            toast('🤝 Troop sent!', 'ok');
            SFX.play('done');
          })
          .catch((err: unknown) => toast(err instanceof ApiError ? err.message : 'Could not donate', 'warn'));
      } else if (act === 'donR' && arg) {
        const [id, amt] = arg.split(':');
        api
          .clanDonate(Number(id), { amount: Number(amt) })
          .then((r) => {
            hydrate(r.village);
            CS.reqs = r.reqs;
            paintReqs(true);
            toast('🤝 Sent — good clanmate!', 'ok');
            SFX.play('coin');
          })
          .catch((err: unknown) => toast(err instanceof ApiError ? err.message : 'Could not donate', 'warn'));
      }
      return;
    }
    if ((e.target as HTMLElement).closest('#chatSend')) sendMsg();
  });
  // live chat while the modal is open
  const poll = window.setInterval(() => {
    if (document.hidden || !ov.classList.contains('show')) return;
    void pullChat();
  }, 4000);
  // clan card freshness (members/capacity) — light, only while open
  const infoPoll = window.setInterval(() => {
    if (document.hidden || !ov.classList.contains('show') || CS.tab !== 'clan') return;
    void refreshClanMe().then(() => {
      if (!($maybe('chatInput') as HTMLInputElement | null)?.value) paintBody();
    });
  }, 20_000);
  return () => {
    clearInterval(poll);
    clearInterval(infoPoll);
    ov.remove();
    $maybe('clanBtn')?.remove();
  };
}
