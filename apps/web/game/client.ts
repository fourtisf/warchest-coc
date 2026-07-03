/**
 * Game bootstrap: injects the game markup, initialises subsystems, wires the
 * UI, opens the server session (guest or wallet), and runs the fixed-timestep
 * loop. The server is authoritative — a light poller keeps local state fresh.
 */
import { lerp } from '@warchest/game-core';
import { api, hydrate, serverConfig } from './api';
import {
  cycleReplaySpeed,
  disposeBattle,
  endBattlePressed,
  exitBattle,
  openMatchmaking,
  openRevenge,
  rerollScout,
  startBattle,
  tickBattle,
  watchReplay,
} from './battle';
import { CAM, clampCam, disposeCamera, initCamera, view } from './camera';
import { $ } from './dom';
import { FX } from './fx';
import { buildGround } from './ground';
import { initInput } from './input';
import { GAME_MARKUP } from './markup';
import { MUSIC } from './music';
import { render } from './render';
import { SFX } from './sfx';
import { freshState, G, jobOf } from './state';
import {
  placeCancel,
  placeConfirm,
  sync,
  tickJobs,
  tickProduction,
  tickTraining,
  updateQuestBadge,
} from './systems';
import { resetVillageUnits, tickVillageUnits } from './troops';
import { world } from './world';
import { renderHUD } from './ui/hud';
import { closeOv, fillWallet, initModals, openLeaderboard, openOv, openQuests, refreshMailBadge } from './ui/modals';
import { initSheet, openSheet, refreshSheet, sheetInfoArg, sheetIs } from './ui/sheet';
import { toast } from './ui/toasts';

/** Mirrors the server's daily LADDER (auth.ts) for display; server pays authoritatively. */
const DAILY_LADDER = [5, 8, 12, 16, 20, 25, 30];

