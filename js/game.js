/* Terra Nova — the game controller: tools, clicks, the clock and saving. */
(function () {
  const Farm = window.Farm;
  const { clamp } = Farm;
  const W = Farm.world;
  const Act = () => Farm.actors;

  const Game = (Farm.game = {
    state: null,
    ui: { tool: "hand", seed: null, waterMode: "bucket", soil: "straw", speed: 1 },
    dirty: false,
    saving: false,
    sinceSave: 0,
    hover: -1,
  });

  Game.markDirty = () => { Game.dirty = true; };

  Game.start = function (state) {
    Game.state = Farm.sim.repair(state);
    const loc = Farm.LOCATIONS[Game.state.loc];
    Farm.world.layout(loc.scale);
    Game.ui = { tool: "hand", seed: null, waterMode: "bucket", soil: "straw", speed: 1 };
    Game.hover = -1;
    Game.sinceSave = 0;
    Act().reset();
    Farm.emit("started");
  };

  Game.stop = async function () {
    if (!Game.state) return;
    await Game.save();
    Game.state = null;
    Farm.emit("stopped");
  };

  /* ---------- clock ---------- */
  Game.update = function (dt) {
    const s = Game.state;
    if (!s) return;
    let days = dt * Game.ui.speed;
    while (days > 0) {
      const step = Math.min(days, 0.25);
      Farm.sim.update(s, step);
      days -= step;
    }
    const fast = Game.ui.speed >= 2 ? 1.6 : 1;
    Act().update(dt * fast);
    Game.sinceSave += dt;
    if (Game.sinceSave > 15) Game.save();
  };

  Game.save = async function (opts) {
    if (!Game.state || Game.saving) return;
    Game.saving = true;
    Game.sinceSave = 0;
    Farm.emit("savestatus", "saving");
    try {
      const status = await Farm.storage.save(Game.state, opts);
      Game.dirty = false;
      Farm.emit("savestatus", status);
    } finally {
      Game.saving = false;
    }
  };

  /* ---------- tools ---------- */
  Game.setTool = function (tool) {
    const A = Act();
    const ui = Game.ui;
    if (tool === "tractor" && Farm.LOCATIONS[Game.state.loc].kit === "none") {
      Farm.lesson("steep");
      Farm.toast("⛰️ These slopes are far too steep for a tractor. It would tip over. You'll have to work the soil another way.");
      return;
    }
    const T = A.tractor, f = A.farmer;
    if (tool !== "tractor") {
      /* leaving the tractor tool doesn't cancel the tilling you lined up: she parks when the queue is done */
      const pending = T.queue.length || T.cur;
      if (!pending) {
        f.queue = f.queue.filter((j) => j.type !== "mount");
        if (f.cur && f.cur.job.type === "mount" && f.cur.stage === "walk") f.cur = null;
      }
      if (A.isMounted() || pending) T.parking = true;
    } else {
      T.parking = false;
      const mounting = f.queue.some((j) => j.type === "mount") || (f.cur && f.cur.job.type === "mount");
      if (!A.isMounted() && !mounting) A.enqueue({ type: "mount" });
    }
    ui.tool = tool;
    Farm.emit("toolchange", tool);
  };

  Farm.on("dismounted", () => {
    if (Game.ui.tool === "tractor") Game.setTool("hand");
  });
  Farm.on("mounted", () => {
    if (Game.ui.tool !== "tractor") return (Act().tractor.parking = true); // she switched tools while climbing up
    Farm.toast("🚜 Tractor ready. Click each plot you want tilled.");
  });

  function jobFor(i, wx) {
    const s = Game.state, ui = Game.ui, pl = s.plots[i], S = Farm.sim;
    let tool = ui.tool;
    if (tool === "seed" && !ui.seed) tool = "hand"; // no seed picked: clicking a plot clears, weeds or harvests it
    switch (tool) {
      case "hand":
        if (S.isRipe(pl)) return { type: "harvest", plot: i, x: wx };
        if (pl.crop && pl.crop.dead) return { type: "clear", plot: i, x: wx };
        if (pl.weeds >= 15) return { type: "weed", plot: i, x: wx };
        return null;
      case "seed":
        return ui.seed ? { type: "plant", plot: i, x: wx, crop: ui.seed } : null;
      case "water":
        return { type: ui.waterMode === "drip" ? "drip" : "water", plot: i, x: wx };
      case "soil":
        if (ui.soil === "compost") return { type: "compost", plot: i, x: wx };
        if (ui.soil === "feed") return { type: "feed", plot: i, x: wx };
        if (ui.soil === "fabric") return { type: "fabric", plot: i, x: wx };
        if (ui.soil === "herbicide") return { type: "herbicide", plot: i, x: wx };
        return { type: "mulch", plot: i, x: wx, mat: ui.soil };
    }
    return null;
  }

  /* 'ok' | 'bad' | 'neutral' | null — drives the outline when hovering a plot */
  Game.hoverState = function (i) {
    const s = Game.state;
    if (!s || i < 0) return null;
    if (Game.ui.tool === "tractor") return Act().tillCheck(i) ? "bad" : "ok";
    const job = jobFor(i, null);
    if (!job) return "neutral";
    return Act().check(job, true) ? "bad" : "ok";
  };

  /* ---------- clicks (world coordinates) ---------- */
  const inBox = (x, y, cx, cy, l, r, u, d) => x >= cx - l && x <= cx + r && y >= cy - u && y <= cy + d;

  Game.plotAt = function (x, y) {
    for (let i = 0; i < W.plots.length; i++) {
      const r = W.plots[i];
      if (x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 14) return i;
    }
    return -1;
  };
  Game.hitTractor = (x, y) => {
    const t = Act().tractor;
    return inBox(x, y, t.x, t.y, 75, 70, 92, 8);
  };
  Game.hitHose = (x, y) => inBox(x, y, W.hose.x, W.hose.y, 56, 56, 80, 12);
  Game.hitBin = (x, y) => inBox(x, y, W.bin.x, W.bin.y, 52, 52, 96, 12);

  Game.click = function (x, y) {
    const s = Game.state;
    if (!s) return;
    const A = Act();
    Farm.sound.blip(0, 0.001, "sine", 0.0001); // wakes the audio context on first tap
    if (Game.hitTractor(x, y)) {
      if (Farm.LOCATIONS[s.loc].kit === "none") return Game.setTool("tractor");
      if (Game.ui.tool === "tractor") A.dismount(); // clicking the tractor itself cancels the rest of the queue and parks it
      Game.setTool(Game.ui.tool === "tractor" ? "hand" : "tractor");
      return;
    }
    const i = Game.plotAt(x, y);
    if (i >= 0) {
      if (Game.ui.tool === "tractor") return A.queueTill(i);
      const job = jobFor(i, x);
      if (!job) return Farm.emit("inspect", i);
      const err = A.check(job, true);
      if (err) return Farm.toast(err);
      return A.enqueue(job);
    }
    if (Game.hitHose(x, y)) {
      Game.ui.waterMode = "bucket"; // heading to the hose means you're after water
      Game.setTool("water");
      return A.enqueue({ type: "fill" });
    }
    if (Game.hitBin(x, y)) {
      const err = A.check({ type: "bin" });
      if (err) return Farm.toast(err);
      return A.enqueue({ type: "bin" });
    }
    if (Game.ui.tool === "tractor") {
      return Farm.toast("The tractor tills plots. Click a plot, or click the tractor again to park it.");
    }
    A.walkTo(x, y);
  };

  /* ---------- shopping ---------- */
  Game.buy = function (kind) {
    const s = Game.state, m = Farm.MATERIALS[kind], price = Farm.sim.matPrice(s, kind);
    if (s.money < price) return Farm.toast(`${m.name} costs ${Farm.money(price)}.`);
    s.money -= price;
    s.inv[kind] += 1;
    Farm.sound.blip(520, 0.08, "triangle", 0.05, 700);
    Game.markDirty();
    Farm.emit("inventory");
  };
  Game.buyBucket = function () {
    const s = Game.state;
    if (s.bucketCap >= 8) return Farm.toast("You already have the big bucket.");
    const price = Farm.sim.cost(s, Farm.PRICES.bigBucket);
    if (s.money < price) return Farm.toast(`A bigger bucket costs ${Farm.money(price)}.`);
    s.money -= price;
    s.bucketCap = 8;
    Farm.toast("🪣 Bigger bucket! Eight pours per fill.");
    Game.markDirty();
    Farm.emit("inventory");
  };

  /* ---------- levels ---------- */
  /* Starts a fresh farm in another place; field notes, unlocked levels and your name carry over. */
  Game.travel = async function (locId) {
    const s = Game.state;
    if (!s) return;
    await Game.save();
    const next = Farm.sim.newState(s.name, locId, { progress: s.progress, lessons: s.lessons });
    Game.start(next);
  };

  /* checks the level goals; returns the list for the UI and unlocks the next level when all are met */
  Game.goals = function () {
    const s = Game.state, goals = Farm.GOALS[s.loc] || [];
    const list = goals.map((g) => ({ text: g.text, val: Math.min(g.max, g.val(s)), max: g.max, done: g.val(s) >= g.max }));
    const all = list.length && list.every((g) => g.done);
    if (all && !s.progress.done[s.loc]) {
      s.progress.done[s.loc] = true;
      const nxt = Farm.LEVELS[Farm.LEVELS.indexOf(s.loc) + 1];
      if (nxt && s.progress.unlocked.indexOf(nxt) < 0) s.progress.unlocked.push(nxt);
      Game.markDirty();
      Game.save();
      Farm.emit("leveldone", nxt);
    }
    return list;
  };

  Game.setSpeed = function (n) {
    Game.ui.speed = n;
    Farm.emit("speed", n);
  };

  /* never lose progress when the tab closes */
  window.addEventListener("pagehide", () => Game.state && Game.save({ keepalive: true }));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && Game.state) Game.save({ keepalive: true });
  });
})();
