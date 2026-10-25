/* Terra Nova — everything made of HTML: sign-in, top bar, toolbar, hints, notes and menus. */
(function () {
  const Farm = window.Farm;
  const { $, $$, el, money, clamp } = Farm;
  const UI = (Farm.ui = {});
  const G = () => Farm.game;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  UI.esc = esc;

  const show = (node, on) => node.classList.toggle("hidden", !on);

  /* ================= sign-in and choosing a place ================= */
  let playerName = "";

  function fitTag(loc, id) {
    const f = loc.fit[id];
    return f >= 1.1 ? ["Thrives here", "good"] : f >= 0.95 ? ["Does well", "ok"] : ["Tricky here", "meh"];
  }

  function showStep(which) {
    ["name", "welcome", "places"].forEach((n) => show($("#step-" + n), n === which));
  }

  async function onName(e) {
    e.preventDefault();
    const name = $("#name-input").value.trim().replace(/\s+/g, " ");
    if (!Farm.slug(name)) return;
    playerName = name;
    showStep("welcome");
    $("#step-welcome").innerHTML = `<p class="lead">Looking for your farm…</p>`;
    const res = await Farm.storage.load(Farm.slug(name));
    if (res.state && res.state.plots) {
      const st = Farm.sim.repair(res.state);
      const loc = Farm.LOCATIONS[st.loc];
      const box = $("#step-welcome");
      box.innerHTML = `
        <p class="lead">Welcome back, <b>${esc(st.name || name)}</b>! 🌻</p>
        <div class="resume">
          <b>${esc(loc.name)}</b>
          <span>Year ${Farm.sim.year(st)} · ${Farm.SEASONS[Farm.sim.season(st)]} · 🪙 ${money(st.money)}</span>
          <span class="small">${res.source === "cloud" ? "☁️ Loaded from the shared save" : "💾 Loaded from this device"}${res.offline ? " (the online save couldn't be reached)" : ""}</span>
        </div>
        <div class="row">
          <button class="btn big" id="resume">Continue farming</button>
          <button class="link" id="restart">Start a brand-new farm</button>
        </div>
        <button class="link" id="welcome-back">← Different name</button>`;
      $("#resume").onclick = () => G().start(st);
      let sure = false;
      $("#restart").onclick = () => {
        if (!sure) {
          sure = true;
          $("#restart").textContent = "This replaces your saved farm. Click again to confirm.";
          return;
        }
        showPlaces();
      };
      $("#welcome-back").onclick = () => showStep("name");
    } else showPlaces();
  }

  function showPlaces() {
    showStep("places");
    $("#places-lead").innerHTML = `Nice to meet you, <b>${esc(playerName)}</b>. Where will your farm be?`;
    const box = $("#places");
    box.innerHTML = "";
    for (const loc of Object.values(Farm.LOCATIONS)) {
      const crops = loc.crops
        .map((id) => {
          const c = Farm.CROPS[id], [t, k] = fitTag(loc, id);
          return `<li><span>${c.icon} ${c.name.replace(/ \(.*\)/, "")}</span><em class="${k}">${t}</em></li>`;
        })
        .join("");
      const card = el("div", "place");
      card.innerHTML = `
        <div class="hero" style="background:linear-gradient(180deg,${loc.hero[0]},${loc.hero[1]} 62%)">
          <i class="sun"></i><i class="hill a" style="background:${loc.hero[2]}"></i><i class="hill b" style="background:${loc.hero[1]}"></i>
        </div>
        <div class="pbody">
          <h3>${loc.name}</h3>
          <p class="tag">${loc.tag}</p>
          <div class="soilbar" title="Sand ${loc.sand}% · Silt ${loc.silt}% · Clay ${loc.clay}%">
            <i class="sand" style="width:${loc.sand}%"></i><i class="silt" style="width:${loc.silt}%"></i><i class="clay" style="width:${loc.clay}%"></i>
          </div>
          <div class="soillegend"><span>sand</span><span>silt</span><span>clay</span></div>
          <p class="soilnote"><b>${loc.soilName}.</b> ${loc.soilNote}</p>
          <ul class="crops">${crops}</ul>
          <button class="btn">Settle here</button>
        </div>`;
      card.querySelector(".btn").onclick = () => G().start(Farm.sim.newState(playerName, loc.id));
      box.appendChild(card);
    }
  }

  async function loadNeighbours() {
    const box = $("#neighbours");
    const list = await Farm.storage.neighbours();
    if (!list.length) return show(box, false);
    show(box, true);
    box.innerHTML =
      `<h4>${Farm.storage.isCloud() ? "Farmers in the neighbourhood" : "Farms saved on this device"}</h4>` +
      list
        .map((n) => {
          const loc = Farm.LOCATIONS[n.loc];
          return `<button type="button" class="neighbour" data-name="${esc(n.name)}"><b>${esc(n.name)}</b><span>${loc ? loc.name.split(",")[0] : ""} · year ${n.year || 1} · soil ${n.soil || 0}%</span></button>`;
        })
        .join("");
    $$(".neighbour", box).forEach((b) => (b.onclick = () => { $("#name-input").value = b.dataset.name; $("#name-input").focus(); }));
  }

  function openTitle() {
    show($("#title"), true);
    showStep("name");
    $("#name-input").value = Farm.storage.lastName();
    $("#save-mode").innerHTML = Farm.storage.isCloud()
      ? "☁️ Your farm is saved online. Come back any time and type the same name to carry on."
      : "💾 Your farm is saved on this device. (Online saving for friends isn't switched on yet.)";
    loadNeighbours();
  }

  /* ================= top bar ================= */
  let lastSig = {};
  function setIf(key, val, fn) {
    if (lastSig[key] !== val) { lastSig[key] = val; fn(val); }
  }

  UI.frame = function () {
    const g = G(), s = g.state;
    if (!s) return;
    const S = Farm.sim;
    setIf("coins", Math.round(s.money), (v) => ($("#hud-coins").textContent = v.toLocaleString("en-US")));
    setIf("season", S.season(s), (v) => {
      $("#cal-season").textContent = Farm.SEASONS[v];
      document.body.dataset.season = v;
    });
    setIf("year", S.year(s), (v) => ($("#cal-year").textContent = v));
    $("#cal-marker").style.left = S.yearProg(s) * 100 + "%";
    const sig = [g.ui.tool, g.ui.seed, g.ui.waterMode, g.ui.soil, s.bucket, s.bucketCap, Math.floor(s.money / 5), JSON.stringify(s.inv), s.bin.ready].join("|");
    setIf("sig", sig, () => { renderTray(); renderHint(); });
  };

  function renderHint() {
    const g = G(), u = g.ui, s = g.state;
    let t = "";
    if (u.tool === "hand") t = "Click anywhere to walk. Click ripe plants to harvest, weedy plots to pull weeds.";
    else if (u.tool === "seed") t = u.seed ? `Sowing ${Farm.CROPS[u.seed].name.toLowerCase()}: click a plot with bare soil.` : "Pick something to sow.";
    else if (u.tool === "water") t = u.waterMode === "drip" ? "Click a plot to lay a drip line." : `Bucket ${s.bucket}/${s.bucketCap}: click the hose reel to fill up, then click a plot to water it.`;
    else if (u.tool === "soil") t = `${Farm.MATERIALS[u.soil].name}: click a plot to spread it.`;
    else if (u.tool === "tractor") t = "Click each plot you'd like tilled. Click the tractor again to park it.";
    const h = $("#hint");
    h.textContent = t;
    show(h, !!t);
  }

  /* ================= toolbar and trays ================= */
  let trayOpen = false;
  function renderTray() {
    const g = G(), u = g.ui, s = g.state, tray = $("#tray");
    $$(".tool").forEach((b) => b.classList.toggle("on", b.dataset.tool === u.tool));
    const open = trayOpen && u.tool !== "hand";
    show(tray, open);
    if (!open) return;
    const loc = Farm.LOCATIONS[s.loc];
    let html = "";
    if (u.tool === "seed") {
      html = loc.crops
        .map((id) => {
          const c = Farm.CROPS[id], [t, k] = fitTag(loc, id);
          return `<div class="card ${u.seed === id ? "sel" : ""} ${s.money < c.cost ? "poor" : ""}" data-seed="${id}">
            <div class="ic">${c.icon}</div><b>${c.name}</b>
            <span class="price">${money(c.cost)} · ${c.speed}</span>
            <em class="${k}">${t}</em>
            <small>${c.blurb}</small></div>`;
        })
        .join("");
    } else if (u.tool === "water") {
      const dots = Array.from({ length: s.bucketCap }, (_, i) => `<i class="${i < s.bucket ? "on" : ""}"></i>`).join("");
      html = `<div class="card ${u.waterMode === "bucket" ? "sel" : ""}" data-wm="bucket"><div class="ic">🪣</div><b>Bucket</b><div class="dots">${dots}</div><small>Fill at the hose reel on the left, then pour on a plot.</small></div>
        <div class="card ${u.waterMode === "drip" ? "sel" : ""} ${s.money < Farm.PRICES.drip ? "poor" : ""}" data-wm="drip"><div class="ic">💧</div><b>Drip line</b><span class="price">${money(Farm.PRICES.drip)} per plot</span><small>Waters a plot by itself, slowly, right at the roots.</small></div>`;
      if (s.bucketCap < 8) html += `<div class="card ${s.money < Farm.PRICES.bigBucket ? "poor" : ""}" data-bigbucket="1"><div class="ic">🪣</div><b>Bigger bucket</b><span class="price">${money(Farm.PRICES.bigBucket)}</span><small>Eight pours per fill instead of four.</small></div>`;
    } else if (u.tool === "soil") {
      html = Object.values(Farm.MATERIALS)
        .map((m) => `<div class="card ${u.soil === m.id ? "sel" : ""}" data-soil="${m.id}">
            <div class="ic">${m.icon}</div><b>${m.name}</b>
            <span class="price">You have ${s.inv[m.id]}</span>
            <small>${m.blurb}</small>
            <button class="buy ${s.money < m.price ? "poor" : ""}" data-buy="${m.id}">Buy +1 · ${money(m.price)}</button></div>`)
        .join("");
    } else if (u.tool === "tractor") {
      html = `<div class="card wide"><div class="ic">🚜</div><b>Tractor</b><small>Click each plot you want tilled and the tractor will drive over, one after another.</small><button class="buy" data-park="1">Park the tractor</button></div>`;
    }
    tray.innerHTML = html;
    $$("[data-seed]", tray).forEach((c) => (c.onclick = () => { g.ui.seed = c.dataset.seed; Farm.sound.blip(500, 0.06, "triangle", 0.04); }));
    $$("[data-wm]", tray).forEach((c) => (c.onclick = () => { g.ui.waterMode = c.dataset.wm; }));
    $$("[data-soil]", tray).forEach((c) => (c.onclick = () => { g.ui.soil = c.dataset.soil; }));
    $$("[data-buy]", tray).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); g.buy(b.dataset.buy); }));
    $$("[data-bigbucket]", tray).forEach((c) => (c.onclick = () => g.buyBucket()));
    $$("[data-park]", tray).forEach((b) => (b.onclick = () => g.setTool("hand")));
  }

  function bindToolbar() {
    $$(".tool").forEach((b) => {
      b.onclick = () => {
        const t = b.dataset.tool, g = G();
        if (g.ui.tool === t && t !== "hand") trayOpen = !trayOpen;
        else trayOpen = t !== "hand" && t !== "tractor";
        g.setTool(t);
        lastSig.sig = null;
        renderTray(); renderHint();
      };
    });
    $$("#speed button").forEach((b) => (b.onclick = () => G().setSpeed(+b.dataset.speed)));
    Farm.on("speed", (n) => $$("#speed button").forEach((b) => b.classList.toggle("on", +b.dataset.speed === n)));
    Farm.on("toolchange", () => { lastSig.sig = null; });
    Farm.on("inventory", () => { lastSig.sig = null; });
    document.addEventListener("keydown", (e) => {
      if (!G().state || e.target.tagName === "INPUT") return;
      const map = { 1: "hand", 2: "seed", 3: "water", 4: "soil", 5: "tractor" };
      if (map[e.key]) { trayOpen = map[e.key] !== "hand" && map[e.key] !== "tractor"; G().setTool(map[e.key]); lastSig.sig = null; }
      else if (e.key === "Escape") { trayOpen = false; G().setTool("hand"); closeModal(); lastSig.sig = null; }
      else if (e.key === " ") { e.preventDefault(); G().setSpeed(G().ui.speed === 0 ? 1 : 0); }
    });
  }

  /* ================= tooltips ================= */
  UI.plotTip = function (i) {
    const s = G().state, pl = s.plots[i], S = Farm.sim, loc = Farm.LOCATIONS[s.loc];
    let title, extra = "";
    if (pl.crop) {
      const d = Farm.CROPS[pl.crop.type];
      title = `${d.icon} ${d.name}`;
      if (pl.crop.dead) extra = "Withered. Click to clear.";
      else if (S.isRipe(pl)) extra = "Ripe! Click to harvest.";
      else if (d.kind === "tree") extra = pl.crop.age < 1 ? `Growing up: ${Math.round(pl.crop.age * 100)}%` : `Making fruit: ${Math.round(pl.crop.fruit * 100)}%`;
      else extra = `Growing: ${Math.round(pl.crop.p * 100)}%`;
    } else if (pl.smothering) { title = "🍂 Smothering the grass"; extra = `${Math.round(pl.smother * 100)}% done`; }
    else if (pl.prep === "grass") { title = "🌿 Grassy patch"; extra = "Prepare it before sowing."; }
    else { title = "🟫 Bare soil"; extra = "Ready for seeds."; }
    return `<b>${title}</b><br>${extra}<ul>
      <li>💧 ${S.waterLabel(pl.moist)}</li>
      <li>🪱 ${S.lifeLabel(pl.life)}</li>
      <li>🌱 Fertility ${pl.fert < 30 ? "low" : pl.fert < 60 ? "medium" : "high"}</li>
      <li>🧣 ${S.mulchLabel(pl.mulch)}</li>
      <li>🌿 ${S.weedLabel(pl.weeds)}</li>${pl.drip ? "<li>💧 Drip line</li>" : ""}</ul>`;
  };
  let tipTimer = 0;
  UI.showTip = function (html, x, y, ms) {
    const t = $("#tip");
    t.innerHTML = html;
    show(t, true);
    const w = t.offsetWidth, h = t.offsetHeight;
    t.style.left = clamp(x + 16, 8, innerWidth - w - 8) + "px";
    t.style.top = clamp(y + 16, 60, innerHeight - h - 100) + "px";
    clearTimeout(tipTimer);
    if (ms) tipTimer = setTimeout(UI.hideTip, ms);
  };
  UI.hideTip = () => show($("#tip"), false);

  /* ================= toasts, notes and menus ================= */
  UI.toast = function (msg) {
    const box = $("#toasts");
    const t = el("div", "toast", esc(msg));
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => t.classList.add("out"), 5200);
    setTimeout(() => t.remove(), 5800);
  };

  const lessonQueue = [];
  let lessonShowing = false;
  function showNextLesson() {
    if (lessonShowing || !lessonQueue.length) return;
    const L = lessonQueue.shift();
    lessonShowing = true;
    const box = $("#lesson");
    box.innerHTML = `<div class="lhead"><span>💡 New field note</span></div><h4>${L.icon} ${L.title}</h4><p>${L.text}</p><button class="btn small">Got it</button>`;
    show(box, true);
    box.classList.remove("in");
    void box.offsetWidth;
    box.classList.add("in");
    const close = () => { clearTimeout(timer); show(box, false); lessonShowing = false; setTimeout(showNextLesson, 700); };
    const timer = setTimeout(close, 26000);
    box.querySelector("button").onclick = close;
  }
  function onLesson(id) {
    const s = G().state;
    if (!s || s.lessons[id]) return;
    const L = Farm.LESSONS.find((l) => l.id === id);
    if (!L) return;
    s.lessons[id] = Math.floor(s.day) + 1; // day the note was found (never 0, so it always counts as found)
    G().markDirty();
    $("#notes-count").textContent = Object.keys(s.lessons).length;
    lessonQueue.push(L);
    showNextLesson();
  }

  function openModal(html, bind) {
    $("#modal-card").innerHTML = html;
    show($("#modal"), true);
    $$("[data-close]").forEach((b) => (b.onclick = closeModal));
    if (bind) bind();
  }
  function closeModal() { show($("#modal"), false); }

  function openJournal() {
    const s = G().state;
    const found = Object.keys(s.lessons).length;
    const cards = Farm.LESSONS.map((L) =>
      s.lessons[L.id]
        ? `<div class="note"><h4>${L.icon} ${L.title}</h4><p>${L.text}</p></div>`
        : `<div class="note locked"><h4>🔒 ???</h4><p>${L.hint}</p></div>`
    ).join("");
    openModal(`<div class="mhead"><h2>📖 Field notes</h2><span>${found} of ${Farm.LESSONS.length} found</span><button class="x" data-close>✕</button></div>
      <p class="small">You find a note when you try something for the first time. Everything here is how soil really works.</p>
      <div class="notes">${cards}</div>`);
  }

  function openMenu() {
    const s = G().state;
    const status = Farm.storage.isCloud() ? "☁️ Saved online" : "💾 Saved on this device";
    openModal(`<div class="mhead"><h2>${esc(s.name)}'s farm</h2><button class="x" data-close>✕</button></div>
      <p class="small" id="menu-status">${status}. Your farm saves by itself every few seconds.</p>
      <div class="menu">
        <button class="btn" id="m-save">Save now</button>
        <button class="btn" id="m-sound">Sound: ${Farm.sound.on ? "on" : "off"}</button>
        <button class="btn" id="m-notes">📖 Field notes</button>
        <button class="btn alt" id="m-switch">Switch farmer</button>
      </div>`, () => {
      $("#m-save").onclick = async () => { await G().save(); $("#menu-status").textContent = "Saved ✓"; };
      $("#m-sound").onclick = (e) => { Farm.sound.on = !Farm.sound.on; e.target.textContent = "Sound: " + (Farm.sound.on ? "on" : "off"); };
      $("#m-notes").onclick = openJournal;
      $("#m-switch").onclick = async () => { closeModal(); await G().stop(); };
    });
  }

  function dotFor(status) {
    const dot = $("#hud-name .dot");
    if (!dot) return;
    dot.className = "dot " + status;
    dot.title = { saving: "Saving…", cloud: "Saved online", device: "Saved on this device", offline: "Online save unreachable; saved on this device" }[status] || "";
  }

  /* ================= wiring ================= */
  UI.init = function () {
    $("#name-form").onsubmit = onName;
    $("#places-back").onclick = () => showStep("name");
    $("#btn-journal").onclick = openJournal;
    $("#btn-menu").onclick = openMenu;
    $("#modal").onclick = (e) => { if (e.target.id === "modal") closeModal(); };
    bindToolbar();

    Farm.on("toast", UI.toast);
    Farm.on("lesson", onLesson);
    Farm.on("started", () => {
      const s = G().state;
      show($("#title"), false);
      ["#hud", "#toolbar"].forEach((q) => show($(q), true));
      $("#hud-name").innerHTML = `<i class="dot device"></i>${esc(s.name)}'s farm`;
      $("#notes-count").textContent = Object.keys(s.lessons).length;
      trayOpen = false;
      lastSig = {};
      $$("#speed button").forEach((b) => b.classList.toggle("on", +b.dataset.speed === 1));
      G().save();
      const loc = Farm.LOCATIONS[s.loc];
      if (s.day < 3) Farm.toast(`Welcome to ${loc.name.split(",")[0]}! Start by preparing a patch of grass: use the tractor, or smother it with mulch.`);
      else Farm.toast(`Welcome back, ${s.name}! Your farm kept all its progress.`);
    });
    Farm.on("stopped", () => {
      ["#hud", "#toolbar", "#hint", "#tray", "#lesson"].forEach((q) => show($(q), false));
      $("#toasts").innerHTML = "";
      UI.hideTip();
      lessonQueue.length = 0;
      lessonShowing = false;
      openTitle();
    });
    Farm.on("savestatus", dotFor);
    Farm.on("season", (i) => {
      const msg = ["🌸 Spring has arrived. The soil warms up.", "☀️ Summer! Long days, and the soil dries out fast.", "🍂 Autumn. Harvest time and falling leaves.", "❄️ Winter. Things slow down."][i];
      Farm.toast(msg);
      G().markDirty();
    });
    Farm.on("year", (y) => Farm.toast(`🎉 A whole year on the farm! Welcome to year ${y}.`));
    Farm.on("ripe", (i) => {
      const pl = G().state.plots[i];
      if (!pl.crop) return;
      Farm.toast(`${Farm.CROPS[pl.crop.type].icon} Plot ${i + 1} is ripe! Click it to harvest.`);
      Farm.sound.blip(880, 0.2, "sine", 0.04, 1200);
    });
    Farm.on("smothered", (i) => Farm.toast(`🌱 Plot ${i + 1}: the grass has rotted down under the mulch. The soil is ready to sow!`));
    Farm.on("binready", () => { if (!lastSig.binToast) { lastSig.binToast = 1; Farm.toast("🧺 Compost is ready in the bin (bottom-left). Click it to collect."); } });
    Farm.on("inspect", (i) => {
      const r = Farm.view.worldToScreen(Farm.world.plots[i].x + Farm.world.plots[i].w / 2, Farm.world.plots[i].y + 40);
      UI.showTip(UI.plotTip(i), r.x, r.y, 5000);
    });

    openTitle();
  };
})();
