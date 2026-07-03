/** Top HUD, battle HUD and troop bar — ported verbatim from the prototype. */
import { SPELL, SPELL_ORDER, TROOP, TROOP_ORDER, clamp, fmt, mmss } from '@warchest/game-core';
import { getIcon } from '../art/icons';
import { $ } from '../dom';
import { SFX } from '../sfx';
import { G, capOf, freeBuilders } from '../state';

export function renderHUD(): void {
  $('vGold').textContent = fmt(G.res.g);
  $('vMana').textContent = fmt(G.res.m);
  $('vWar').textContent = fmt(G.res.w);
  $('bGold').style.width = clamp((G.res.g / capOf('g')) * 100, 0, 100) + '%';
  $('bMana').style.width = clamp((G.res.m / capOf('m')) * 100, 0, 100) + '%';
  $('vTro').textContent = String(G.trophies);
  $('vBuild').textContent = freeBuilders() + '/' + G.buildersTotal;
  $('walletTxt').textContent = G.wallet ? G.wallet.short : 'Connect Wallet';
  $('walletBtn').classList.toggle('off', !G.wallet);
}

export function updBattleHUD(): void {
  const B = G.battle;
  if (!B) return;
  const s = B.sim;
  $('bTimer').textContent = mmss(s.timeLeft);
  $('bPct').textContent = Math.floor(s.pct) + '%';
  const st = $('bStars').children;
  for (let i = 0; i < 3; i++) st[i]!.classList.toggle('on', i < s.stars);
  $('bLootG').textContent = fmt(s.lootG);
  $('bLootM').textContent = fmt(s.lootM);
}

export function buildTroopBar(): void {
  const B = G.battle;
  if (!B) return;
  const bar = $('troopBar');
  bar.innerHTML = '';
  for (const t of TROOP_ORDER) {
    const n = B.sim.army[t];
    if (n <= 0 && G.army[t] <= 0) continue;
    const c = document.createElement('div');
    c.className =
      'tCard' + (B.sel === t && !B.selSpell ? ' sel' : '') + (n <= 0 ? ' empty' : '');
    c.innerHTML = `<span class="cnt">${n}</span><div class="lb">${TROOP[t].n}</div>`;
    const ic = getIcon('t', t);
    const im = document.createElement('img');
    im.src = ic.toDataURL();
    im.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:54px;object-fit:contain;pointer-events:none';
    c.prepend(im);
    c.onclick = () => {
      if (n > 0) {
        B.sel = t;
        B.selSpell = null;
        buildTroopBar();
        SFX.play('tap');
      }
    };
    bar.appendChild(c);
  }
  for (const s of SPELL_ORDER) {
    const n = B.sim.spells[s];
    if (n <= 0 && G.spells[s] <= 0) continue;
    const c = document.createElement('div');
    c.className = 'tCard' + (B.selSpell === s ? ' sel' : '') + (n <= 0 ? ' empty' : '');
    c.innerHTML = `<span class="cnt">${n}</span><div class="lb">${SPELL[s].n}</div>`;
    const em = document.createElement('div');
    em.textContent = SPELL[s].emoji;
    em.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:54px;display:flex;align-items:center;justify-content:center;font-size:30px;pointer-events:none';
    c.prepend(em);
    c.onclick = () => {
      if (n > 0) {
        B.selSpell = s;
        buildTroopBar();
        SFX.play('tap');
      }
    };
    bar.appendChild(c);
  }
}
