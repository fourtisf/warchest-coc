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
    <div class="disp" id="introLogoWrap"><div class="logo disp">WARCHEST</div></div>
    <div class="tag">BUILD · RAID · EARN</div>
    <div class="feat"><div class="fi">🏰</div><div><b>Build your warcamp.</b> Mine Gold, harvest Mana, wall it all in before raiders come knocking.</div></div>
    <div class="feat"><div class="fi">⚔️</div><div><b>Raid enemy bases.</b> Train an army, deploy at the edges, and let the AI fight. 50% = ★, destroy the Keep = ★, 100% = ★★★.</div></div>
    <div class="feat"><div class="fi">◆</div><div><b>Earn $WAR on-chain.</b> Raids and quests pay out $WAR — spend it to rush timers or hire builders. Wallet layer is mocked in this build.</div></div>
    <div class="note">⚡ Prototype build — upgrade & training timers are accelerated ~200× so you can feel the full loop in minutes. Progress is session-only.</div>
    <button class="btn" id="introGo" style="width:100%;margin-top:16px;padding:13px;font-size:15px">⚔️ Enter Village</button>
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
    <div class="sub">GameFi layer — mocked for this prototype. Production build settles $WAR on-chain.</div>
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
    <div class="sub">WARCHEST v0.1 · COC-style GameFi prototype</div>
    <div class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px dashed rgba(255,255,255,.08)">
      <span style="font-weight:600">Sound effects</span><button class="btn ghost" id="sfxToggle">On</button>
    </div>
    <div class="row" style="justify-content:space-between;padding:10px 0">
      <span style="font-weight:600">Reset village</span><button class="btn red" id="resetBtn">Reset</button>
    </div>
  </div>
</div>

<div id="toasts"></div>
`;
