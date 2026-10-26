/* Terra Nova — things that move: the farmer, the tractor and little particle effects.
   The farmer works through a queue of jobs (walk there, then do the chore). Every job validates itself
   twice: when you click, and again when she arrives. */
(function () {
  const Farm = window.Farm;
  const { clamp } = Farm;
  const W = Farm.world;
  const Act = (Farm.actors = {});
  const st = () => Farm.game.state;

  /* ================= particles ================= */
  const fx = (Act.fx = { list: [] });
  fx.arc = function (kind, x0, y0, x1, y1, color, size) {
    const T = 0.42 + Math.random() * 0.12, g = 900;
    fx.list.push({ k: kind, x: x0, y: y0, vx: (x1 - x0) / T, vy: (y1 - y0 - 0.5 * g * T * T) / T, g, gy: y1, color, size: size || 3, life: 3, rot: Math.random() * 6 });
  };
  fx.dust = function (x, y, n, color) {
    for (let i = 0; i < (n || 6); i++)
      fx.list.push({ k: "dust", x: x + (Math.random() - 0.5) * 16, y: y - Math.random() * 4, vx: (Math.random() - 0.5) * 34, vy: -8 - Math.random() * 22, r: 3 + Math.random() * 4, life: 0.9, max: 0.9, color: color || "#c9a56a" });
  };
  fx.spark = function (x, y) {
    for (let i = 0; i < 5; i++)
      fx.list.push({ k: "spark", x: x + (Math.random() - 0.5) * 40, y: y - Math.random() * 30, vy: -20 - Math.random() * 20, life: 0.9, max: 0.9, size: 3 + Math.random() * 4 });
  };
  fx.text = function (x, y, text, color) {
    fx.list.push({ k: "text", x, y, vy: -28, text, color: color || "#2e7d32", life: 1.8, max: 1.8 });
  };
  fx.update = function (dt) {
    const L = fx.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life -= dt;
      if (p.k === "bit" || p.k === "drop") {
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += dt * 10;
        if (p.vy > 0 && p.y >= p.gy) {
          if (p.k === "drop") fx.dust(p.x, p.y, 2, "rgba(120,180,230,.8)");
          else fx.dust(p.x, p.y, 2, "#8a6a42");
          L.splice(i, 1);
          continue;
        }
      } else {
        p.x += (p.vx || 0) * dt;
        p.y += (p.vy || 0) * dt;
        if (p.k === "dust") p.r += dt * 6;
      }
      if (p.life <= 0) L.splice(i, 1);
    }
  };
  fx.draw = function (ctx) {
    for (const p of fx.list) {
      if (p.k === "bit") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.k === "drop") {
        ctx.fillStyle = "rgba(90,170,240,.95)";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 2.2, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.k === "dust") {
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1) * 0.6;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (p.k === "spark") {
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = "#fff3a6";
        ctx.beginPath();
        for (let q = 0; q < 8; q++) {
          const a = (q * Math.PI) / 4, r = q % 2 ? p.size * 0.35 : p.size;
          ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
        }
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (p.k === "text") {
        ctx.globalAlpha = clamp(p.life / 0.6, 0, 1);
        ctx.font = "bold 18px 'Trebuchet MS', sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(255,255,255,.9)";
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
      }
    }
  };

  /* ================= the farmer ================= */
  const farmer = (Act.farmer = { x: 1040, y: 396, face: "down", walking: false, phase: 0, pose: "none", poseT: 0, mounted: false, cur: null, queue: [] });
  const tractor = (Act.tractor = { x: W.park.x, y: W.park.y, face: "left", wheel: 0, rot: 0, driving: false, tilling: false, queue: [], cur: null, parking: false });

  Act.reset = function () {
    Object.assign(farmer, { x: 1040, y: 396, face: "down", walking: false, pose: "none", mounted: false, cur: null, queue: [] });
    Object.assign(tractor, { x: W.park.x, y: W.park.y, face: "left", driving: false, tilling: false, queue: [], cur: null, parking: false });
    fx.list.length = 0;
  };

  const plotStand = (j) => {
    const r = W.plots[j.plot];
    return { x: clamp(j.x == null ? r.x + r.w / 2 : j.x, r.x + 36, r.x + r.w - 36), y: r.y + r.h + 17 };
  };
  const handPos = () => ({ x: farmer.x + (farmer.face === "left" ? -14 : 14), y: farmer.y - 36 });
  const rndIn = (r, mx) => ({ x: r.x + mx + Math.random() * (r.w - mx * 2), y: r.y + 24 + Math.random() * (r.h - 40) });

  /* take 1 from the shelf, or buy it on the spot if you can afford it */
  function stock(kind) {
    const s = st(), m = Farm.MATERIALS[kind], price = Farm.sim.matPrice(s, kind);
    if (s.inv[kind] > 0) return true;
    if (s.money >= price) {
      s.money -= price;
      s.inv[kind] += 1;
      Farm.toast(`Bought 1 ${m.name.toLowerCase()} for ${Farm.money(price)}.`);
      return true;
    }
    return false;
  }
  const canGet = (kind) => st().inv[kind] > 0 || st().money >= Farm.sim.matPrice(st(), kind);
  const cropCost = (def) => Farm.sim.cost(st(), def.cost);
  const s_cost = (k) => Farm.sim.cost(st(), Farm.PRICES[k]);
  const labor = () => Farm.LOCATIONS[st().loc].labor;
  const jobDur = (def, job) => (typeof def.dur === "function" ? def.dur(job) : def.dur);

  /* ---------- job catalogue ---------- */
  const J = {};
  J.walk = {};

  /* trees can go straight into turf if you're willing to dig each hole by hand (tough work: a full day) */
  const diggingIn = (j) => {
    const pl = st().plots[j.plot];
    return pl.prep === "grass" && !Farm.sim.softSoil(st(), pl);
  };
  const digDays = (j) => (Farm.CROPS[j.crop].kind === "tree" ? 1 : 2); // a tree is one hole; a bed of seedlings takes longer
  J.plant = {
    pose: (j) => (diggingIn(j) ? "weed" : "plant"), face: "up", dur: (j) => (diggingIn(j) ? Farm.TICKS_PER_DAY * digDays(j) : 2.6), stand: plotStand,
    check(j, early) {
      const s = st(), pl = s.plots[j.plot], def = Farm.CROPS[j.crop];
      if (pl.crop) return "Something is already growing here.";
      if (pl.prep === "grass" && !(early && pendingTill(j.plot)) && !Farm.sim.softSoil(s, pl)) {
        if (Farm.sim.frozen(s)) return "The ground is frozen solid. Wait for spring.";
        if (pl.moist < 25) return "The ground is rock-hard. Water this spot first, then you can dig it by hand and plant.";
        if (s.money < cropCost(def)) return `You need ${Farm.money(cropCost(def))} for ${def.name.toLowerCase()}.`;
        return null; // dig and water: a day or two of tough work by hand, but no tilling needed
      }
      if (Farm.sim.frozen(s)) return "The ground is frozen solid. Wait for spring.";
      if (s.money < cropCost(def)) return `You need ${Farm.money(cropCost(def))} for ${def.name.toLowerCase()}.`;
      return null;
    },
    fx(j, p, dt) {
      j.acc = (j.acc || 0) + dt;
      if (diggingIn(j)) {
        if (j.acc > 0.15) { j.acc = 0; fx.dust(farmer.x + (Math.random() - 0.5) * 60, farmer.y - 12, 3, "#8a6a42"); }
        return;
      }
      if (j.acc > 0.07 && p < 0.9) {
        j.acc = 0;
        const slots = Farm.sim.slots(j.plot, j.crop);
        const sl = slots[Math.floor(Math.random() * slots.length)];
        const h = handPos();
        fx.arc("bit", h.x, h.y, sl.x + (Math.random() - 0.5) * 8, sl.y, ["#c9922e", "#b57f22", "#a06a1c"][Math.floor(Math.random() * 3)], 2.6);
      }
    },
    done(j) {
      const s = st(), pl = s.plots[j.plot], def = Farm.CROPS[j.crop];
      if (pl.crop || s.money < cropCost(def)) return;
      s.money -= cropCost(def);
      pl.crop = { type: j.crop, p: 0, age: 0, fruit: 0, stress: 0, fed: false, dead: false };
      if (pl.prep === "grass" && def.kind !== "tree") { pl.prep = "bare"; pl.smothering = false; pl.smother = 0; } // sown straight into soft, wet turf
      pl.weeds *= 0.5;
      Farm.sound.blip(420, 0.12, "triangle", 0.05, 640);
      if (def.kind === "tree") Farm.lesson("perennial");
      if (def.id === "wheat" || def.id === "cannabis") Farm.lesson("alive");
    },
  };

  J.water = {
    pose: "water", face: "up", dur: 1.9, stand: plotStand,
    check(j, early) {
      const s = st(), pl = s.plots[j.plot];
      /* an empty bucket is fine if she's already on her way to the hose */
      const refilling = farmer.queue.some((q) => q.type === "fill") || (farmer.cur && farmer.cur.job.type === "fill");
      if (s.bucket <= 0 && !(early && refilling)) return "Your bucket is empty. Click the hose reel on the left to fill it.";
      if (pl.moist >= 95) return "This plot is already soaked.";
      return null;
    },
    start(j) { j.m0 = st().plots[j.plot].moist; },
    fx(j, p, dt) {
      const pl = st().plots[j.plot];
      pl.moist = clamp(j.m0 + Farm.LOCATIONS[st().loc].pour * Farm.sim.infil(pl) * p, 0, 100);
      if (p > 0.2) {
        j.acc = (j.acc || 0) + dt;
        if (j.acc > 0.045) {
          j.acc = 0;
          const h = handPos();
          const t = rndIn(W.plots[j.plot], 24);
          fx.arc("drop", h.x + 8, h.y + 6, t.x, t.y, "#5aaaf0", 3);
        }
      }
    },
    done(j) {
      const s = st();
      s.bucket = Math.max(0, s.bucket - 1);
      const pl = s.plots[j.plot];
      if (pl.tilth < 35) Farm.lesson("clumpy");
      else if (Farm.LOCATIONS[s.loc].sand >= 50) Farm.lesson("texture");
    },
  };

  J.fill = {
    pose: "fill", face: "left", dur: 1.6,
    stand: () => W.hose.stand,
    check() {
      const s = st();
      return s.bucket >= s.bucketCap ? "Your bucket is already full." : null;
    },
    fx(j, p, dt) {
      j.acc = (j.acc || 0) + dt;
      if (j.acc > 0.06) {
        j.acc = 0;
        fx.arc("drop", W.hose.x + 28, W.hose.y - 30, farmer.x - 8, farmer.y - 26, "#5aaaf0", 3);
      }
    },
    done() {
      const s = st();
      s.bucket = s.bucketCap;
      Farm.sound.blip(520, 0.2, "sine", 0.04, 300);
    },
  };

  J.weed = {
    pose: "weed", face: "up", dur: 1.9, stand: plotStand,
    check(j) { return st().plots[j.plot].weeds < 8 ? "No weeds to pull here." : null; },
    fx(j, p, dt) {
      j.acc = (j.acc || 0) + dt;
      if (j.acc > 0.28) {
        j.acc = 0;
        fx.dust(farmer.x + (Math.random() - 0.5) * 30, farmer.y - 14, 3, "#8a6a42");
      }
    },
    done(j) {
      const s = st(), pl = s.plots[j.plot];
      const bits = Math.max(1, Math.round(pl.weeds / 35));
      pl.weeds = 0;
      s.bin.raw = Math.min(12, s.bin.raw + bits);
      fx.text(farmer.x, farmer.y - 70, "+greens for compost", "#4d8f2a");
      Farm.lesson("pulling");
      Farm.sound.blip(200, 0.1, "triangle", 0.05);
    },
  };

  J.harvest = {
    pose: "harvest", face: "up", dur: 2.0, stand: plotStand,
    check(j) { return Farm.sim.isRipe(st().plots[j.plot]) ? null : "That isn't ripe yet."; },
    fx(j, p, dt) {
      j.acc = (j.acc || 0) + dt;
      if (j.acc > 0.25) { j.acc = 0; fx.spark(farmer.x + (Math.random() - 0.5) * 60, farmer.y - 40); }
    },
    done(j) {
      const s = st(), pl = s.plots[j.plot], def = Farm.CROPS[pl.crop.type];
      const value = Farm.sim.harvestValue(s, pl);
      s.money += value;
      s.stats.harvests += 1;
      s.stats.earned += value;
      const r = W.plots[j.plot];
      fx.text(r.x + r.w / 2, r.y + 20, "+" + Farm.money(value), "#2e7d32");
      Farm.sound.blip(660, 0.16, "sine", 0.06, 1100);
      /* the harvest carries nutrients off the plot: refill with compost (or a big farm's usual re-tilling and fertilizer) */
      const take = def.kind === "tree" ? 4 : def.id === "wheat" ? 10 : 16;
      pl.fert = Math.max(0, pl.fert - take);
      Farm.lesson("nutrients");
      if (def.kind === "tree") {
        pl.crop.fruit = 0;
        s.bin.raw = Math.min(12, s.bin.raw + 1);
      } else {
        const wasWheat = def.id === "wheat";
        pl.crop = null;
        if (wasWheat) {
          pl.mulch = Math.max(pl.mulch, 45);
          pl.mulchType = "straw";
          Farm.lesson("straw");
          Farm.toast("🌾 Harvest done! The plot is empty again, and the leftover straw stays on the soil as free mulch.");
        } else {
          s.bin.raw = Math.min(12, s.bin.raw + 2);
          Farm.toast("Harvest done! The plot is empty again, and the plant waste goes to the compost bin.");
        }
      }
    },
  };

  J.clear = {
    pose: "weed", face: "up", dur: 1.4, stand: plotStand,
    check(j) { const c = st().plots[j.plot].crop; return c && c.dead ? null : "Nothing to clear."; },
    done(j) {
      const s = st();
      s.plots[j.plot].crop = null;
      s.bin.raw = Math.min(12, s.bin.raw + 2);
      Farm.sound.blip(180, 0.1, "triangle", 0.05);
    },
  };

  J.mulch = {
    pose: "mulch", face: "up", dur: () => 1.9 * labor(), stand: plotStand,
    check(j) {
      const s = st(), pl = s.plots[j.plot], m = Farm.MATERIALS[j.mat];
      if (!canGet(j.mat)) return `You need ${Farm.money(Farm.sim.matPrice(s, j.mat))} for ${m.name.toLowerCase()}.`;
      if (pl.mulch >= 85 && !pl.smothering) return "This plot is already well mulched.";
      return null;
    },
    start(j) { stock(j.mat); },
    fx(j, p, dt) {
      j.acc = (j.acc || 0) + dt;
      if (j.acc > 0.05 * Math.min(2, labor()) && p < 0.9) {
        j.acc = 0;
        const h = handPos(), t = rndIn(W.plots[j.plot], 14);
        fx.arc("bit", h.x, h.y, t.x, t.y, j.mat === "chips" ? "#9a6e44" : "#dcb85c", j.mat === "chips" ? 3.2 : 2.4);
      }
    },
    done(j) {
      const s = st(), pl = s.plots[j.plot];
      if (s.inv[j.mat] <= 0) return;
      s.inv[j.mat] -= 1;
      pl.mulchType = j.mat;
      pl.mulch = Math.min(100, pl.mulch + (j.mat === "chips" ? 100 : 60));
      if (pl.prep === "grass" && !pl.smothering) {
        pl.smothering = true;
        pl.smother = 0;
        Farm.lesson("sheet");
        Farm.toast("🍂 Sheet mulching: the grass will slowly die under the blanket and turn into soil. No digging needed!");
      } else {
        Farm.lesson("mulch");
      }
      const c = pl.crop && Farm.CROPS[pl.crop.type];
      if (c && c.kind === "tree") Farm.lesson("treechips");
      Farm.sound.blip(300, 0.1, "triangle", 0.04);
    },
  };

  J.compost = {
    pose: "mulch", face: "up", dur: () => 1.6 * Math.max(1, labor() * 0.8), stand: plotStand,
    check(j) {
      return canGet("compost") ? null : `You need ${Farm.money(Farm.sim.matPrice(st(), "compost"))} for a bag of compost.`;
    },
    start() { stock("compost"); },
    fx(j, p, dt) {
      j.acc = (j.acc || 0) + dt;
      if (j.acc > 0.06 && p < 0.9) {
        j.acc = 0;
        const h = handPos(), t = rndIn(W.plots[j.plot], 14);
        fx.arc("bit", h.x, h.y, t.x, t.y, "#4a3220", 2.8);
      }
    },
    done(j) {
      const s = st(), pl = s.plots[j.plot];
      if (s.inv.compost <= 0) return;
      s.inv.compost -= 1;
      pl.fert = Math.min(100, pl.fert + 22);
      pl.life = Math.min(100, pl.life + 14);
      pl.tilth = Math.min(100, pl.tilth + 10);
      fx.spark(farmer.x, farmer.y - 40);
      Farm.sound.blip(380, 0.14, "sine", 0.05, 560);
    },
  };

  J.feed = {
    pose: "mulch", face: "up", dur: 1.3, stand: plotStand,
    check(j) {
      const pl = st().plots[j.plot];
      if (!pl.crop || pl.crop.dead) return "Quick-feed is for growing plants. Plant something first.";
      if (pl.crop.fed) return "This crop already got its quick-feed.";
      if (!canGet("feed")) return `You need ${Farm.money(Farm.sim.matPrice(st(), "feed"))} for quick-feed.`;
      return null;
    },
    start() { stock("feed"); },
    done(j) {
      const s = st(), pl = s.plots[j.plot], c = pl.crop, def = Farm.CROPS[c.type];
      if (s.inv.feed <= 0) return;
      s.inv.feed -= 1;
      c.fed = true;
      if (def.kind === "tree") { if (c.age < 1) c.age = Math.min(1, c.age + 0.08); else c.fruit = Math.min(1, c.fruit + 0.1); }
      else c.p = Math.min(1, c.p + 0.12);
      pl.fert = Math.min(100, pl.fert + 15);
      pl.life = Math.max(0, pl.life - 12);
      fx.dust(farmer.x, farmer.y - 12, 5, "#e9e0c4");
      Farm.lesson("feed");
      Farm.toast("🧪 The plant shoots up, but the worms are not happy. Quick-feed feeds the plant, not the soil.");
    },
  };

  J.drip = {
    pose: "weed", face: "up", dur: 2.4, stand: plotStand,
    check(j) {
      const s = st();
      if (s.plots[j.plot].drip) return "This plot already has a drip line.";
      if (s.money < s_cost("drip")) return `A drip line costs ${Farm.money(s_cost("drip"))}.`;
      return null;
    },
    done(j) {
      const s = st();
      if (s.money < s_cost("drip")) return;
      s.money -= s_cost("drip");
      s.plots[j.plot].drip = true;
      fx.spark(farmer.x, farmer.y - 40);
      Farm.lesson("drip");
      Farm.toast("💧 Drip line installed. This plot now waters itself.");
    },
  };

  J.fabric = {
    pose: "mulch", face: "up", dur: () => 2.2 * Math.max(1, labor() * 0.5), stand: plotStand,
    check(j) {
      const s = st(), pl = s.plots[j.plot];
      if (pl.fabric) return "This plot already has fabric.";
      if (pl.smothering) return "Fabric and sheet mulching don't mix: pick one.";
      if (!canGet("fabric")) return `You need ${Farm.money(Farm.sim.matPrice(s, "fabric"))} for landscape fabric.`;
      return null;
    },
    start() { stock("fabric"); },
    done(j) {
      const s = st(), pl = s.plots[j.plot];
      if (s.inv.fabric <= 0) return;
      s.inv.fabric -= 1;
      pl.fabric = true;
      pl.weeds = 0;
      if (pl.prep === "grass") pl.prep = "bare";
      fx.dust(farmer.x, farmer.y - 10, 4, "#6b6f73");
      Farm.lesson("fabric");
      Farm.sound.blip(240, 0.14, "triangle", 0.04);
    },
  };

  J.herbicide = {
    pose: "mulch", face: "up", dur: 1.3, stand: plotStand,
    check(j) {
      const s = st(), pl = s.plots[j.plot];
      if (pl.crop) return "Weedkiller would kill the crop too. Spray before planting.";
      if (pl.smothering) return "The mulch is already doing this job.";
      if (!canGet("herbicide")) return `You need ${Farm.money(Farm.sim.matPrice(s, "herbicide"))} for herbicide.`;
      return null;
    },
    start() { stock("herbicide"); },
    fx(j, p, dt) {
      j.acc = (j.acc || 0) + dt;
      if (j.acc > 0.05) { j.acc = 0; fx.dust(farmer.x + (Math.random() - 0.5) * 70, farmer.y - 20, 1, "rgba(200,225,170,.9)"); }
    },
    done(j) {
      const s = st(), pl = s.plots[j.plot];
      if (s.inv.herbicide <= 0) return;
      s.inv.herbicide -= 1;
      pl.weeds = 0;
      pl.noWeeds = 60;
      pl.life = Math.max(0, pl.life - 14);
      pl.fert = Math.max(0, pl.fert - 3);
      if (pl.prep === "grass") { pl.prep = "bare"; pl.till = false; }
      Farm.lesson("herbicide");
      Farm.toast("☠️ Weeds gone in a flash, but the worm count dropped.");
      Farm.sound.blip(120, 0.25, "sawtooth", 0.03);
    },
  };

  J.bin = {
    pose: "fill", face: "left", dur: 1.2,
    stand: () => W.bin.stand,
    check() { return st().bin.ready > 0 ? null : "Nothing is ready yet. Compost needs time (and greens + browns)."; },
    done() {
      const s = st();
      const n = s.bin.ready;
      s.inv.compost += n;
      s.bin.ready = 0;
      fx.text(W.bin.x, W.bin.y - 70, `+${n} compost`, "#6a4a2a");
      s.stats.collected = (s.stats.collected || 0) + 1;
      Farm.lesson("compost");
      if (s.stats.collected >= 2) Farm.lesson("heap"); // a second note, saved for the second batch
      Farm.sound.blip(300, 0.12, "triangle", 0.05, 480);
    },
  };

  J.mount = {
    pose: "none", face: "right", dur: 0.7,
    stand: () => ({ x: tractor.x + 30, y: tractor.y + 22 }),
    check() { return null; },
    done() {
      farmer.mounted = true;
      Farm.emit("mounted");
    },
  };

  /* ---------- farmer logic ---------- */
  function begin(job) {
    if (job.type === "walk") {
      farmer.cur = { job, stage: "walk", tx: job.x, ty: job.y };
      return;
    }
    /* an empty bucket mid-queue: she walks to the hose, refills, then comes back to this plot */
    if (job.type === "water" && st().bucket <= 0) {
      farmer.queue.unshift(job);
      job = { type: "fill" };
    }
    const def = J[job.type];
    const err = def.check(job);
    if (err) { if (job.type !== "fill") Farm.toast(err); return; }
    const sp = def.stand(job);
    farmer.cur = { job, stage: "walk", tx: sp.x, ty: sp.y };
  }

  Act.enqueue = function (job) {
    if (farmer.queue.length < 8) farmer.queue.push(job);
    else Farm.toast("That's plenty of chores for now.");
  };
  Act.walkTo = function (x, y) {
    x = clamp(x, W.walk.x0, W.walk.x1);
    y = clamp(y, W.walk.y0, W.walk.y1);
    if (x > 1000 && y < 292) y = 292; // keep out of the barn
    farmer.queue = [{ type: "walk", x, y }];
    if (farmer.cur && farmer.cur.stage === "walk") farmer.cur = null;
  };
  Act.stopQueue = function () {
    farmer.queue.length = 0;
    if (farmer.cur && farmer.cur.stage === "walk") farmer.cur = null;
  };
  Act.queuedPlots = function () {
    const set = new Set();
    if (farmer.cur && farmer.cur.job.plot != null) set.add(farmer.cur.job.plot);
    farmer.queue.forEach((j) => j.plot != null && set.add(j.plot));
    tractor.queue.forEach((j) => set.add(j.plot));
    if (tractor.cur) set.add(tractor.cur.job.plot);
    return set;
  };
  Act.currentJobType = () => (farmer.cur ? farmer.cur.job.type : null);
  Act.check = (job, early) => (J[job.type] && J[job.type].check ? J[job.type].check(job, early) : null);
  /* a plot lined up for the tractor counts as "about to be bare" when you queue seeds for it */
  const pendingTill = (i) => tractor.queue.some((q) => q.plot === i) || (tractor.cur && tractor.cur.job.plot === i);

  function updateFarmer(dt) {
    if (farmer.mounted) {
      farmer.x = tractor.x;
      farmer.y = tractor.y;
      farmer.walking = false;
      farmer.pose = "none";
      return;
    }
    if (!farmer.cur && farmer.queue.length) begin(farmer.queue.shift());
    const c = farmer.cur;
    farmer.walking = false;
    if (!c) { farmer.pose = "none"; return; }
    if (c.stage === "walk") {
      const dx = c.tx - farmer.x, dy = c.ty - farmer.y, d = Math.hypot(dx, dy);
      farmer.pose = "none";
      if (d < 3) {
        if (c.job.type === "walk") { farmer.cur = null; farmer.face = "down"; return; }
        const def = J[c.job.type];
        const err = def.check(c.job);
        if (err) { Farm.toast(err); farmer.cur = null; return; }
        c.stage = "work";
        c.t = 0;
        farmer.face = def.face;
        if (def.start) def.start(c.job);
        return;
      }
      const step = Math.min(d, 150 * dt);
      farmer.x += (dx / d) * step;
      farmer.y += (dy / d) * step;
      farmer.walking = true;
      farmer.phase += dt * 11;
      if (Math.abs(dx) > Math.abs(dy) * 1.25) farmer.face = dx < 0 ? "left" : "right";
      else if (Math.abs(dy) > Math.abs(dx) * 1.25) farmer.face = dy < 0 ? "up" : "down";
    } else {
      const def = J[c.job.type];
      c.t += dt;
      const dur = jobDur(def, c.job);
      farmer.pose = typeof def.pose === "function" ? def.pose(c.job) : def.pose;
      farmer.poseT = clamp(c.t / dur, 0, 1);
      if (def.fx) def.fx(c.job, farmer.poseT, dt);
      if (c.t >= dur) {
        def.done(c.job);
        farmer.cur = null;
        farmer.pose = "none";
        Farm.game.markDirty();
      }
    }
  }

  /* ================= the tractor ================= */
  function buildTill(job) {
    const r = W.plots[job.plot];
    const x0 = r.x - 24, x1 = r.x + r.w + 56;
    const y = r.y + r.h * 0.57; // one pass straight through the middle: a small plot needs no more
    return [{ x: x0, y }, { x: x1, y, till: true }];
  }

  Act.tillCheck = function (plotIdx) {
    const s = st(), pl = s.plots[plotIdx], loc = Farm.LOCATIONS[s.loc];
    if (loc.kit === "none") { Farm.lesson("steep"); return "These slopes are far too steep for a tractor. It would tip over."; }
    if (pl.crop) return "Harvest or clear the crop before tilling.";
    if (loc.kit === "rototiller" && pl.moist < 15) { Farm.lesson("clumpy"); return "The soil is baked rock-hard. The rototiller just bounces off. Water this bed first."; }
    if (Farm.sim.frozen(s)) return "The ground is frozen. The tractor can't till it.";
    if (pl.smothering) return "The mulch is already working on this one.";
    return null;
  };
  Act.queueTill = function (plotIdx) {
    const err = Act.tillCheck(plotIdx);
    if (err) return Farm.toast(err);
    if (tractor.queue.length >= 6) return Farm.toast("The tractor has enough to do for now.");
    tractor.queue.push({ type: "till", plot: plotIdx });
  };
  Act.dismount = function () {
    tractor.queue.length = 0;
    tractor.parking = true;
  };
  Act.isMounted = () => farmer.mounted;

  function updateTractor(dt) {
    const T = tractor;
    T.driving = false;
    T.tilling = false;
    if (!farmer.mounted) return;
    if (!T.cur && T.queue.length) {
      const job = T.queue.shift();
      if (Act.tillCheck(job.plot)) { Farm.toast(Act.tillCheck(job.plot)); return; }
      const pts = buildTill(job);
      const total = pts.reduce((a, p, i) => (p.till ? a + Math.abs(p.x - pts[i - 1].x) : a), 0);
      T.cur = { job, pts, i: 0, tilled: 0, total };
      const pl = st().plots[job.plot];
      pl.tillAmt = 0;
    }
    const c = T.cur;
    if (!c) {
      if (T.parking) {
        const dx = W.park.x - T.x, dy = W.park.y - T.y, d = Math.hypot(dx, dy);
        if (d < 4) {
          T.parking = false;
          T.face = "left";
          farmer.mounted = false;
          farmer.x = T.x - 56;
          farmer.y = T.y + 24;
          farmer.face = "down";
          Farm.emit("dismounted");
        } else {
          drive(dt, dx, dy, d, speeds().free);
        }
      }
      return;
    }
    const p = c.pts[c.i];
    const dx = p.x - T.x, dy = p.y - T.y, d = Math.hypot(dx, dy);
    const pl = st().plots[c.job.plot];
    const tillingNow = !!p.till && c.i > 0;
    if (c.i === 0 && d > 3) {
      drive(dt, dx, dy, d, speeds().free);
      return;
    }
    if (d < 3) {
      c.i++;
      if (c.i >= c.pts.length) finishTill(c);
      return;
    }
    if (tillingNow) {
      T.tilling = true;
      pl.till = true;
      const sp = speeds().till * (Farm.LOCATIONS[st().loc].kit === "rototiller" ? 0.5 + 0.5 * (pl.tilth / 100) : 1);
      const step = Math.min(d, sp * dt);
      c.tilled += step;
      pl.tillAmt = clamp(c.tilled / c.total, 0, 1);
      drive(dt, dx, dy, d, sp);
      const back = T.face === "right" ? -62 : 62;
      if (Math.random() < 0.6) fx.dust(T.x + back, T.y - 6, 1, "#9a7448");
    } else drive(dt, dx, dy, d, speeds().free * 0.8);
  }

  /* the tractor is quick; a hand-pushed rototiller is not */
  const speeds = () => (Farm.LOCATIONS[st().loc].kit === "rototiller" ? { free: 800, till: 600 } : { free: 900, till: 700 });

  function drive(dt, dx, dy, d, speed) {
    const T = tractor;
    const step = Math.min(d, speed * dt);
    T.x += (dx / d) * step;
    T.y += (dy / d) * step;
    if (Math.abs(dx) > 6) T.face = dx < 0 ? "left" : "right";
    T.driving = true;
    T.wheel += (step / 23) * (T.face === "left" ? -1 : 1);
    T.rot += dt * (T.tilling ? 20 : 4) * (T.face === "left" ? -1 : 1);
  }

  function finishTill(c) {
    const s = st(), pl = s.plots[c.job.plot];
    tractor.cur = null;
    pl.tillAmt = 1;
    pl.till = true;
    pl.prep = "bare";
    pl.smothering = false;
    pl.smother = 0;
    pl.weeds = 0;
    pl.mulch = 0;
    pl.life = Math.max(0, pl.life - (Farm.LOCATIONS[s.loc].kit === "rototiller" ? 12 : 18));
    pl.fert = Math.max(0, pl.fert - 3);
    pl.tilth = Math.max(pl.tilth, 80); // loose and fluffy... for now
    pl.noWeeds = 0;
    fx.dust(tractor.x, tractor.y, 8);
    Farm.lesson("tilling");
    Farm.toast("🚜 Tilled! It looks neat, but the worm count just dropped. Tilling harms the soil life.");
    Farm.sound.blip(150, 0.2, "sawtooth", 0.04);
    Farm.game.markDirty();
  }

  /* ---------- frame update + queries ---------- */
  Act.update = function (dt) {
    if (!st()) return;
    updateFarmer(dt);
    updateTractor(dt);
    fx.update(dt);
  };

  Act.isDoing = (type) => !!(farmer.cur && farmer.cur.job.type === type);
})();