function openDaily(): void {
  const day = Math.min(G.daily.streak + 1, 7);
  $('dailyStreak').textContent = G.daily.streak > 0 ? `Day ${day} of your streak` : 'Your first chest of the day';
  $('dailyAmt').textContent = '◆ ' + DAILY_LADDER[Math.min(G.daily.streak, 6)];
  openOv('daily');
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
  $('setBtn').onclick = () => {
    $('nameLabel').textContent = G.playerName ?? '—';
    $('pidLabel').textContent = G.playerId ? '#' + G.playerId : '—';
    openOv('settings');
  };
  $('sfxToggle').onclick = () => {
    G.sfx = !G.sfx;
    $('sfxToggle').textContent = G.sfx ? 'On' : 'Off';
  };
  $('musicToggle').onclick = () => {
    G.music = !G.music;
    $('musicToggle').textContent = G.music ? 'On' : 'Off';
    try {
      localStorage.setItem('wc_music', G.music ? '1' : '0');
    } catch {
      /* private mode */
    }
    if (G.music) MUSIC.start();
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
  $('speedBtn').onclick = () => cycleReplaySpeed();
  // defense mail actions (rows are re-rendered per open → delegate once here)
  $('mailBody').addEventListener('click', (ev) => {
    const el = ev.target as HTMLElement;
    const rp = el.closest<HTMLElement>('[data-replay]');
    if (rp) {
      SFX.play('tap');
      closeOv('mailModal');
      void watchReplay(rp.dataset.replay!);
      return;
    }
    const rv = el.closest<HTMLElement>('[data-revenge]');
    if (rv) {
      SFX.play('tap');
      closeOv('mailModal');
      openRevenge(rv.dataset.revenge!);
    }
  });
  $('dailyClaim').onclick = () => {
    const btn = $('dailyClaim');
    btn.textContent = 'Opening…';
    api
      .dailyClaim()
      .then((v) => {
        hydrate(v);
        closeOv('daily');
        renderHUD();
        const rw = DAILY_LADDER[Math.min(Math.max(G.daily.streak, 1) - 1, 6)];
        toast(`🎁 Daily War Chest: +◆${rw} — day ${Math.min(Math.max(G.daily.streak, 1), 7)} streak`, 'ok');
        SFX.play('coin');
      })
      .catch((e: unknown) => {
        closeOv('daily');
        toast(e instanceof Error ? e.message : 'Could not claim', 'warn');
      })
      .finally(() => {
        btn.textContent = 'Open the Chest';
      });
  };
  $('inviteBtn').onclick = () => {
    const url = `https://${serverConfig.domain}/play?ref=${G.playerId}`;
    const done = (): void =>
      toast('Invite link copied — earn ◆25 when your recruit wins their first raid', 'ok');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done, () => prompt('Copy your invite link:', url));
    } else {
      prompt('Copy your invite link:', url);
    }
  };
  $('resHome').onclick = () => exitBattle();
  $('placeOK').onclick = () => placeConfirm();
  $('placeNO').onclick = () => placeCancel();
  const enterVillage = (): void => {
    SFX.init();
    MUSIC.start();
    $('intro').classList.remove('show');
    SFX.play('done');
    renderHUD();
    toast('Tip: tap your Gold Mine to collect 🪙', 'ok');
    if (G.daily.ready) setTimeout(() => openDaily(), 700);
  };
  $('introGo').onclick = () => {
    if ($('nameRow').style.display !== 'none') {
      // first entry: the commander must be named before the gates open
      const input = $('nameInput') as HTMLInputElement;
      const clean = input.value.trim().replace(/\s+/g, ' ');
      const err = $('nameErr');
      if (!/^[A-Za-z0-9_ ]{3,16}$/.test(clean)) {
        err.textContent = 'Name must be 3-16 letters, numbers, spaces or _';
        err.style.display = 'block';
        return;
      }
      $('introGo').textContent = 'Saving…';
      api
        .setName(clean)
        .then((v) => {
          hydrate(v);
          $('nameRow').style.display = 'none';
          enterVillage();
        })
        .catch((e: unknown) => {
          $('introGo').textContent = '⚔️ Enter Village';
          err.textContent = e instanceof Error ? e.message : 'Could not save name';
          err.style.display = 'block';
        });
      return;
    }
    enterVillage();
  };
  $('nameChange').onclick = () => {
    const next = prompt('New commander name (3-16 letters/numbers):', G.playerName ?? '');
    if (next === null) return;
    api
      .setName(next)
      .then((v) => {
        hydrate(v);
        $('nameLabel').textContent = G.playerName ?? '—';
        renderHUD();
        toast('Name updated ✓', 'ok');
      })
      .catch((e: unknown) => toast(e instanceof Error ? e.message : 'Could not save name', 'warn'));
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
  tickVillageUnits(dt);
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
  Object.assign(G, freshState());
  try {
    G.music = localStorage.getItem('wc_music') !== '0';
  } catch {
    /* private mode */
  }
  initCamera($('game') as unknown as HTMLCanvasElement);
  world.ground = buildGround();
  renderHUD();
  initSheet();
  initModals();
  initInput();
  wireButtons();
  $('musicToggle').textContent = G.music ? 'On' : 'Off';

  // open the server session (guest cookie or existing account)
  let disposed = false;
  const boot = async (): Promise<void> => {
    try {
      // ?ref=<player id> — credit the inviter once this recruit wins a raid
      const ref = new URLSearchParams(location.search).get('ref') ?? undefined;
      hydrate(await api.guest(ref));
      if (!G.playerName) $('nameRow').style.display = 'block';
      renderHUD();
      updateQuestBadge();
      void refreshMailBadge();
    } catch {
      if (disposed) return;
      toast('Cannot reach the server — retrying…', 'warn');
      setTimeout(() => void boot(), 3000);
    }
  };
  void boot();

  // authoritative-state poller: dirty countdowns sync fast, full refresh every 30s
  let lastFull = Date.now();
  const poll = window.setInterval(() => {
    if (document.hidden || G.battle || sync.inflight) return;
    const stale = Date.now() - lastFull > 30_000;
    if (!sync.dirty && !stale) return;
    sync.dirty = false;
    lastFull = Date.now();
    sync.inflight = true;
    api
      .me()
      .then((p) => {
        hydrate(p);
        renderHUD();
        updateQuestBadge();
        refreshSheet();
      })
      .catch(() => {
        /* transient network error — the next poll retries */
      })
      .finally(() => {
        sync.inflight = false;
      });
  }, 1000);
  const mailPoll = window.setInterval(() => {
    if (!document.hidden && !G.battle) void refreshMailBadge();
  }, 60_000);

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
    try {
      render();
    } catch (e) {
      // one bad frame must never kill the loop
      console.error('render error:', e);
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    clearInterval(poll);
    clearInterval(mailPoll);
    MUSIC.stop();
    disposeBattle();
    disposeCamera();
    resetVillageUnits();
    world.ground = null;
    document.documentElement.classList.remove('wc-play');
    root.innerHTML = '';
  };
}
