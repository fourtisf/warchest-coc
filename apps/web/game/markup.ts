// Extracted verbatim from reference/warchest-prototype.html (<body> markup, sans <script>).
export const GAME_MARKUP = `<canvas id="game"></canvas>

<!-- VILLAGE HUD -->
<div class="hud" id="hudTop">
  <div id="hudTopL">
    <div class="chip"><div class="ico g">🪙</div><div><div class="val" id="vGold">0</div><div class="bar"><i id="bGold" style="background:linear-gradient(90deg,#c98a12,var(--gold2))"></i></div></div></div>
    <div class="chip"><div class="ico m">🔮</div><div><div class="val" id="vMana">0</div><div class="bar"><i id="bMana" style="background:linear-gradient(90deg,#5a2ea6,var(--mana2))"></i></div></div></div>
    <div class="chip small"><div class="ico w">◆</div><div><div class="val" id="vWar">0</div></div></div>
  </div>
  <div id="hudTopR">
    <div class="pill" id="walletBtn"><span class="dot" id="walletDot"></span><span id="walletTxt">Connect Wallet</span></div>
    <div class="row" style="gap:6px">
      <div class="chip small"><div class="ico t">🏆</div><div class="val" id="vTro">0</div></div>
      <div class="pill" id="builderChip">🔨 <span id="vBuild">2/2</span></div>
    </div>
    <div class="row" style="gap:6px">
      <div class="pill" id="questBtn">📜 Quests<span class="badge" id="questBadge">1</span></div>
      <div class="pill" id="lbBtn">🏅</div>
      <a class="pill" id="xBtn" href="https://x.com/Warchestfun" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:var(--txt)"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="display:block"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
      <div class="pill" id="setBtn">⚙️</div>
    </div>
  </div>
</div>

<div class="hud" id="dock">
  <button class="dockBtn dark" id="armyBtn"><span class="em">🗡️</span> Army</button>
  <button class="dockBtn dark" id="shopBtn"><span class="em">🏗️</span> Shop</button>
  <button class="dockBtn raid" id="raidBtn"><span class="em">⚔️</span> RAID</button>
</div>

<!-- BATTLE HUD -->
<div class="hud" id="battleTop">
  <div class="box" id="bTimer">3:00</div>
  <div class="box row" style="gap:12px"><span id="bPct">0%</span><span id="bStars"><span class="s">★</span><span class="s">★</span><span class="s">★</span></span></div>
  <div class="box" id="bLoot"><span style="color:var(--gold2)">🪙 <span id="bLootG">0</span></span><span style="color:var(--mana2)">🔮 <span id="bLootM">0</span></span></div>
  <button class="btn red" id="endBattle" style="margin-left:auto">End Battle</button>
</div>
<div id="deployHint">Pick a unit, then tap outside the red zone to deploy</div>
<div id="troopBar"></div>

<!-- placement confirm -->
<div id="placeUI"><button id="placeOK">✔</button><button id="placeNO">✖</button></div>

<!-- bottom sheet -->
<div id="sheet">
  <div id="sheetHead"><div class="disp" id="sheetTitle">Shop</div><div id="sheetSub"></div><button id="sheetX">✕</button></div>
  <div id="sheetBody"></div>
</div>

<!-- modals -->
<div class="overlay show" id="intro">
  <div class="modal">
    <div class="disp" id="introLogoWrap" style="text-align:center"><img src="/logo.svg" alt="" style="width:88px;height:88px;filter:drop-shadow(0 6px 18px rgba(242,180,48,.4))"><div class="logo disp">WARCHEST</div></div>
    <div class="tag">BUILD · RAID · EARN</div>
    <div class="feat"><div class="fi">🏰</div><div><b>Build your warcamp.</b> Mine Gold, harvest Mana, wall it all in before raiders come knocking.</div></div>
    <div class="feat"><div class="fi">⚔️</div><div><b>Raid enemy bases.</b> Train an army, deploy at the edges, and let the AI fight. 50% = ★, destroy the Keep = ★, 100% = ★★★.</div></div>
    <div class="feat"><div class="fi">◆</div><div><b>Earn $WAR on-chain.</b> Raids and quests pay out $WAR — spend it to rush timers or hire builders, or claim it on-chain to your Solana wallet.</div></div>
    <div class="note">⚔️ Your warcamp is saved to your account. Connect a Solana wallet to secure it, raid real players, and claim $WAR on-chain.</div>
    <div id="nameRow" style="display:none;margin-top:14px">
      <div style="font-weight:700;font-size:13px;margin-bottom:6px">🛡️ Name your commander</div>
      <input id="nameInput" maxlength="16" placeholder="3-16 letters or numbers" autocomplete="nickname"
        style="width:100%;padding:11px 12px;border-radius:10px;border:1px solid rgba(240,180,80,.35);background:rgba(0,0,0,.35);color:var(--txt);font:600 14px Rubik,sans-serif;outline:none" />
      <div id="nameErr" style="display:none;color:var(--bad);font-size:11.5px;margin-top:5px"></div>
    </div>
    <button class="btn" id="introGo" style="width:100%;margin-top:16px;padding:13px;font-size:15px">⚔️ Enter Village</button>
    <a href="https://x.com/Warchestfun" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;color:var(--dim);text-decoration:none;font-size:12.5px;font-weight:600"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="display:block"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> Follow @Warchestfun — drops, seasons &amp; updates</a>
  </div>
</div>

<div class="overlay" id="mm">
  <div class="modal" style="text-align:center">
    <h2 class="disp">Scouting…</h2>
    <div class="sub">Searching the realm for a village to raid</div>
    <div id="mmSpin"></div>
    <div id="mmScout">
      <div class="lootRow"><span>Enemy Keep</span><b id="mmTH" style="color:var(--gold2)">Level 1</b></div>
      <div class="lootRow"><span>Available Gold</span><b style="color:var(--gold2)">🪙 <span id="mmG">0</span></b></div>
      <div class="lootRow"><span>Available Mana</span><b style="color:var(--mana2)">🔮 <span id="mmM">0</span></b></div>
      <div class="row" style="margin-top:16px;gap:10px">
        <button class="btn ghost" id="mmNext" style="flex:1">Next (🪙 50)</button>
        <button class="btn" id="mmGo" style="flex:1.4">⚔️ Attack!</button>
      </div>
      <button class="btn ghost" id="mmHome" style="width:100%;margin-top:10px">Return Home</button>
    </div>
  </div>
</div>

<div class="overlay" id="result">
  <div class="modal">
    <div id="resStars"><span class="s">★</span><span class="s">★</span><span class="s">★</span></div>
    <div id="resTitle" class="disp">Victory!</div>
    <div id="resPct">0% destroyed</div>
    <div class="lootRow"><span>Gold looted</span><b style="color:var(--gold2)">🪙 <span id="resG">0</span></b></div>
    <div class="lootRow"><span>Mana looted</span><b style="color:var(--mana2)">🔮 <span id="resM">0</span></b></div>
    <div class="lootRow"><span>$WAR earned</span><b style="color:var(--war)">◆ <span id="resW">0</span></b></div>
    <div class="lootRow"><span>Trophies</span><b id="resT" style="color:var(--gold2)">+0</b></div>
    <button class="btn" id="resHome" style="width:100%;margin-top:16px;padding:12px">Return Home</button>
  </div>
</div>

<div class="overlay" id="wallet">
  <div class="modal">
    <button class="x" data-close="wallet">✕</button>
    <h2 class="disp">Wallet</h2>
    <div class="sub">Sign in with Solana. $WAR you earn in-game settles on-chain when you claim.</div>
    <div id="walletBody"></div>
  </div>
</div>

<div class="overlay" id="lbModal">
  <div class="modal">
    <button class="x" data-close="lbModal">✕</button>
    <h2 class="disp">Season Leaderboard</h2>
    <div class="sub">Top raiders this season · rewards paid in $WAR</div>
    <div id="lbBody"></div>
  </div>
</div>

<div class="overlay" id="quests">
  <div class="modal">
    <button class="x" data-close="quests">✕</button>
    <h2 class="disp">War Orders <span id="questCount" style="font-size:13px;color:var(--war);vertical-align:middle;margin-left:4px"></span></h2>
    <div class="sub">Complete orders to earn $WAR</div>
    <div id="questBody"></div>
  </div>
</div>

<div class="overlay" id="settings">
  <div class="modal">
    <button class="x" data-close="settings">✕</button>
    <h2 class="disp">Settings</h2>
    <div class="sub">WARCHEST · Build. Raid. Earn. · warchest.fun</div>
    <div class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px dashed rgba(255,255,255,.08)">
      <span style="font-weight:600">Commander</span>
      <span class="row" style="gap:8px"><b id="nameLabel" style="font-size:13px">—</b><button class="btn ghost" id="nameChange">Change</button></span>
    </div>
    <div class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px dashed rgba(255,255,255,.08)">
      <span style="font-weight:600">Player ID</span><b id="pidLabel" style="font-family:monospace;font-size:12.5px;color:var(--dim)">—</b>
    </div>
    <div class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px dashed rgba(255,255,255,.08)">
      <span style="font-weight:600">Music</span><button class="btn ghost" id="musicToggle">On</button>
    </div>
    <div class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px dashed rgba(255,255,255,.08)">
      <span style="font-weight:600">Sound effects</span><button class="btn ghost" id="sfxToggle">On</button>
    </div>
    <div class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px dashed rgba(255,255,255,.08)">
      <span style="font-weight:600">Follow us on X</span>
      <a class="btn ghost" href="https://x.com/Warchestfun" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-flex;align-items:center;gap:7px"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="display:block"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> @Warchestfun</a>
    </div>
    <div class="row" style="justify-content:space-between;padding:10px 0">
      <span style="font-weight:600">Reset village</span><button class="btn red" id="resetBtn">Reset</button>
    </div>
  </div>
</div>

<div id="toasts"></div>
`;
