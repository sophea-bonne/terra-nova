/* Terra Nova — drawing plants. Every plant is drawn from its growth (0..1) so you can watch it
   change continuously: tiny sprout -> leafy -> heads/fruit -> ripe. Shading and highlights give them depth. */
(function () {
  const Farm = window.Farm;
  const { mix, rgb, ease, clamp } = Farm;
  const P = (Farm.plants = {});

  function shadow(ctx, x, y, rx, ry, a) {
    ctx.fillStyle = `rgba(30,20,0,${a || 0.22})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* little pile of earth where a seed just went in */
  function seedMound(ctx, x, y) {
    shadow(ctx, x, y + 1, 5, 2.2, 0.25);
    const g = ctx.createRadialGradient(x - 1, y - 2, 0.5, x, y, 6);
    g.addColorStop(0, "#7b5a38");
    g.addColorStop(1, "#4d3622");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, 5, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ---------------- WHEAT ---------------- */
  const GREEN = [96, 158, 62];
  const GOLD = [222, 182, 72];

  P.wheat = function (ctx, slot, t, sway, wilt) {
    const { x, y, r } = slot;
    if (t < 0.07) {
      seedMound(ctx, x, y);
      if (t > 0.02) {
        const k = (t - 0.02) / 0.05;
        ctx.strokeStyle = "#8fcd5a";
        ctx.lineWidth = 1.8;
        ctx.lineCap = "round";
        for (const d of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + d * 2 * k, y - 5 * k, x + d * 5 * k, y - 7 * k);
          ctx.stroke();
        }
      }
      return;
    }
    shadow(ctx, x, y + 1, 15, 4.5, 0.2);
    const grow = ease(t);
    const H = 8 + 44 * grow;
    const ripeMix = clamp((t - 0.55) / 0.4, 0, 1);
    const col = mix(GREEN, GOLD, ripeMix);
    const dry = mix(col, [150, 130, 70], wilt * 0.6);
    ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      const bx = x + (r[i % 8] - 0.5) * 16;
      const by = y + (r[(i + 3) % 8] - 0.5) * 5;
      const lean = (r[(i + 2) % 8] - 0.5) * 0.5 + sway * 0.16 * (H / 50) + wilt * 0.5 * (i % 2 ? 1 : -1);
      const h = H * (0.85 + r[(i + 5) % 8] * 0.3) * (1 - wilt * 0.25);
      const tx = bx + lean * h;
      const ty = by - h * (1 - Math.abs(lean) * 0.25);
      const cx = bx + lean * h * 0.25, cy = by - h * 0.6;
      /* leaves */
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = rgb(mix(GREEN, [150, 150, 70], ripeMix * 0.8), 0.9);
      for (const f of [0.3, 0.5]) {
        const lx = bx + (tx - bx) * f * 0.8, ly = by - h * f;
        const d = (i + (f > 0.4 ? 1 : 0)) % 2 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.quadraticCurveTo(lx + d * 8, ly - 4, lx + d * (11 + wilt * 3), ly + 3 + wilt * 6);
        ctx.stroke();
      }
      /* stem: darker underside + brighter highlight = a rounded look */
      ctx.strokeStyle = rgb(dry, 0.78);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(cx, cy, tx, ty);
      ctx.stroke();
      ctx.strokeStyle = rgb(dry, 1.14);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(bx - 0.7, by);
      ctx.quadraticCurveTo(cx - 0.7, cy, tx - 0.7, ty);
      ctx.stroke();
      /* ear */
      if (t > 0.38) {
        const e = clamp((t - 0.38) / 0.62, 0, 1);
        const L = 3 + 11 * e;
        const ang = Math.atan2(ty - cy, tx - cx);
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(ang + Math.PI / 2);
        const earCol = mix([140, 180, 70], [236, 190, 70], clamp((t - 0.5) / 0.4, 0, 1));
        const g = ctx.createLinearGradient(-3, 0, 3, 0);
        g.addColorStop(0, rgb(earCol, 1.15));
        g.addColorStop(1, rgb(earCol, 0.8));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, -L / 2, 2.6 + e, L / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        if (t > 0.7) {
          ctx.strokeStyle = rgb(earCol, 1.1, 0.8);
          ctx.lineWidth = 0.7;
          for (const d of [-1.6, 0, 1.6]) {
            ctx.beginPath();
            ctx.moveTo(d, -L + 2);
            ctx.lineTo(d * 2.4, -L - 5 * e);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
  };

  /* ---------------- CANNABIS ---------------- */
  function leaf(ctx, x, y, size, angle, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const blades = [-62, -32, 0, 32, 62];
    for (const b of blades) {
      const L = size * (1 - Math.abs(b) / 170);
      ctx.save();
      ctx.rotate((b * Math.PI) / 180);
      const g = ctx.createLinearGradient(0, 0, 0, -L);
      g.addColorStop(0, rgb(col, 0.8));
      g.addColorStop(1, rgb(col, 1.12));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(L * 0.2, -L * 0.45, 0, -L);
      ctx.quadraticCurveTo(-L * 0.2, -L * 0.45, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  P.cannabis = function (ctx, slot, t, sway, wilt) {
    const { x, y } = slot;
    if (t < 0.07) {
      seedMound(ctx, x, y);
      if (t > 0.02) {
        ctx.fillStyle = "#8fcd5a";
        for (const d of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(x + d * 3, y - 4, 3.2, 1.7, d * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return;
    }
    shadow(ctx, x, y + 1, 17, 5, 0.22);
    const g = ease(t);
    const H = 10 + 46 * g;
    const col = mix([74, 146, 66], [126, 170, 70], clamp((t - 0.6) / 0.4, 0, 1));
    const dry = mix(col, [150, 130, 70], wilt * 0.6);
    const tipX = x + sway * 3 * (H / 50) + wilt * 4;
    ctx.strokeStyle = rgb(dry, 0.7);
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x, y - H * 0.5, tipX, y - H);
    ctx.stroke();
    const tiers = 2 + Math.floor(g * 3);
    for (let k = 0; k < tiers; k++) {
      const f = 0.25 + (k / Math.max(1, tiers - 1)) * 0.65;
      const size = (7 + 12 * g) * (1 - k * 0.12);
      const px = x + (tipX - x) * f * f, py = y - H * f;
      const droop = wilt * 0.7;
      leaf(ctx, px, py, size, -1.15 + droop + sway * 0.08 + k * 0.05, dry);
      leaf(ctx, px, py, size, 1.15 - droop + sway * 0.08 - k * 0.05, dry);
    }
    leaf(ctx, tipX, y - H, 5 + 7 * g, sway * 0.1, dry);
    if (t > 0.65) {
      const e = clamp((t - 0.65) / 0.35, 0, 1);
      ctx.fillStyle = rgb([150, 190, 90], 1);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(tipX + (i - 1.5) * 2.6, y - H - 2 - (i % 2) * 3, 2 + 2.4 * e, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(226,140,40,.9)";
      ctx.lineWidth = 0.9;
      for (let i = 0; i < 7; i++) {
        const bx = tipX + (i - 3) * 1.8, by = y - H - 3 - (i % 3) * 2;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + (i % 2 ? 2 : -2), by - 3 * e);
        ctx.stroke();
      }
    }
  };

  /* ---------------- TREES ---------------- */
  const SPECIES = {
    avocado: { leaf: [[44, 104, 52], [68, 134, 60], [34, 84, 46]], ripe: [64, 44, 58], green: [96, 144, 62], fruitShape: "pear" },
    citrus: { leaf: [[62, 138, 62], [92, 168, 72], [48, 112, 56]], ripe: [246, 150, 28], green: [134, 172, 62], fruitShape: "round" },
    apple: { leaf: [[84, 152, 66], [112, 180, 78], [64, 124, 56]], ripe: [214, 52, 46], green: [140, 176, 70], fruitShape: "round", deciduous: true },
    olive: { leaf: [[118, 148, 104], [150, 176, 128], [96, 124, 90]], ripe: [58, 42, 72], green: [130, 156, 80], fruitShape: "oval" },
  };
  const BLOBS = [
    [-22, 8, 17], [22, 9, 17], [0, 10, 20], [-14, -8, 20], [15, -9, 20], [0, -24, 21], [-27, -4, 14], [27, -4, 14],
  ];
  const FRUIT_AT = [[-18, 6], [14, 12], [2, -2], [-8, -16], [20, -6], [-26, -4], [8, -22], [26, 4]];

  P.tree = function (ctx, slot, species, age, fruit, sway, wilt, season, seasonProg, time) {
    const sp = SPECIES[species];
    const { x, y, r } = slot;
    const s = 0.2 + 0.8 * Math.pow(age, 0.85);
    shadow(ctx, x, y + 2, 14 + 30 * s, 4 + 8 * s, 0.22);

    /* leaf cover through the year (apple trees go bare) */
    let leafA = 1, autumn = 0;
    if (sp.deciduous) {
      if (season === 2) { autumn = seasonProg; leafA = seasonProg > 0.7 ? 1 - (seasonProg - 0.7) / 0.3 * 0.7 : 1; }
      else if (season === 3) { autumn = 1; leafA = 0.12; }
      else if (season === 0) leafA = 0.25 + 0.75 * clamp(seasonProg * 2.5, 0, 1);
    }

    const trunkH = 14 + 28 * s;
    const trunkW = 3 + 6 * s;
    const lean = sway * 1.2 * s;
    /* trunk */
    const tg = ctx.createLinearGradient(x - trunkW, 0, x + trunkW, 0);
    tg.addColorStop(0, "#6d4c33");
    tg.addColorStop(0.5, "#9a7450");
    tg.addColorStop(1, "#5a3e29");
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(x - trunkW, y);
    ctx.quadraticCurveTo(x - trunkW * 0.5, y - trunkH * 0.5, x - trunkW * 0.4 + lean, y - trunkH);
    ctx.lineTo(x + trunkW * 0.4 + lean, y - trunkH);
    ctx.quadraticCurveTo(x + trunkW * 0.5, y - trunkH * 0.5, x + trunkW, y);
    ctx.closePath();
    ctx.fill();

    if (age < 0.1) {
      /* a young sapling: a thin stem and a few leaves */
      ctx.fillStyle = rgb(sp.leaf[1], 1);
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + d * 5 + lean, y - trunkH + 2, 5, 2.4, d * -0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    const cy = y - trunkH - 10 * s;
    const R = s;
    /* bare branches for winter apple trees */
    if (leafA < 0.5) {
      ctx.strokeStyle = "#6d4c33";
      ctx.lineWidth = 2 * R + 0.5;
      ctx.lineCap = "round";
      for (const [dx, dy] of [[-20, -6], [20, -8], [0, -26], [-12, -16], [12, -18]]) {
        ctx.beginPath();
        ctx.moveTo(x + lean, y - trunkH);
        ctx.lineTo(x + lean + dx * R, cy + dy * R);
        ctx.stroke();
      }
    }
    /* canopy: back-to-front blobs, each lit from the upper-left */
    ctx.globalAlpha = leafA;
    const droop = wilt * 5 * R;
    BLOBS.forEach(([dx, dy, br], i) => {
      const bx = x + lean + dx * R + sway * (3 + dy * 0.05) * R;
      const by = cy + dy * R + droop;
      const rad = br * R;
      let base = sp.leaf[i % 3];
      if (autumn) base = mix(base, [214, 150, 48], autumn * 0.9);
      base = mix(base, [150, 130, 64], wilt * 0.55);
      const g = ctx.createRadialGradient(bx - rad * 0.35, by - rad * 0.4, rad * 0.1, bx, by, rad);
      g.addColorStop(0, rgb(base, 1.3));
      g.addColorStop(0.6, rgb(base, 1));
      g.addColorStop(1, rgb(base, 0.68));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, rad, 0, Math.PI * 2);
      ctx.fill();
    });

    /* blossoms in spring (apple) */
    if (sp.deciduous && season <= 1 && fruit < 0.25 && leafA > 0.5 && age >= 1) {
      for (let i = 0; i < 12; i++) {
        const [fx, fy] = FRUIT_AT[i % 8];
        ctx.fillStyle = i % 2 ? "#fff3f6" : "#f9c9d6";
        ctx.beginPath();
        ctx.arc(x + lean + (fx + (r[i % 8] - 0.5) * 12) * R, cy + (fy + (r[(i + 1) % 8] - 0.5) * 10) * R, 1.6 + 0.8 * R, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* fruit */
    if (age >= 1 && fruit > 0.12 && leafA > 0.4) {
      const n = Math.max(2, Math.round(fruit * 8));
      const ripe = fruit >= 1;
      const bob = ripe ? Math.sin(time * 4 + x) * 0.6 : 0;
      const col = mix(sp.green, sp.ripe, Math.pow(clamp((fruit - 0.45) / 0.55, 0, 1), 1.4));
      for (let i = 0; i < n; i++) {
        const [fx, fy] = FRUIT_AT[i];
        const px = x + lean + fx * R, py = cy + fy * R + bob + droop;
        const fr = 2.2 + 2.4 * fruit * R;
        const g = ctx.createRadialGradient(px - fr * 0.35, py - fr * 0.4, 0.3, px, py, fr * 1.2);
        g.addColorStop(0, rgb(col, 1.45));
        g.addColorStop(1, rgb(col, 0.8));
        ctx.fillStyle = g;
        ctx.beginPath();
        if (sp.fruitShape === "pear") ctx.ellipse(px, py, fr * 0.85, fr * 1.25, 0.3, 0, Math.PI * 2);
        else if (sp.fruitShape === "oval") ctx.ellipse(px, py, fr * 0.7, fr, 0.4, 0, Math.PI * 2);
        else ctx.arc(px, py, fr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  /* ---------------- gone-to-seed / withered ---------------- */
  P.dead = function (ctx, slot, isTree) {
    const { x, y, r } = slot;
    shadow(ctx, x, y + 1, 14, 4, 0.18);
    ctx.strokeStyle = "#8d7a52";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    const n = isTree ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const bx = x + (r[i] - 0.5) * 18;
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.quadraticCurveTo(bx + 4, y - 14 * (isTree ? 2 : 1), bx + (i % 2 ? 12 : -12), y - 6 * (isTree ? 3 : 1));
      ctx.stroke();
    }
  };

  /* dispatch used by the renderer */
  P.draw = function (ctx, st, pl, slot, time) {
    const c = pl.crop;
    const def = Farm.CROPS[c.type];
    const sway = Math.sin(time * 1.3 + slot.x * 0.05) * (st.weather.raining ? 1.5 : 0.8);
    const wilt = c.dead ? 0 : clamp((30 - pl.moist) / 24, 0, 1);
    if (c.dead) return P.dead(ctx, slot, def.kind === "tree");
    if (def.kind === "tree") {
      const S = Farm.sim;
      return P.tree(ctx, slot, def.species, c.age, c.fruit, sway, wilt, S.season(st), S.seasonProg(st), time);
    }
    return P[def.id](ctx, slot, c.p, sway, wilt);
  };
})();
