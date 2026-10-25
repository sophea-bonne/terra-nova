/* Terra Nova — the render loop and mouse/touch input. */
(function () {
  const Farm = window.Farm;
  const { clamp } = Farm;
  const W = Farm.world;
  const A = Farm.art;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const view = (Farm.view = { s: 1, ox: 0, oy: 0, dpr: 1, w: 0, h: 0 });

  view.worldToScreen = (x, y) => ({ x: view.ox + x * view.s, y: view.oy + y * view.s });
  const toWorld = (sx, sy) => ({ x: (sx - view.ox) / view.s, y: (sy - view.oy) / view.s });

  function resize() {
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    canvas.style.width = view.w + "px";
    canvas.style.height = view.h + "px";
    view.s = Math.min(view.w / Farm.W, view.h / Farm.H);
    view.ox = (view.w - Farm.W * view.s) / 2;
    view.oy = (view.h - Farm.H * view.s) / 2;
  }
  window.addEventListener("resize", resize);
  resize();

  /* a pretty little farm to look at behind the sign-in screen */
  const demo = Farm.sim.newState("Farmer", "sunnyvale");
  (function () {
    const P = demo.plots;
    P[0].prep = "bare"; P[0].till = true; P[0].tillAmt = 1; P[0].crop = { type: "wheat", p: 0.75, age: 0, fruit: 0, stress: 0, fed: false, dead: false };
    P[1].prep = "bare"; P[1].mulch = 60; P[1].crop = { type: "wheat", p: 0.3, age: 0, fruit: 0, stress: 0, fed: false, dead: false };
    P[2].prep = "bare"; P[2].mulch = 90; P[2].mulchType = "chips"; P[2].crop = { type: "apple", p: 0, age: 0.8, fruit: 0.7, stress: 0, fed: false, dead: false };
    P[3].prep = "bare"; P[3].mulch = 70; P[3].life = 80;
    P[5].prep = "bare"; P[5].mulch = 90; P[5].mulchType = "chips"; P[5].crop = { type: "citrus", p: 0, age: 1, fruit: 1, stress: 0, fed: false, dead: false };
    P.forEach((p) => (p.moist = 70));
  })();
  const demoFarmer = { x: 860, y: 590, face: "down", walking: false, phase: 0, pose: "none", poseT: 0, carry: false, level: 0 };
  const demoTractor = { x: Farm.world.park.x, y: Farm.world.park.y, face: "left", wheel: 0, rot: 0 };

  /* ---------- weather ---------- */
  const DROPS = Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random(), s: 0.7 + Math.random() * 0.6 }));

  function weather(st, time) {
    const w = view.w, h = view.h, S = Farm.sim;
    const season = S.season(st);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    if (season === 2) { ctx.fillStyle = "rgba(255,170,60,.06)"; ctx.fillRect(0, 0, w, h); }
    if (season === 3) { ctx.fillStyle = "rgba(170,205,255,.1)"; ctx.fillRect(0, 0, w, h); }
    if (st.weather.wind > 0) {
      ctx.strokeStyle = "rgba(255,245,220,.5)";
      ctx.lineWidth = 1.5;
      for (const d of DROPS.slice(0, 40)) {
        const x = ((d.x + time * 0.9 * d.s) % 1.2) * w - 0.1 * w, y = d.y * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 46 * d.s, y + Math.sin(time * 4 + d.x * 20) * 3);
        ctx.stroke();
      }
    }
    if (!st.weather.raining) return;
    const snow = Farm.LOCATIONS[st.loc].frost && season === 3;
    ctx.fillStyle = snow ? "rgba(210,225,240,.12)" : "rgba(50,70,100,.14)";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(200,220,245,.55)";
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.lineWidth = 1.3;
    for (const d of DROPS) {
      const t = (time * (snow ? 0.15 : 1.1) * d.s + d.y) % 1;
      const x = ((d.x + (snow ? Math.sin(time + d.y * 9) * 0.01 : t * 0.06)) % 1) * w;
      const y = t * h;
      if (snow) { ctx.beginPath(); ctx.arc(x, y, 2.2 * d.s, 0, 7); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 14); ctx.stroke(); }
    }
  }

  /* ---------- drawing the world ---------- */
  const slotCache = {};
  function slotsFor(i, type) {
    const k = i + ":" + type;
    return slotCache[k] || (slotCache[k] = Farm.sim.slots(i, type));
  }
  const TREES = [[48, 262, 30], [66, 462, 26], [1236, 452, 28], [1214, 586, 30], [34, 606, 27], [830, 612, 22], [560, 604, 20]];

  function draw(time) {
    const g = Farm.game;
    const live = !!g.state;
    const st = g.state || demo;
    const S = Farm.sim;
    const vis = { x0: -view.ox / view.s, y0: -view.oy / view.s, x1: (view.w - view.ox) / view.s, y1: (view.h - view.oy) / view.s };
    ctx.setTransform(view.dpr * view.s, 0, 0, view.dpr * view.s, view.dpr * view.ox, view.dpr * view.oy);

    A.ground(ctx, st, vis);
    A.treeline(ctx, st, vis);
    A.fence(ctx, vis);

    const queued = live ? Farm.actors.queuedPlots() : new Set();
    st.plots.forEach((_, i) => {
      const hov = live && g.hover === i ? g.hoverState(i) : null;
      A.plotGround(ctx, st, i, time, hov, queued.has(i));
    });

    /* everything standing up gets sorted by its feet so nearer things cover farther ones */
    const ents = [];
    const colors = A.colors(st);
    st.plots.forEach((pl, i) => {
      if (!pl.crop) return;
      slotsFor(i, pl.crop.type).forEach((slot) => ents.push({ y: slot.y, f: () => Farm.plants.draw(ctx, st, pl, slot, time) }));
    });
    const loc = Farm.LOCATIONS[st.loc];
    const yard = loc.kit === "rototiller";
    ents.push({ y: W.barn.y, f: () => A.barn(ctx, W.barn.x, W.barn.y, loc.scale === "yard" ? 0.62 : 1) });
    ents.push({ y: 346, f: () => { A.hay(ctx, 1230, 336); A.hay(ctx, 1198, 350); } });
    ents.push({ y: W.hose.y, f: () => A.hose(ctx, W.hose.x, W.hose.y, live && st.bucket === 0 && g.ui.tool === "water", time) });
    ents.push({ y: W.bin.y, f: () => A.bin(ctx, W.bin.x, W.bin.y, st.bin, time) });
    ents.push({ y: W.sign.y, f: () => A.sign(ctx, W.sign.x, W.sign.y, st.name) });
    TREES.forEach(([x, y, r]) => ents.push({ y, f: () => A.blobTree(ctx, x, y - r, r, colors.leaf, 0.5) }));

    const farmer = live ? Farm.actors.farmer : demoFarmer;
    const tractor = live ? Farm.actors.tractor : demoTractor;
    const mounted = live && farmer.mounted;
    if (!mounted || yard) {
      const carry = live && !mounted && (st.bucket > 0 || ["water", "fill"].includes(Farm.actors.currentJobType()));
      let f = farmer;
      if (mounted && yard) {
        // walking behind the rototiller, hands on the handlebars
        const dir = tractor.face === "left" ? -1 : 1;
        f = Object.assign({}, farmer, { x: tractor.x - dir * 56, y: tractor.y, face: dir < 0 ? "left" : "right", walking: tractor.driving, phase: time * 9, pose: "none" });
      }
      ents.push({
        y: f.y + 1,
        f: () => A.farmer(ctx, Object.assign({}, f, { carry, level: live ? st.bucket / st.bucketCap : 0 }), time),
      });
    }
    ents.push({ y: tractor.y + 1, f: () => (yard ? A.rototiller(ctx, tractor, time) : A.tractor(ctx, tractor, time, mounted)) });

    ents.sort((a, b) => a.y - b.y).forEach((e) => e.f());

    if (live) Farm.actors.fx.draw(ctx);
    st.plots.forEach((_, i) => A.plotStrip(ctx, st, i, time));

    const hl = Farm.view.highlight;
    if (hl) {
      const pulse = 3 + Math.sin(time * 6) * 2;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(255,220,80,.95)";
      ctx.shadowBlur = 14;
      A.rr(ctx, hl.x - pulse, hl.y - pulse, hl.w + pulse * 2, hl.h + pulse * 2, 10);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    weather(st, time);
  }

  Farm.draw = draw; // handy for profiling in the console

  /* ---------- input ---------- */
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return toWorld(e.clientX - r.left, e.clientY - r.top);
  }
  canvas.addEventListener("click", (e) => {
    if (!Farm.game.state || Farm.introActive) return;
    Farm.ui.hideTip();
    const p = pos(e);
    Farm.game.click(p.x, p.y);
  });
  canvas.addEventListener("pointermove", (e) => {
    const g = Farm.game;
    if (!g.state || e.pointerType === "touch") return;
    const p = pos(e);
    const i = g.plotAt(p.x, p.y);
    g.hover = i;
    let cur = "default", tip = null;
    if (i >= 0) {
      cur = g.hoverState(i) === "bad" ? "not-allowed" : "pointer";
      tip = Farm.ui.plotTip(i);
    } else if (g.hitTractor(p.x, p.y)) { cur = "pointer"; tip = "<b>🚜 Tractor</b><br>Click to climb on and till plots."; }
    else if (g.hitHose(p.x, p.y)) { cur = "pointer"; tip = "<b>💧 Hose reel</b><br>Click to fill your bucket."; }
    else if (g.hitBin(p.x, p.y)) {
      cur = "pointer";
      const b = g.state.bin;
      tip = `<b>🧺 Compost bin</b><br>${b.ready} ready · ${b.raw} still cooking<br><small>Weeds and plant waste end up here.</small>`;
    }
    canvas.style.cursor = cur;
    if (tip) Farm.ui.showTip(tip, e.clientX, e.clientY);
    else Farm.ui.hideTip();
  });
  canvas.addEventListener("pointerleave", () => { Farm.game.hover = -1; Farm.ui.hideTip(); });

  /* ---------- main loop ---------- */
  let last = performance.now(), time = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    if (Farm.game.state) Farm.game.update(dt);
    else demo.day += dt * 2; // the sign-in backdrop quietly cycles through the seasons
    draw(time);
    Farm.ui.frame();
    requestAnimationFrame(frame);
  }

  Farm.ui.init();
  requestAnimationFrame(frame);
})();
