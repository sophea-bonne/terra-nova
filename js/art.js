/* Terra Nova — drawing the world: ground, fields, buildings, the farmer and the tractor. */
(function () {
  const Farm = window.Farm;
  const { mix, rgb, clamp, ease } = Farm;
  const A = (Farm.art = {});

  /* ---------- tiny drawing helpers ---------- */
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function ell(ctx, x, y, rx, ry, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  A.rr = rr;

  /* ---------- seasonal colours ---------- */
  const GRASS = [[128, 190, 88], [112, 172, 72], [176, 168, 90], [190, 202, 188]];
  const GRASS_DRY = [[132, 184, 94], [196, 180, 104], [188, 162, 94], [150, 176, 122]];
  const SNOW = [[214, 224, 230], [232, 238, 242]];
  const LEAF = [[112, 180, 78], [78, 150, 60], [214, 144, 54], [150, 160, 144]];

  function blend(arr, s, prog) {
    return mix(arr[s], arr[(s + 1) % 4], clamp((prog - 0.7) / 0.3, 0, 1));
  }
  A.colors = function (st) {
    const S = Farm.sim, loc = Farm.LOCATIONS[st.loc];
    const s = S.season(st), p = S.seasonProg(st);
    let grass = blend(loc.dryGrass ? GRASS_DRY : GRASS, s, p);
    if (loc.frost && s === 3) grass = mix(grass, SNOW[1], 0.9);
    return { grass, leaf: blend(LEAF, s, p), season: s };
  };

  /* ---------- per-plot random bits (not saved) ---------- */
  const VIS = [];
  Farm.on("layout", () => (VIS.length = 0));
  function visual(i) {
    if (VIS[i]) return VIS[i];
    const r = Farm.world.plots[i];
    const rnd = Farm.rng(1000 + i * 77);
    const pts = (n, fn) => Array.from({ length: n }, () => fn());
    VIS[i] = {
      tufts: pts(26, () => ({ x: r.x + 10 + rnd() * (r.w - 20), y: r.y + 10 + rnd() * (r.h - 20), h: 4 + rnd() * 5 })),
      specks: pts(70, () => ({ x: r.x + rnd() * r.w, y: r.y + rnd() * r.h, s: 0.8 + rnd() * 1.6, l: rnd() > 0.5 })),
      straw: pts(160, () => ({ x: r.x + 6 + rnd() * (r.w - 12), y: r.y + 6 + rnd() * (r.h - 12), a: rnd() * Math.PI, l: 7 + rnd() * 8, c: rnd() })),
      chips: pts(110, () => ({ x: r.x + 6 + rnd() * (r.w - 12), y: r.y + 6 + rnd() * (r.h - 12), a: rnd() * 6, s: 2.5 + rnd() * 3, c: rnd() })),
      weeds: pts(18, () => ({ x: r.x + 12 + rnd() * (r.w - 24), y: r.y + 14 + rnd() * (r.h - 22), s: 0.8 + rnd() * 0.7, a: rnd() })),
      clods: pts(46, () => ({ x: r.x + 8 + rnd() * (r.w - 16), y: r.y + 8 + rnd() * (r.h - 16), s: 3 + rnd() * 5, a: rnd() * 3 })),
      worms: pts(5, () => ({ x: r.x + 18 + rnd() * (r.w - 36), y: r.y + 18 + rnd() * (r.h - 36), ph: rnd() * 6, a: rnd() * 3 })),
    };
    return VIS[i];
  }

  /* ---------- background ---------- */
  const PATCHES = (() => {
    const rnd = Farm.rng(42);
    return Array.from({ length: 70 }, () => ({ x: -500 + rnd() * 2300, y: -150 + rnd() * 1100, r: 60 + rnd() * 160, d: rnd() > 0.5 }));
  })();
  const GTUFTS = (() => {
    const rnd = Farm.rng(7);
    return Array.from({ length: 420 }, () => ({ x: -500 + rnd() * 2300, y: -100 + rnd() * 1000, h: 4 + rnd() * 6, f: rnd() }));
  })();

  A.ground = function (ctx, st, vis) {
    const c = A.colors(st);
    const g = ctx.createLinearGradient(0, vis.y0, 0, vis.y1);
    g.addColorStop(0, rgb(c.grass, 0.9));
    g.addColorStop(0.3, rgb(c.grass, 1.0));
    g.addColorStop(1, rgb(c.grass, 0.94));
    ctx.fillStyle = g;
    ctx.fillRect(vis.x0, vis.y0, vis.x1 - vis.x0, vis.y1 - vis.y0);
    for (const p of PATCHES) {
      if (p.x + p.r < vis.x0 || p.x - p.r > vis.x1) continue;
      const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      rg.addColorStop(0, p.d ? "rgba(40,70,20,.10)" : "rgba(255,255,200,.10)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    ctx.lineCap = "round";
    const bloom = c.season === 0 || c.season === 1;
    for (const t of GTUFTS) {
      if (t.x < vis.x0 - 10 || t.x > vis.x1 + 10) continue;
      ctx.strokeStyle = rgb(c.grass, 0.78, 0.7);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(t.x - 3, t.y); ctx.lineTo(t.x - 4, t.y - t.h);
      ctx.moveTo(t.x, t.y); ctx.lineTo(t.x, t.y - t.h - 2);
      ctx.moveTo(t.x + 3, t.y); ctx.lineTo(t.x + 4.5, t.y - t.h);
      ctx.stroke();
      if (bloom && t.f > 0.93) {
        ell(ctx, t.x, t.y - t.h - 2, 2.2, 2.2, t.f > 0.97 ? "#fff6c9" : "#f6a8c0");
      }
    }
  };

  A.treeline = function (ctx, st, vis) {
    const c = A.colors(st);
    if (Farm.LOCATIONS[st.loc].hills) {
      const layers = [[96, 22, 0.011, [170, 148, 92]], [112, 26, 0.008, [188, 160, 98]], [128, 20, 0.014, [205, 176, 108]]];
      layers.forEach(([base, amp, freq, col], li) => {
        const g = ctx.createLinearGradient(0, base - amp, 0, base + 60);
        g.addColorStop(0, rgb(col, 1.1));
        g.addColorStop(1, rgb(col, 0.82));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(vis.x0 - 20, 150);
        for (let x = vis.x0 - 20; x <= vis.x1 + 20; x += 20) ctx.lineTo(x, base - Math.sin(x * freq + li * 2) * amp - Math.sin(x * freq * 2.3 + li) * amp * 0.4);
        ctx.lineTo(vis.x1 + 20, 150);
        ctx.fill();
      });
      const rnd = Farm.rng(5);
      for (let x = vis.x0; x < vis.x1; x += 70) A.blobTree(ctx, x + rnd() * 40, 120 + rnd() * 14, 10 + rnd() * 6, [112, 128, 72], 0.4);
      return;
    }
    const rnd = Farm.rng(11);
    for (let x = vis.x0 - 120; x < vis.x1 + 120; x += 56) {
      const k = rnd(), k2 = rnd();
      const r = 34 + k * 20, y = 74 + k2 * 22;
      A.blobTree(ctx, x, y, r, c.leaf, k);
    }
  };

  A.blobTree = function (ctx, x, y, r, leaf, k) {
    ell(ctx, x, y + r * 0.9, r * 0.9, r * 0.22, "rgba(20,40,10,.25)");
    ctx.fillStyle = "#6b4a30";
    ctx.fillRect(x - 4, y + r * 0.2, 8, r * 0.75);
    for (const [dx, dy, rr2, sh] of [[-0.4, 0.15, 0.7, 0.85], [0.42, 0.15, 0.72, 0.9], [0, -0.3, 0.85, 1.05]]) {
      const bx = x + dx * r, by = y + dy * r, br = rr2 * r;
      const g = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.4, br * 0.1, bx, by, br);
      g.addColorStop(0, rgb(leaf, sh * 1.25));
      g.addColorStop(1, rgb(leaf, sh * 0.7));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  A.fence = function (ctx, vis) {
    const y = 134;
    ctx.fillStyle = "rgba(30,50,10,.18)";
    ctx.fillRect(vis.x0, y + 4, vis.x1 - vis.x0, 9);
    for (const ry of [y - 24, y - 10]) {
      const g = ctx.createLinearGradient(0, ry, 0, ry + 7);
      g.addColorStop(0, "#f4ecd8");
      g.addColorStop(1, "#d6c9aa");
      ctx.fillStyle = g;
      ctx.fillRect(vis.x0, ry, vis.x1 - vis.x0, 7);
    }
    for (let x = Math.floor(vis.x0 / 64) * 64; x < vis.x1; x += 64) {
      const g = ctx.createLinearGradient(x, 0, x + 10, 0);
      g.addColorStop(0, "#f7f0dc");
      g.addColorStop(1, "#cfc19f");
      ctx.fillStyle = g;
      rr(ctx, x, y - 34, 10, 42, 3);
      ctx.fill();
    }
  };

  /* ---------- the back yard: flagstone paths, hedges, a little house ---------- */
  A.yardPaths = function (ctx, st) {
    const P = Farm.world.plots;
    const rects = [];
    const gapY = P[0].y + P[0].h + 14, gapH = P[3].y - gapY - 14;
    rects.push([150, gapY, 1010, gapH]); // main path across the yard, out to the house
    for (const i of [0, 1]) rects.push([P[i].x + P[i].w + 4, P[0].y - 10, P[i + 1].x - P[i].x - P[i].w - 8, P[5].y + P[5].h - P[0].y + 20]); // paths between bed columns
    rects.push([1040, 262, 140, gapY - 262 + gapH]); // up to the front door
    const rnd = Farm.rng(31);
    for (const [x, y, w, h] of rects) {
      ctx.fillStyle = "rgba(60,48,30,.2)";
      rr(ctx, x + 2, y + 3, w, h, 8);
      ctx.fill();
      ctx.fillStyle = "#c9bc9c";
      rr(ctx, x, y, w, h, 8);
      ctx.fill();
      ctx.save();
      rr(ctx, x, y, w, h, 8);
      ctx.clip();
      for (let yy = y + 3; yy < y + h; yy += 22)
        for (let xx = x + 3 + ((yy / 22) % 2) * 14; xx < x + w; xx += 34) {
          const sw = 22 + rnd() * 8, sh = 15 + rnd() * 3, tone = 0.92 + rnd() * 0.14;
          ctx.fillStyle = rgb([190, 178, 152], tone);
          rr(ctx, xx, yy, sw, sh, 5);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.18)";
          ctx.fillRect(xx + 3, yy + 1.5, sw - 6, 2);
        }
      ctx.restore();
    }
  };

  A.hedge = function (ctx, st, x0, x1, y) {
    const c = A.colors(st);
    for (let x = x0; x < x1; x += 26) {
      const r = 20 + Math.sin(x * 0.7) * 3;
      const g = ctx.createRadialGradient(x - 6, y - 12, 2, x, y - 4, r);
      g.addColorStop(0, rgb(c.leaf, 1.25));
      g.addColorStop(1, rgb(c.leaf, 0.65));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y - 8, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  A.house = function (ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ell(ctx, 0, 6, 140, 12, "rgba(20,35,8,.25)");
    const wall = ctx.createLinearGradient(-100, 0, 100, 0);
    wall.addColorStop(0, "#f3e4c4");
    wall.addColorStop(1, "#e2cfa6");
    ctx.fillStyle = wall;
    ctx.fillRect(-100, -104, 200, 104);
    ctx.fillStyle = "#cdb98f";
    ctx.fillRect(-100, -12, 200, 12);
    /* roof and chimney */
    ctx.fillStyle = "#8a5a46";
    ctx.fillRect(58, -170, 20, 40);
    ctx.fillStyle = "#6a3f33";
    ctx.beginPath();
    ctx.moveTo(-118, -100); ctx.lineTo(0, -168); ctx.lineTo(118, -100);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7c4a3b";
    ctx.beginPath();
    ctx.moveTo(-100, -100); ctx.lineTo(0, -156); ctx.lineTo(100, -100);
    ctx.closePath();
    ctx.fill();
    /* door and windows */
    ctx.fillStyle = "#5c3a28";
    rr(ctx, -16, -68, 32, 68, 4);
    ctx.fill();
    ell(ctx, 9, -34, 2.4, 2.4, "#f2d467");
    for (const wx of [-68, 46]) {
      ctx.fillStyle = "#b8e0f2";
      rr(ctx, wx, -78, 38, 38, 3);
      ctx.fill();
      ctx.strokeStyle = "#fff8ea";
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wx + 19, -78); ctx.lineTo(wx + 19, -40);
      ctx.moveTo(wx, -59); ctx.lineTo(wx + 38, -59);
      ctx.stroke();
    }
    /* flower boxes */
    for (const wx of [-68, 46]) {
      ctx.fillStyle = "#8a6240";
      ctx.fillRect(wx - 2, -40, 42, 8);
      for (let k = 0; k < 5; k++) ell(ctx, wx + 4 + k * 8, -43, 3.4, 3.4, ["#e9607a", "#f6c443", "#fff", "#e9607a", "#f6c443"][k]);
    }
    ctx.restore();
  };

  A.pot = function (ctx, x, y, col) {
    ell(ctx, x, y + 2, 11, 4, "rgba(20,35,8,.25)");
    ctx.fillStyle = "#b5623c";
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 16); ctx.lineTo(x + 9, y - 16); ctx.lineTo(x + 6, y); ctx.lineTo(x - 6, y);
    ctx.closePath();
    ctx.fill();
    ell(ctx, x, y - 20, 11, 8, "#5f9a3a");
    for (const [dx, dy] of [[-5, -24], [3, -26], [7, -21], [-2, -19]]) ell(ctx, x + dx, y + dy, 3.2, 3.2, col);
  };

  A.bench = function (ctx, x, y) {
    ell(ctx, x, y + 2, 40, 6, "rgba(20,35,8,.25)");
    ctx.fillStyle = "#6e4f2e";
    ctx.fillRect(x - 36, y - 14, 5, 16);
    ctx.fillRect(x + 31, y - 14, 5, 16);
    for (const dy of [0, 6]) {
      const g = ctx.createLinearGradient(0, y - 20 + dy, 0, y - 15 + dy);
      g.addColorStop(0, "#c49a64");
      g.addColorStop(1, "#9a7448");
      ctx.fillStyle = g;
      rr(ctx, x - 40, y - 20 + dy, 80, 5, 2);
      ctx.fill();
    }
    ctx.fillStyle = "#9a7448";
    ctx.fillRect(x - 40, y - 38, 80, 5);
    ctx.fillRect(x - 40, y - 30, 80, 5);
  };

  /* ---------- the fields ---------- */
  A.plotGround = function (ctx, st, i, time, hover, queued) {
    const pl = st.plots[i], r = Farm.world.plots[i], v = visual(i);
    const loc = Farm.LOCATIONS[st.loc];
    const cols = A.colors(st);
    const rich = (pl.fert + pl.life) / 200;
    const soil = rgb(loc.soilColor, 1.14 - 0.45 * rich - 0.22 * (pl.moist / 100));
    const side = rgb(loc.soilColor, 0.5);
    const isGrass = pl.prep === "grass";
    const grassTop = rgb(mix(cols.grass, [96, 150, 60], 0.15), 1.02);
    const depth = 11;
    const yard = loc.scale === "yard";
    const R = yard ? 4 : 14;

    /* a slab with thickness so it feels solid (a raised wooden bed in the back yard) */
    ctx.fillStyle = "rgba(20,35,8,.22)";
    rr(ctx, r.x + 5, r.y + depth + 6, r.w, r.h, R);
    ctx.fill();
    ctx.fillStyle = yard ? "#8a6240" : side;
    rr(ctx, r.x, r.y + depth, r.w, r.h, R);
    ctx.fill();
    if (yard) {
      ctx.strokeStyle = "rgba(50,28,10,.45)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r.x + 2, r.y + r.h + depth * 0.55);
      ctx.lineTo(r.x + r.w - 2, r.y + r.h + depth * 0.55);
      ctx.stroke();
    }
    let top = isGrass ? grassTop : soil;
    if (isGrass && pl.smothering) top = rgb(mix(cols.grass, loc.soilColor, pl.smother * 0.5), 1);
    const tg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    tg.addColorStop(0, isGrass && !pl.smothering ? rgb(mix(cols.grass, [255, 255, 200], 0.12), 1) : "rgba(255,255,255,0)");
    ctx.fillStyle = top;
    rr(ctx, r.x, r.y, r.w, r.h, R);
    ctx.fill();
    ctx.fillStyle = tg;
    ctx.fill();

    ctx.save();
    rr(ctx, r.x, r.y, r.w, r.h, R);
    ctx.clip();

    /* grass blades on unprepared turf */
    if (isGrass) {
      const a = pl.smothering ? 1 - pl.smother : 1;
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      for (const t of v.tufts) {
        ctx.strokeStyle = rgb(cols.grass, 0.72, 0.8 * a);
        ctx.beginPath();
        ctx.moveTo(t.x - 3, t.y); ctx.lineTo(t.x - 4, t.y - t.h);
        ctx.moveTo(t.x, t.y); ctx.lineTo(t.x, t.y - t.h - 2);
        ctx.moveTo(t.x + 3, t.y); ctx.lineTo(t.x + 4, t.y - t.h);
        ctx.stroke();
      }
    } else {
      for (const s of v.specks) {
        ctx.fillStyle = s.l ? "rgba(255,240,210,.14)" : "rgba(30,15,0,.2)";
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }
      /* furrows left by the tractor */
      if (pl.till) {
        const rows = 6;
        for (let j = 0; j < rows; j++) {
          const f = clamp(pl.tillAmt, 0, 1); // all furrows appear together as the machine sweeps across
          if (f <= 0) continue;
          const yy = r.y + 14 + (j * (r.h - 28)) / (rows - 1);
          const len = (r.w - 16) * f;
          ctx.fillStyle = "rgba(35,20,6,.34)";
          rr(ctx, r.x + 8, yy, len, 6, 3);
          ctx.fill();
          ctx.fillStyle = "rgba(255,235,200,.18)";
          ctx.fillRect(r.x + 10, yy + 6, Math.max(0, len - 4), 1.6);
        }
      }
    }
    /* wet sheen */
    ctx.fillStyle = `rgba(20,12,4,${0.03 + 0.15 * (pl.moist / 100)})`;
    ctx.fillRect(r.x, r.y, r.w, r.h);

    /* hard clods in baked soil */
    if (!isGrass && pl.tilth < 45) {
      const n = Math.floor(v.clods.length * clamp((45 - pl.tilth) / 35, 0.1, 1));
      for (let k = 0; k < n; k++) {
        const c = v.clods[k];
        ell(ctx, c.x + 1.5, c.y + 1.5, c.s, c.s * 0.7, "rgba(30,15,0,.35)");
        ell(ctx, c.x, c.y, c.s, c.s * 0.7, rgb(loc.soilColor, 1.05));
        ell(ctx, c.x - c.s * 0.25, c.y - c.s * 0.25, c.s * 0.5, c.s * 0.3, "rgba(255,240,210,.25)");
      }
    }

    /* landscape fabric */
    if (pl.fabric) {
      const windy = st.weather.wind > 0;
      const lift = windy ? Math.sin(time * 10 + i) * 3 : 0;
      const fg = ctx.createLinearGradient(0, r.y, r.x + r.w, r.y + r.h);
      fg.addColorStop(0, "#44484c");
      fg.addColorStop(0.5, "#5a5f64");
      fg.addColorStop(1, "#3d4145");
      ctx.fillStyle = fg;
      rr(ctx, r.x + 5, r.y + 5 + lift, r.w - 10, r.h - 10, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.10)";
      ctx.lineWidth = 1;
      for (let x = r.x + 40; x < r.x + r.w - 10; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, r.y + 6);
        ctx.lineTo(x + (windy ? Math.sin(time * 8 + x) * 3 : 0), r.y + r.h - 6);
        ctx.stroke();
      }
      for (const [px, py] of [[r.x + 12, r.y + 12], [r.x + r.w - 12, r.y + 12], [r.x + 12, r.y + r.h - 12], [r.x + r.w - 12, r.y + r.h - 12]]) ell(ctx, px, py, 3, 3, "#c0c6cc");
    }

    /* mulch layer */
    if (pl.mulch > 1) {
      if (pl.mulchType === "chips") {
        const n = Math.floor(v.chips.length * clamp(pl.mulch / 70, 0.1, 1));
        for (let k = 0; k < n; k++) {
          const c = v.chips[k];
          ctx.fillStyle = c.c > 0.5 ? "#8a5f3a" : "#a47548";
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate(c.a);
          rr(ctx, -c.s, -c.s * 0.55, c.s * 2, c.s * 1.1, 1.5);
          ctx.fill();
          ctx.restore();
        }
      } else {
        const n = Math.floor(v.straw.length * clamp(pl.mulch / 60, 0.1, 1));
        ctx.lineWidth = 1.8;
        ctx.lineCap = "round";
        for (let k = 0; k < n; k++) {
          const c = v.straw[k];
          ctx.strokeStyle = c.c > 0.6 ? "#e2c068" : c.c > 0.3 ? "#cfa84c" : "#b98f3c";
          ctx.beginPath();
          ctx.moveTo(c.x - Math.cos(c.a) * c.l / 2, c.y - Math.sin(c.a) * c.l / 3);
          ctx.lineTo(c.x + Math.cos(c.a) * c.l / 2, c.y + Math.sin(c.a) * c.l / 3);
          ctx.stroke();
        }
      }
    }

    /* worms: more of them = livelier soil */
    if (!isGrass || pl.smothering) {
      const n = clamp(Math.floor(pl.life / 22), 0, 4);
      ctx.lineCap = "round";
      for (let k = 0; k < n; k++) {
        const w = v.worms[k];
        const wx = w.x + Math.sin(time * 0.5 + w.ph) * 4;
        ctx.strokeStyle = "#e29a96";
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        for (let q = 0; q <= 6; q++) {
          const px = wx + q * 2.6, py = w.y + Math.sin(q * 1.1 + time * 2 + w.ph) * 1.8;
          q ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
    }

    /* weeds */
    if (!isGrass) {
      const n = Math.floor(v.weeds.length * clamp(pl.weeds / 80, 0, 1));
      for (let k = 0; k < n; k++) {
        const w = v.weeds[k];
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        for (let b = -1; b <= 1; b++) {
          ctx.strokeStyle = b ? "#69a33e" : "#86c04d";
          ctx.beginPath();
          ctx.moveTo(w.x, w.y);
          ctx.quadraticCurveTo(w.x + b * 4 * w.s, w.y - 6 * w.s, w.x + b * 7 * w.s, w.y - 12 * w.s + Math.abs(b) * 3);
          ctx.stroke();
        }
      }
    }

    /* drip line */
    if (pl.drip) {
      ctx.strokeStyle = "#2b3338";
      ctx.lineWidth = 2.4;
      for (const f of [0.3, 0.7]) {
        const yy = r.y + r.h * f;
        ctx.beginPath();
        ctx.moveTo(r.x + 6, yy);
        ctx.lineTo(r.x + r.w - 6, yy);
        ctx.stroke();
        for (let k = 1; k < 8; k++) {
          const ex = r.x + (k * r.w) / 8;
          ell(ctx, ex, yy, 2.2, 2.2, "#1b2125");
          if (pl.moist < 68) {
            const d = (time * 1.6 + k * 0.37 + f) % 1;
            ell(ctx, ex, yy + 2 + d * 7, 1.5, 2, `rgba(80,170,240,${1 - d})`);
          }
        }
      }
    }
    ctx.restore();

    if (yard) {
      /* the timber frame of the raised bed */
      ctx.strokeStyle = "#b58a58";
      ctx.lineWidth = 8;
      rr(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, 3);
      ctx.stroke();
      ctx.strokeStyle = "rgba(60,35,15,.55)";
      ctx.lineWidth = 1.2;
      rr(ctx, r.x + 5, r.y + 5, r.w - 10, r.h - 10, 2);
      ctx.stroke();
      rr(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 4);
      ctx.stroke();
      for (const [px, py] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]) {
        ctx.fillStyle = "#8a6240";
        ctx.fillRect(px - 5, py - 5, 10, 10);
        ctx.fillStyle = "rgba(255,230,190,.35)";
        ctx.fillRect(px - 5, py - 5, 10, 3);
      }
    }

    if (hover) {
      ctx.setLineDash([9, 6]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = hover === "ok" ? "#ffffff" : hover === "bad" ? "rgba(255,120,100,.95)" : "rgba(255,255,255,.55)";
      rr(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 16);
      ctx.stroke();
      if (hover === "ok") {
        ctx.fillStyle = "rgba(255,255,255,.1)";
        ctx.fill();
      }
      ctx.setLineDash([]);
    } else if (queued) {
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,.7)";
      rr(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 15);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  /* ---------- meters above each plot ---------- */
  function iconDrop(ctx, x, y, s, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.bezierCurveTo(x + s * 0.9, y - s * 0.05, x + s * 0.8, y + s * 0.85, x, y + s * 0.85);
    ctx.bezierCurveTo(x - s * 0.8, y + s * 0.85, x - s * 0.9, y - s * 0.05, x, y - s);
    ctx.fill();
  }
  function iconSprout(ctx, x, y, s, col) {
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y + s);
    ctx.lineTo(x, y - s * 0.2);
    ctx.stroke();
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + d * s * 0.65, y - s * 0.35, s * 0.7, s * 0.34, d * -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function iconWorm(ctx, x, y, s, col) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let q = 0; q <= 8; q++) {
      const px = x - s + (q * 2 * s) / 8, py = y + Math.sin(q * 1.2) * s * 0.4;
      q ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  const PH = 22; // height of the meters above each plot
  function pill(ctx, x, y, w, icon, frac, color, label, pulse) {
    ctx.fillStyle = "rgba(255,252,238,.94)";
    rr(ctx, x, y, w, PH, PH / 2);
    ctx.fill();
    ctx.strokeStyle = pulse ? "#f2b632" : "rgba(120,90,40,.3)";
    ctx.lineWidth = pulse ? 2.5 : 1;
    ctx.stroke();
    icon(ctx, x + 13, y + PH / 2 + 0.5, 7, color);
    if (label) {
      ctx.fillStyle = "#5e4e2a";
      ctx.font = `bold ${w < 84 ? 10 : 12}px 'Trebuchet MS', sans-serif`;
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + 26, y + PH / 2 + 0.5);
    } else {
      const bx = x + 26, bw = w - 34;
      ctx.fillStyle = "rgba(90,70,30,.2)";
      rr(ctx, bx, y + 6.5, bw, 9, 4.5);
      ctx.fill();
      if (frac > 0.01) {
        ctx.fillStyle = color;
        rr(ctx, bx, y + 6.5, Math.max(9, bw * clamp(frac, 0, 1)), 9, 4.5);
        ctx.fill();
      }
    }
  }

  A.plotStrip = function (ctx, st, i, time) {
    const pl = st.plots[i], r = Farm.world.plots[i];
    const S = Farm.sim;
    const y = r.y - 31;
    const k = r.w / 270; // the meters shrink a little over narrower beds
    const ripe = S.isRipe(pl);
    const grass = pl.prep === "grass" && !pl.smothering;
    const growing = (pl.crop && !pl.crop.dead) || pl.smothering;
    /* water */
    if (!grass || pl.moist > 0) {
      const low = pl.moist < 28 && growing;
      pill(ctx, r.x, y, 90 * k, iconDrop, pl.moist / 100, low ? "#e0602a" : "#3c9bea", null, low && Math.sin(time * 6) > 0);
    }
    /* growth / progress */
    const gx = r.x + 95 * k, gw = 104 * k;
    if (pl.crop && !pl.crop.dead) {
      const f = S.progress(pl);
      pill(ctx, gx, y, gw, iconSprout, f, ripe ? "#e5a91d" : "#5fa83a", ripe ? "Ready!" : null, ripe && Math.sin(time * 5) > 0);
    } else if (pl.crop && pl.crop.dead) {
      pill(ctx, gx, y, gw, iconSprout, 0, "#a08060", "Withered");
    } else if (pl.smothering) {
      pill(ctx, gx, y, gw, iconSprout, pl.smother, "#a77d3c", null);
    } else if (grass) {
      pill(ctx, gx, y, gw, iconSprout, 0, "#7fae55", "Unprepared");
    } else {
      pill(ctx, gx, y, gw, iconSprout, 0, "#b99b6a", "Ready to sow");
    }
    /* soil life */
    const lx = r.x + 204 * k, lw = 66 * k;
    ctx.fillStyle = "rgba(255,252,238,.94)";
    rr(ctx, lx, y, lw, PH, PH / 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(120,90,40,.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
    iconWorm(ctx, lx + 14, y + PH / 2 + 0.5, 7, "#d9837f");
    const n = clamp(Math.round(pl.life / 25), 0, 4);
    for (let q = 0; q < 4; q++) ell(ctx, lx + 28 * (k > 0.9 ? 1 : 0.9) + q * 8 * (k > 0.9 ? 1 : 0.85), y + PH / 2 + 0.5, 3, 3, q < n ? "#6f9d3c" : "rgba(90,70,30,.25)");

    /* a big, bobbing droplet over any planted plot that needs water */
    if (growing && pl.moist < 28) {
      const urgent = pl.moist < 12;
      const bob = Math.sin(time * (urgent ? 8 : 5)) * (urgent ? 4 : 2.5);
      const bx = r.x + 24, by = r.y + 24 + bob;
      ctx.fillStyle = "rgba(0,0,0,.18)";
      ell(ctx, bx + 2, by + 17, 11, 4, "rgba(0,0,0,.18)");
      ell(ctx, bx, by, 16, 16, urgent ? "#d8402a" : "#ee8a2e");
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      iconDrop(ctx, bx, by + 1, 8, "#fff");
    }
    /* weeds warning */
    if (pl.weeds > 35) {
      const wx = r.x + r.w - 26, wy = r.y + 8;
      ctx.fillStyle = "rgba(255,246,214,.96)";
      rr(ctx, wx, wy, 22, 22, 7);
      ctx.fill();
      ctx.strokeStyle = "#d9772b";
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = "#d9772b";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", wx + 11, wy + 12);
      ctx.textAlign = "left";
    }
    if (ripe) {
      const bob = Math.sin(time * 4) * 3;
      ctx.fillStyle = "rgba(255,225,120,.2)";
      rr(ctx, r.x - 5, r.y - 5, r.w + 10, r.h + 10, 18);
      ctx.fill();
      const bx = r.x + r.w - 24, by = r.y + 26 + bob;
      ell(ctx, bx, by, 15, 15, "#f6c443");
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(bx - 6, by);
      ctx.lineTo(bx - 1, by + 5);
      ctx.lineTo(bx + 7, by - 5);
      ctx.stroke();
    }
  };

  /* ---------- buildings & props ---------- */
  A.barn = function (ctx, x, y, k) {
    ctx.save();
    ctx.translate(x, y);
    if (k) ctx.scale(k, k);
    ell(ctx, 0, 6, 150, 14, "rgba(20,35,8,.25)");
    /* body */
    const bg = ctx.createLinearGradient(-110, 0, 110, 0);
    bg.addColorStop(0, "#b4352a");
    bg.addColorStop(0.5, "#c9402f");
    bg.addColorStop(1, "#9c2d24");
    ctx.fillStyle = bg;
    ctx.fillRect(-110, -118, 220, 118);
    ctx.strokeStyle = "rgba(60,10,6,.22)";
    ctx.lineWidth = 1.5;
    for (let x2 = -104; x2 < 110; x2 += 13) {
      ctx.beginPath();
      ctx.moveTo(x2, -118);
      ctx.lineTo(x2, 0);
      ctx.stroke();
    }
    /* roof */
    ctx.beginPath();
    ctx.moveTo(-128, -112); ctx.lineTo(-98, -168); ctx.lineTo(0, -196); ctx.lineTo(98, -168); ctx.lineTo(128, -112);
    ctx.lineTo(112, -112); ctx.lineTo(90, -150); ctx.lineTo(0, -174); ctx.lineTo(-90, -150); ctx.lineTo(-112, -112);
    ctx.closePath();
    ctx.fillStyle = "#6a2a1e";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-112, -112); ctx.lineTo(-90, -150); ctx.lineTo(0, -174); ctx.lineTo(90, -150); ctx.lineTo(112, -112);
    ctx.closePath();
    ctx.fillStyle = "#b8392b";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-128, -112); ctx.lineTo(-98, -168); ctx.lineTo(0, -196); ctx.lineTo(98, -168); ctx.lineTo(128, -112);
    ctx.lineTo(118, -108); ctx.lineTo(0, -184); ctx.lineTo(-118, -108);
    ctx.closePath();
    ctx.fillStyle = "#4e3a33";
    ctx.fill();
    /* hay loft and doors */
    ctx.fillStyle = "#4a1a12";
    rr(ctx, -17, -152, 34, 30, 3);
    ctx.fill();
    ctx.strokeStyle = "#f6efe2";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#e2c068";
    ctx.fillRect(-14, -132, 28, 8);
    ctx.fillStyle = "#5e1f16";
    ctx.fillRect(-38, -82, 76, 82);
    ctx.strokeStyle = "#f6efe2";
    ctx.lineWidth = 4;
    ctx.strokeRect(-38, -82, 76, 82);
    ctx.beginPath();
    ctx.moveTo(0, -82); ctx.lineTo(0, 0);
    ctx.moveTo(-38, -82); ctx.lineTo(0, 0);
    ctx.moveTo(0, -82); ctx.lineTo(-38, 0);
    ctx.moveTo(38, -82); ctx.lineTo(0, 0);
    ctx.moveTo(0, -82); ctx.lineTo(38, 0);
    ctx.stroke();
    ctx.restore();
  };

  A.hay = function (ctx, x, y) {
    ell(ctx, x, y + 2, 22, 6, "rgba(20,35,8,.25)");
    const g = ctx.createRadialGradient(x - 6, y - 14, 2, x, y - 10, 24);
    g.addColorStop(0, "#f0d27a");
    g.addColorStop(1, "#c2993e");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y - 10, 20, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(120,80,20,.4)";
    ctx.lineWidth = 1.4;
    for (const rad of [5, 10, 15]) {
      ctx.beginPath();
      ctx.ellipse(x, y - 10, rad, rad * 0.85, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  A.hose = function (ctx, x, y, bucketEmpty, time) {
    ctx.save();
    ctx.translate(x, y);
    ell(ctx, 0, 4, 44, 8, "rgba(20,35,8,.25)");
    /* puddle */
    ell(ctx, 26, 3, 18, 5, "rgba(70,130,190,.35)");
    /* post and tap */
    const pg = ctx.createLinearGradient(-8, 0, 8, 0);
    pg.addColorStop(0, "#7a5a3a");
    pg.addColorStop(0.5, "#a47c52");
    pg.addColorStop(1, "#6a4b30");
    ctx.fillStyle = pg;
    ctx.fillRect(-6, -52, 12, 52);
    ctx.fillStyle = "#b9965f";
    ctx.fillRect(-9, -54, 18, 5);
    ctx.fillStyle = "#c0c6cc";
    ctx.fillRect(4, -40, 22, 6);
    ctx.fillStyle = "#d44a38";
    ctx.beginPath();
    ctx.arc(14, -46, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c0c6cc";
    ctx.fillRect(22, -42, 5, 12);
    /* hose reel */
    ctx.fillStyle = "#6b4a30";
    ctx.beginPath();
    ctx.arc(-26, -26, 24, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 5; k++) {
      ctx.strokeStyle = k % 2 ? "#2f86d4" : "#4aa3ee";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(-26, -26, 20 - k * 3.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ell(ctx, -26, -26, 4, 4, "#d9c9a0");
    /* loose hose end */
    ctx.strokeStyle = "#2f86d4";
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.bezierCurveTo(10, 8, 24, -4, 38, 4);
    ctx.stroke();
    ctx.fillStyle = "#d1a645";
    ctx.fillRect(36, 1, 8, 6);
    if (bucketEmpty) {
      const b = Math.sin(time * 4) * 3;
      iconDrop(ctx, 14, -74 + b, 8, "#3c9bea");
    }
    ctx.restore();
  };

  A.bin = function (ctx, x, y, bin, time) {
    ctx.save();
    ctx.translate(x, y);
    ell(ctx, 0, 6, 54, 9, "rgba(20,35,8,.25)");
    const fill = clamp((bin.raw + bin.ready) / 8, 0.15, 1);
    /* heap */
    const hg = ctx.createRadialGradient(-8, -34, 2, 0, -24, 46);
    hg.addColorStop(0, bin.ready > 0 ? "#6d4a2f" : "#8a7a3a");
    hg.addColorStop(1, "#3c2819");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(0, -24, 38, 14 + 18 * fill, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#3c2819";
    ctx.fillRect(-38, -26, 76, 6);
    /* wooden slats */
    for (let k = 0; k < 3; k++) {
      const g = ctx.createLinearGradient(0, -22 + k * 14, 0, -10 + k * 14);
      g.addColorStop(0, "#b48a58");
      g.addColorStop(1, "#8b6a40");
      ctx.fillStyle = g;
      rr(ctx, -44, -22 + k * 13, 88, 11, 2);
      ctx.fill();
    }
    ctx.fillStyle = "#6e4f2e";
    ctx.fillRect(-46, -30, 7, 36);
    ctx.fillRect(39, -30, 7, 36);
    /* steam while it cooks */
    if (bin.raw > 0) {
      for (let k = 0; k < 3; k++) {
        const p = (time * 0.5 + k / 3) % 1;
        ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - p)})`;
        ctx.beginPath();
        ctx.arc(-12 + k * 12 + Math.sin(p * 6 + k) * 4, -52 - p * 28, 4 + p * 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    /* ready badge */
    if (bin.ready > 0) {
      const b = Math.sin(time * 4) * 2.5;
      ell(ctx, 0, -76 + b, 14, 14, "#7cbf44");
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(bin.ready, 0, -75 + b);
      ctx.textAlign = "left";
    }
    ctx.restore();
  };

  A.sign = function (ctx, x, y, name) {
    ctx.save();
    ctx.translate(x, y);
    ell(ctx, 0, 3, 40, 7, "rgba(20,35,8,.22)");
    ctx.fillStyle = "#7a5a3a";
    ctx.fillRect(-4, -60, 8, 60);
    const g = ctx.createLinearGradient(0, -86, 0, -48);
    g.addColorStop(0, "#d4aa6c");
    g.addColorStop(1, "#b38848");
    ctx.fillStyle = g;
    rr(ctx, -64, -88, 128, 38, 6);
    ctx.fill();
    ctx.strokeStyle = "#7a5a3a";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#4a321c";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let label = name + "'s farm";
    ctx.font = "bold 15px 'Trebuchet MS', sans-serif";
    while (ctx.measureText(label).width > 112 && label.length > 6) label = label.slice(0, -2);
    ctx.fillText(label, 0, -69);
    ctx.textAlign = "left";
    ctx.restore();
  };

  /* ---------- the farmer ---------- */
  const SKIN = "#e8b48a", SKIN_D = "#cf966c", HAIR = "#4a2f20", HAT = "#e8c56d", HAT_D = "#c79d46";
  const SHIRT = "#f2d467", DENIM = "#4f7fb0", DENIM_D = "#3c6491", BOOT = "#6b4a34";
  const LEAN = { plant: 0.45, weed: 0.62, water: 0.25, harvest: 0.3, fill: 0.35, mulch: 0.42, till: 0 };

  function bucket(ctx, x, y, tilt, level) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.strokeStyle = "#8c939b";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, Math.PI, 0);
    ctx.stroke();
    const g = ctx.createLinearGradient(-7, 0, 7, 0);
    g.addColorStop(0, "#3d98d8");
    g.addColorStop(0.5, "#6cc2f2");
    g.addColorStop(1, "#2f7fb8");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-7.5, 0); ctx.lineTo(7.5, 0); ctx.lineTo(5.5, 11); ctx.lineTo(-5.5, 11);
    ctx.closePath();
    ctx.fill();
    if (level > 0) ell(ctx, 0, 1.4, 6.6, 1.8, "#9fdcff");
    ctx.restore();
  }

  function hatAt(ctx, x, y, w) {
    const bg = ctx.createLinearGradient(0, y - 4, 0, y + 4);
    bg.addColorStop(0, HAT);
    bg.addColorStop(1, HAT_D);
    ell(ctx, x, y, w, w * 0.3, bg);
    const cg = ctx.createLinearGradient(x - w * 0.55, 0, x + w * 0.55, 0);
    cg.addColorStop(0, HAT_D);
    cg.addColorStop(0.4, "#f4d98a");
    cg.addColorStop(1, HAT_D);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(x, y - 3, w * 0.55, w * 0.42, 0, Math.PI, 0);
    ctx.lineTo(x + w * 0.55, y - 0.5);
    ctx.lineTo(x - w * 0.55, y - 0.5);
    ctx.fill();
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(x - w * 0.55, y - 4, w * 1.1, 3);
  }

  /* f: { x, y, face, walking, phase, pose, poseT, carry, level } */
  A.farmer = function (ctx, f, time) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ell(ctx, 0, 1, 15, 5, "rgba(20,35,8,.3)");
    const pose = f.pose || "none";
    const lean = LEAN[pose] || 0;
    const swing = f.walking ? Math.sin(f.phase) : 0;
    const bob = f.walking ? Math.abs(Math.cos(f.phase)) * 2.2 : Math.sin(time * 2) * 0.5;
    const working = pose !== "none";
    const wob = Math.sin(time * 11);
    const side = f.face === "left" || f.face === "right";

    if (side) {
      ctx.scale(f.face === "left" ? -1 : 1, 1);
      const hipY = -27 - bob;
      const leg = (ang, col) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, hipY);
        const lx = Math.sin(ang) * 26, ly = hipY + Math.cos(ang) * 26;
        ctx.lineTo(lx, ly);
        ctx.stroke();
        ctx.fillStyle = BOOT;
        rr(ctx, lx - 3, ly - 2, 9, 5, 2);
        ctx.fill();
      };
      leg(-swing * 0.6, DENIM_D);
      ctx.save();
      ctx.translate(0, hipY);
      ctx.rotate(lean);
      /* braid behind */
      ctx.strokeStyle = HAIR;
      ctx.lineWidth = 4.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-5, -33);
      ctx.quadraticCurveTo(-11, -24 + (f.walking ? swing * 2 : 0), -8, -12 + (f.walking ? swing * 3 : 0));
      ctx.stroke();
      ell(ctx, -8.4, -11.5, 2.2, 2.2, "#c0392b");
      const arm = (ang, hold) => {
        const sx = 0, sy = -21;
        const hx = sx + Math.sin(ang) * 17, hy = sy + Math.cos(ang) * 17;
        ctx.strokeStyle = SHIRT;
        ctx.lineWidth = 4.8;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (hx - sx) * 0.5, sy + (hy - sy) * 0.5);
        ctx.stroke();
        ctx.strokeStyle = SKIN;
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.moveTo(sx + (hx - sx) * 0.5, sy + (hy - sy) * 0.5);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ell(ctx, hx, hy, 2.4, 2.4, SKIN);
        if (hold) hold(hx, hy);
      };
      let frontAng = swing * 0.7, backAng = -swing * 0.7;
      if (!working && !f.walking) { frontAng = 0.08; backAng = -0.05; }
      if (pose === "plant") frontAng = 1.7 + wob * 0.35;
      else if (pose === "mulch") frontAng = 1.5 + wob * 0.4;
      else if (pose === "water") frontAng = 1.45;
      else if (pose === "weed") frontAng = 2.4 + wob * 0.25;
      else if (pose === "harvest") frontAng = 2.5 + wob * 0.2;
      else if (pose === "fill") frontAng = 1.0;
      arm(backAng);
      /* torso: shirt, then overalls with a bib */
      ctx.fillStyle = SHIRT;
      rr(ctx, -6.5, -25, 13, 26, 4);
      ctx.fill();
      ctx.fillStyle = DENIM;
      rr(ctx, -6.5, -12, 13, 13, 3);
      ctx.fill();
      ctx.fillRect(-3, -22, 7, 11);
      ctx.strokeStyle = DENIM_D;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-3, -22); ctx.lineTo(-1, -26);
      ctx.stroke();
      ell(ctx, 1.5, -17, 1.1, 1.1, "#f2d467");
      /* head */
      ell(ctx, 1.5, -32, 7.4, 7.8, SKIN);
      ctx.fillStyle = HAIR;
      ctx.beginPath();
      ctx.ellipse(-1.5, -33.5, 5.8, 7.6, 0, Math.PI * 0.5, Math.PI * 1.55);
      ctx.fill();
      ell(ctx, 5, -31, 1.1, 1.3, "#3b2a20");
      ell(ctx, 4.2, -28.2, 2.2, 1.4, "rgba(240,120,110,.35)");
      ctx.strokeStyle = SKIN_D;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(8.4, -31); ctx.lineTo(9.4, -29.4); ctx.lineTo(8.2, -29);
      ctx.stroke();
      hatAt(ctx, 1, -37.5, 13);
      arm(frontAng, f.carry ? (hx, hy) => bucket(ctx, hx + (pose === "water" ? 5 : 0), hy + (pose === "water" ? 0 : 0), pose === "water" ? 0.4 + f.poseT * 0.9 : -frontAng * 0.0, f.level) : null);
      ctx.restore();
      leg(swing * 0.6, DENIM);
    } else {
      const back = f.face === "up";
      const hipY = -27 - bob;
      const raise = (n) => Math.max(0, n) * 3;
      const lg = (dx, lift) => {
        ctx.strokeStyle = DENIM;
        ctx.lineWidth = 6.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(dx, hipY);
        ctx.lineTo(dx, -3 - lift);
        ctx.stroke();
        ctx.fillStyle = BOOT;
        rr(ctx, dx - 4, -5 - lift, 8, 5, 2);
        ctx.fill();
      };
      lg(-3.6, raise(swing));
      lg(3.6, raise(-swing));
      const dip = lean * 13;
      ctx.save();
      ctx.translate(0, hipY + dip);
      ctx.scale(1, 1 - lean * 0.22);
      const armF = (dx, which) => {
        let hy = -21 + 17 + (f.walking ? swing * (which ? 5 : -5) : 0);
        let hx = dx * 1.35;
        if (working && (which === 1 || pose === "weed" || pose === "plant")) {
          hy = -21 + (back ? -12 : 10) - Math.abs(wob) * 2;
          hx = dx * 1.8;
        }
        ctx.strokeStyle = SHIRT;
        ctx.lineWidth = 4.8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(dx, -21);
        ctx.lineTo(dx + (hx - dx) * 0.5, -21 + (hy + 21) * 0.5);
        ctx.stroke();
        ctx.strokeStyle = SKIN;
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.moveTo(dx + (hx - dx) * 0.5, -21 + (hy + 21) * 0.5);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ell(ctx, hx, hy, 2.4, 2.4, SKIN);
        return [hx, hy];
      };
      if (!back) {
        /* pigtails on the shoulders, drawn first */
        ctx.strokeStyle = HAIR;
        ctx.lineWidth = 4.4;
        for (const d of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(d * 7, -32);
          ctx.quadraticCurveTo(d * 11, -24, d * 9.5, -15 + (f.walking ? d * swing * 2 : 0));
          ctx.stroke();
          ell(ctx, d * 9.4, -14.4, 2.1, 2.1, "#c0392b");
        }
      }
      armF(-8, 0);
      ctx.fillStyle = SHIRT;
      rr(ctx, -9, -25, 18, 26, 5);
      ctx.fill();
      ctx.fillStyle = DENIM;
      rr(ctx, -9, -12, 18, 13, 4);
      ctx.fill();
      if (!back) {
        ctx.fillRect(-5.5, -22, 11, 11);
        ctx.strokeStyle = DENIM_D;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-5, -22); ctx.lineTo(-7, -26);
        ctx.moveTo(5, -22); ctx.lineTo(7, -26);
        ctx.stroke();
        ell(ctx, -3.5, -20, 1, 1, "#f2d467");
        ell(ctx, 3.5, -20, 1, 1, "#f2d467");
      } else {
        ctx.strokeStyle = DENIM_D;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-5, -25); ctx.lineTo(0, -12); ctx.lineTo(5, -25);
        ctx.stroke();
      }
      /* head */
      if (back) {
        ell(ctx, 0, -32, 7.8, 8, HAIR);
        ctx.strokeStyle = HAIR;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.quadraticCurveTo(2 + (f.walking ? swing * 2 : 0), -19, 0, -8);
        ctx.stroke();
        ell(ctx, 0, -7.4, 2.2, 2.2, "#c0392b");
      } else {
        ell(ctx, 0, -32, 7.6, 8, SKIN);
        ctx.fillStyle = HAIR;
        ctx.beginPath();
        ctx.ellipse(0, -35.5, 7.7, 5, 0, Math.PI, 0);
        ctx.fill();
        ell(ctx, -2.9, -31, 1.1, 1.4, "#3b2a20");
        ell(ctx, 2.9, -31, 1.1, 1.4, "#3b2a20");
        ell(ctx, -4.7, -28.4, 2, 1.3, "rgba(240,120,110,.38)");
        ell(ctx, 4.7, -28.4, 2, 1.3, "rgba(240,120,110,.38)");
        ctx.strokeStyle = "#a8624a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -29.3, 2.3, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      }
      hatAt(ctx, 0, -38, 14);
      const [hx, hy] = armF(8, 1);
      if (f.carry) bucket(ctx, hx + 1, hy - 1, pose === "water" ? 0.5 + f.poseT : 0, f.level);
      ctx.restore();
    }
    ctx.restore();
  };

  /* ---------- the hand-pushed rototiller (used on the back-yard level) ---------- */
  A.rototiller = function (ctx, t, time) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ell(ctx, 0, 2, 38, 6, "rgba(20,35,8,.3)");
    if (t.face === "left") ctx.scale(-1, 1);
    const shake = t.driving ? Math.sin(time * 45) * 0.8 : 0;
    ctx.translate(0, shake);
    /* handlebars back to the farmer */
    ctx.strokeStyle = "#3b4248";
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-8, -22); ctx.lineTo(-40, -44);
    ctx.stroke();
    ctx.strokeStyle = "#1f2428";
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(-40, -44); ctx.lineTo(-46, -46);
    ctx.stroke();
    /* tines at the front */
    ctx.save();
    ctx.translate(26, -11);
    ell(ctx, 0, 0, 11, 11, "#5f676e");
    ctx.rotate(t.rot || 0);
    ctx.fillStyle = "#c4cbd1";
    for (let k = 0; k < 6; k++) {
      ctx.rotate(Math.PI / 3);
      ctx.fillRect(8, -2, 8, 4);
    }
    ctx.restore();
    /* engine and wheel */
    const bg = ctx.createLinearGradient(0, -38, 0, -14);
    bg.addColorStop(0, "#f0603f");
    bg.addColorStop(1, "#a72f1c");
    ctx.fillStyle = bg;
    rr(ctx, -12, -36, 34, 22, 6);
    ctx.fill();
    ctx.fillStyle = "#2b2f33";
    rr(ctx, -4, -42, 16, 8, 3);
    ctx.fill();
    ell(ctx, -6, -9, 9, 9, "#242b30");
    ell(ctx, -6, -9, 4, 4, "#d8dde0");
    ctx.restore();
  };

  /* ---------- the tractor ---------- */
  /* t: { x, y, face, wheel, rot, tilling, driving, driver } */
  A.tractor = function (ctx, t, time, driver) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ell(ctx, 0, 2, 62, 9, "rgba(20,35,8,.3)");
    if (t.face === "left") ctx.scale(-1, 1);
    const shake = t.driving || t.tilling ? Math.sin(time * 40) * 0.7 : 0;
    ctx.translate(0, shake);

    /* rotavator at the back */
    ctx.strokeStyle = "#555e66";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-30, -30); ctx.lineTo(-52, -16);
    ctx.stroke();
    ctx.save();
    ctx.translate(-58, -12);
    ell(ctx, 0, 0, 13, 13, "#6b747c");
    ctx.rotate(t.rot || 0);
    ctx.fillStyle = "#b9c0c6";
    for (let k = 0; k < 6; k++) {
      ctx.rotate(Math.PI / 3);
      ctx.fillRect(9, -2, 8, 4);
    }
    ctx.restore();

    /* rear wheel */
    const wheel = (cx, cy, r, hub) => {
      ctx.save();
      ctx.translate(cx, cy);
      ell(ctx, 0, 0, r, r, "#242b30");
      ctx.rotate(t.wheel || 0);
      ctx.fillStyle = "#38424a";
      for (let k = 0; k < 12; k++) {
        ctx.rotate(Math.PI / 6);
        ctx.fillRect(r - 4, -2.4, 5, 4.8);
      }
      ell(ctx, 0, 0, r * 0.55, r * 0.55, hub);
      ell(ctx, 0, 0, r * 0.2, r * 0.2, "#d8dde0");
      ctx.restore();
    };
    wheel(-22, -23, 23, "#d9a62e");
    /* body */
    const bg = ctx.createLinearGradient(0, -48, 0, -24);
    bg.addColorStop(0, "#f0603f");
    bg.addColorStop(0.5, "#d9432a");
    bg.addColorStop(1, "#a72f1c");
    ctx.fillStyle = bg;
    rr(ctx, -30, -40, 76, 17, 5);
    ctx.fill();
    rr(ctx, 4, -50, 44, 27, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.22)";
    rr(ctx, 8, -47, 36, 4, 2);
    ctx.fill();
    ctx.fillStyle = "#2b2f33";
    for (let k = 0; k < 4; k++) ctx.fillRect(46, -46 + k * 5.6, 4, 3);
    ell(ctx, 45, -36, 3, 3, "#ffeb9a");
    wheel(36, -13, 13, "#d9a62e");
    /* mudguard */
    ctx.fillStyle = "#b73820";
    ctx.beginPath();
    ctx.arc(-22, -23, 26, Math.PI * 1.05, Math.PI * 1.95);
    ctx.lineTo(-22, -23);
    ctx.fill();
    /* exhaust */
    ctx.fillStyle = "#454d54";
    ctx.fillRect(30, -68, 4, 20);
    if (t.driving || t.tilling) {
      for (let k = 0; k < 3; k++) {
        const p = (time * 1.4 + k / 3) % 1;
        ctx.fillStyle = `rgba(80,80,80,${0.4 * (1 - p)})`;
        ctx.beginPath();
        ctx.arc(32 - p * 14, -72 - p * 24, 3 + p * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    /* driver */
    if (driver) {
      ctx.fillStyle = DENIM;
      rr(ctx, -30, -56, 12, 16, 4);
      ctx.fill();
      ctx.fillStyle = SHIRT;
      rr(ctx, -30, -60, 12, 9, 4);
      ctx.fill();
      ell(ctx, -23, -66, 6, 6.4, SKIN);
      ctx.strokeStyle = HAIR;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-28, -64);
      ctx.quadraticCurveTo(-33, -56, -31, -48);
      ctx.stroke();
      hatAt(ctx, -23, -71, 11);
      ctx.strokeStyle = SKIN;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(-20, -56); ctx.lineTo(-6, -50);
      ctx.stroke();
    }
    /* canopy */
    ctx.fillStyle = "#3e464c";
    ctx.fillRect(-38, -82, 3.5, 40);
    ctx.fillRect(-12, -82, 3.5, 40);
    const rg = ctx.createLinearGradient(0, -88, 0, -80);
    rg.addColorStop(0, "#5c666d");
    rg.addColorStop(1, "#3a4248");
    ctx.fillStyle = rg;
    rr(ctx, -46, -88, 46, 8, 3);
    ctx.fill();
    ctx.restore();
  };
})();
