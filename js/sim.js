/* Terra Nova — the living farm: time, weather, soil, water and plant growth.
   Everything here is pure game state (no drawing, no DOM). */
(function () {
  const Farm = window.Farm;
  const { clamp } = Farm;
  const S = (Farm.sim = {});

  /* ---------- where things stand on the 1280×720 map ---------- */
  const plots = [];
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 3; c++) plots.push({ x: 200 + c * 265, y: r ? 395 : 170, w: 230, h: 140 });
  /* the back yard uses smaller raised beds with paths between them; the farms use big fields */
  const LAYOUTS = {
    yard: { w: 215, h: 135, xs: [245, 505, 765], ys: [195, 400] },
    field: { w: 250, h: 150, xs: [170, 450, 730], ys: [168, 392] },
  };
  Farm.world = {
    layout(scale) {
      const L = LAYOUTS[scale === "yard" ? "yard" : "field"];
      plots.forEach((p, i) => Object.assign(p, { x: L.xs[i % 3], y: L.ys[Math.floor(i / 3)], w: L.w, h: L.h }));
      Farm.emit("layout");
    },
    plots,
    hose: { x: 92, y: 352, stand: { x: 150, y: 372 } },
    bin: { x: 100, y: 540, stand: { x: 158, y: 556 } },
    barn: { x: 1130, y: 262 },
    park: { x: 1085, y: 352 },
    sign: { x: 1150, y: 500 },
    walk: { x0: 30, x1: 1250, y0: 150, y1: 600 },
  };

  /* sitting spots for each plant inside a plot */
  S.slots = function (idx, cropId) {
    const p = plots[idx];
    const def = Farm.CROPS[cropId];
    const [cols, rows] = def.grid;
    const rnd = Farm.rng(idx * 977 + cropId.length * 31);
    const out = [];
    if (def.kind === "tree") {
      for (let c = 0; c < cols; c++) out.push({ x: p.x + p.w * (0.3 + 0.4 * c), y: p.y + p.h * 0.72, r: [rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd()] });
      return out;
    }
    const mx = def.id === "cannabis" ? 52 : 30, top = def.id === "cannabis" ? 62 : 46, bot = 18;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const fx = cols > 1 ? c / (cols - 1) : 0.5, fy = rows > 1 ? r / (rows - 1) : 0.5;
        out.push({
          x: p.x + mx + fx * (p.w - mx * 2) + (rnd() - 0.5) * 7,
          y: p.y + top + fy * (p.h - top - bot) + (rnd() - 0.5) * 5,
          r: [rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd()],
        });
      }
    return out.sort((a, b) => a.y - b.y);
  };

  /* ---------- state ---------- */
  S.newPlot = function (loc) {
    return {
      prep: "grass", // "grass" (not prepared) or "bare" (ready for seeds)
      till: false, tillAmt: 0, // furrows from the tractor
      smothering: false, smother: 0, // no-dig sheet mulching progress 0..1
      mulch: 0, mulchType: "straw",
      fert: clamp(loc.fert + (Math.random() - 0.5) * 8, 5, 95),
      life: clamp(loc.life + (Math.random() - 0.5) * 8, 5, 95),
      tilth: clamp(loc.tilth + (Math.random() - 0.5) * 8, 0, 100), // 0 = hard clods, 100 = soft crumbs
      moist: clamp(loc.moist + Math.random() * 6, 0, 100),
      weeds: 0,
      fabric: false, // landscape fabric laid down
      noWeeds: 0, // days of weed-free after herbicide
      drip: false,
      crop: null, // { type, p, age, fruit, stress, fed, dead }
    };
  };

  S.newState = function (name, locId, carry) {
    const loc = Farm.LOCATIONS[locId];
    carry = carry || {};
    return {
      v: 2, name, loc: locId, day: loc.startDay, money: loc.money,
      progress: carry.progress || { unlocked: ["sunnyvale"], done: {} },
      inv: { straw: 3, chips: 1, compost: 1, feed: 0, fabric: 0, herbicide: 0 },
      bucketCap: 4, bucket: 0,
      bin: { raw: 2, ready: 1, timer: 0, scraps: 0 },
      plots: plots.map(() => S.newPlot(loc)),
      lessons: carry.lessons || {}, stats: { harvests: 0, earned: 0 },
      weather: { raining: false, left: 0, wind: 0 },
      savedAt: 0,
    };
  };

  /* make an older / hand-edited save safe to use */
  S.repair = function (st) {
    const loc = Farm.LOCATIONS[st.loc] || Farm.LOCATIONS.rainbow;
    if (!Farm.LOCATIONS[st.loc]) st.loc = "rainbow";
    if (!isFinite(st.day)) st.day = 0;
    if (!isFinite(st.money)) st.money = 100;
    st.inv = Object.assign({ straw: 0, chips: 0, compost: 0, feed: 0, fabric: 0, herbicide: 0 }, st.inv);
    st.progress = Object.assign({ unlocked: ["sunnyvale"], done: {} }, st.progress);
    if (st.progress.unlocked.indexOf(st.loc) < 0) st.progress.unlocked.push(st.loc);
    st.bin = Object.assign({ raw: 0, ready: 0, timer: 0, scraps: 0 }, st.bin);
    st.bucketCap = st.bucketCap || 4;
    st.bucket = clamp(st.bucket || 0, 0, st.bucketCap);
    st.lessons = st.lessons || {};
    for (const k in st.lessons) if (!st.lessons[k]) st.lessons[k] = 1; // older saves stored day 0 as "not found"
    st.stats = Object.assign({ harvests: 0, earned: 0 }, st.stats);
    st.weather = Object.assign({ raining: false, left: 0, wind: 0 }, st.weather);
    while (st.plots.length < plots.length) st.plots.push(S.newPlot(loc));
    st.plots = st.plots.slice(0, plots.length);
    st.plots.forEach((p) => {
      const d = S.newPlot(loc);
      for (const k in d) if (p[k] === undefined || (typeof d[k] === "number" && !isFinite(p[k]))) p[k] = d[k];
      if (p.crop) {
        p.crop = Object.assign({ p: 0, age: 0, fruit: 0, stress: 0, fed: false, dead: false }, p.crop);
        if (!Farm.CROPS[p.crop.type]) p.crop = null;
      }
    });
    return st;
  };

  /* ---------- calendar ---------- */
  S.season = (st) => Math.floor((st.day % Farm.DAYS_PER_YEAR) / Farm.DAYS_PER_SEASON);
  S.seasonProg = (st) => (st.day % Farm.DAYS_PER_SEASON) / Farm.DAYS_PER_SEASON;
  S.year = (st) => Math.floor(st.day / Farm.DAYS_PER_YEAR) + 1;
  S.yearProg = (st) => (st.day % Farm.DAYS_PER_YEAR) / Farm.DAYS_PER_YEAR;
  S.dayOfSeason = (st) => Math.floor((st.day % Farm.DAYS_PER_SEASON) / Farm.TICKS_PER_DAY) + 1;
  S.frozen = (st) => Farm.LOCATIONS[st.loc].frost && S.season(st) === 3;
  /* wet winter soil in a mild climate is soft enough to sow straight into the turf */
  S.softSoil = (st, pl) => S.season(st) === 3 && !Farm.LOCATIONS[st.loc].frost && pl.moist >= 30;
  S.cost = (st, base) => Math.round(base * Farm.LOCATIONS[st.loc].costMul);
  S.matPrice = (st, kind) => S.cost(st, Farm.MATERIALS[kind].price);
  S.avgLife = (st) => st.plots.reduce((a, p) => a + p.life, 0) / st.plots.length;
  /* how readily this plot soaks up water: crusty clods and plastic both shed it */
  S.infil = (pl) => (pl.fabric ? 0.45 : 1) * (0.5 + 0.5 * (pl.tilth / 100));

  /* ---------- queries used by tooltips, meters and tools ---------- */
  S.isRipe = function (pl) {
    const c = pl.crop;
    if (!c || c.dead) return false;
    const def = Farm.CROPS[c.type];
    return def.kind === "tree" ? c.fruit >= 1 : c.p >= 1;
  };
  S.progress = function (pl) {
    const c = pl.crop;
    if (!c) return 0;
    const def = Farm.CROPS[c.type];
    if (def.kind !== "tree") return c.p;
    return c.age < 1 ? c.age * 0.5 : 0.5 + c.fruit * 0.5; // trees: first half growing up, second half making fruit
  };
  S.waterLabel = (m) => (m < 12 ? "Very thirsty" : m < 30 ? "Getting dry" : m < 80 ? "Nicely watered" : "Soaked");
  S.tilthLabel = (t) => (t < 30 ? "Hard clods" : t < 60 ? "Lumpy" : "Crumbly");
  S.lifeLabel = (l) => (l < 25 ? "Tired soil" : l < 50 ? "Waking up" : l < 75 ? "Healthy" : "Thriving");
  S.weedLabel = (w) => (w < 15 ? "Clean" : w < 50 ? "Some weeds" : "Choked by weeds");
  S.mulchLabel = (m) => (m < 5 ? "Bare" : m < 40 ? "Thin mulch" : "Well mulched");

  S.harvestValue = function (st, pl) {
    const def = Farm.CROPS[pl.crop.type];
    const fit = Farm.LOCATIONS[st.loc].fit[def.id] || 1;
    const q = clamp((pl.fert * 0.5 + pl.life * 0.5) / 100, 0, 1);
    return Math.round(def.value * Farm.LOCATIONS[st.loc].valueMul * (0.78 + 0.34 * q) * (0.9 + 0.1 * fit));
  };

  /* ---------- the daily simulation ---------- */
  const SEASON_HEAT = [1, 1.5, 1.1, 0.5];
  const WEED_SEASON = [1, 0.9, 0.5, 0.1];
  const SMOTHER_RATE = [1.1, 0.6, 1.1, 1.2]; // by season; adds up to one year
  const RAIN_CHANCE = 0.02; // per day, times the place's seasonal multiplier
  const WIND_CHANCE = [0.012, 0.012, 0.03, 0.012];

  S.update = function (st, dt) {
    const loc = Farm.LOCATIONS[st.loc];
    const prevDay = Math.floor(st.day);
    const prevSeason = S.season(st);
    const prevYear = S.year(st);
    st.day += dt;
    const s = S.season(st);
    const frozen = S.frozen(st);

    /* a new day begins: weather rolls the dice */
    for (let d = prevDay + 1; d <= Math.floor(st.day); d++) {
      const w = st.weather;
      if (!w.raining && Math.random() < RAIN_CHANCE * loc.rain[s]) {
        w.raining = true;
        w.left = 5 + Math.random() * 6;
        Farm.lesson("rain");
        if (frozen) Farm.lesson("frozen");
      }
      if (w.wind <= 0 && Math.random() < WIND_CHANCE[s] * loc.wind) {
        w.wind = 3 + Math.random() * 2;
        Farm.emit("wind");
        st.plots.forEach((pl, i) => {
          if (pl.fabric && Math.random() < 0.6) { pl.fabric = false; Farm.emit("fabricLost", i); }
        });
      }
      st.bin.scraps += 1;
      if (st.bin.scraps >= 45) { st.bin.scraps = 0; st.bin.raw = Math.min(12, st.bin.raw + 1); }
    }
    if (st.weather.wind > 0) st.weather.wind -= dt;
    if (st.weather.raining) {
      st.weather.left -= dt;
      if (st.weather.left <= 0) st.weather.raining = false;
    }

    if (S.season(st) !== prevSeason) Farm.emit("season", S.season(st));
    if (S.year(st) !== prevYear) Farm.emit("year", S.year(st));
    if (frozen && !st._frozenNoted) { st._frozenNoted = true; Farm.lesson("frozen"); }
    if (!frozen) st._frozenNoted = false;

    /* compost bin: raw scraps cook into compost */
    const bin = st.bin;
    if (bin.raw > 0 && bin.ready < 12) {
      bin.timer += dt;
      if (bin.timer >= 24) {
        bin.timer = 0;
        bin.raw -= 1;
        bin.ready += 1;
        Farm.emit("binready");
      }
    }

    st.plots.forEach((pl, i) => S.updatePlot(st, pl, i, dt, s, loc, frozen));
  };

  S.updatePlot = function (st, pl, i, dt, s, loc, frozen) {
    const crop = pl.crop;
    const def = crop ? Farm.CROPS[crop.type] : null;
    const covered = pl.mulch > 5;

    /* --- water --- */
    const texture = 0.7 + (loc.sand / 100) * 0.9; // sandy soil drains faster
    const spongy = 1 - 0.3 * ((pl.life + pl.fert) / 200); // humus holds water
    let evap = 0.5 * loc.heat * SEASON_HEAT[s] * texture * spongy;
    if (covered) evap *= 0.5;
    else if (pl.till) evap *= 1.25;
    if (pl.prep === "grass" && !pl.smothering) evap *= 0.7;
    if (frozen) evap *= 0.2;
    if (crop && !crop.dead) evap += 0.3 * Math.min(1, S.progress(pl) + 0.2);
    if (crop && def.kind === "tree" && crop.age > 0.4) evap *= 0.65; // established trees shade the soil and drink from deeper down
    pl.moist -= evap * dt;
    const infil = S.infil(pl);
    if (st.weather.raining) {
      pl.moist += (covered || crop ? 9 : 7) * infil * dt;
      if (!covered && !crop && pl.prep === "bare") pl.tilth = Math.max(0, pl.tilth - 0.06 * dt); // raindrops seal bare soil
    }
    if (pl.drip && pl.moist < 70) pl.moist += 5 * dt;
    pl.moist = clamp(pl.moist, 0, 100);

    /* --- mulch: slowly rots into food for the soil --- */
    if (pl.mulch > 0) {
      const chips = pl.mulchType === "chips";
      pl.mulch = Math.max(0, pl.mulch - (chips ? 0.18 : 0.5) * dt);
      pl.life = Math.min(100, pl.life + (chips ? 0.07 : 0.05) * dt);
      pl.fert = Math.min(100, pl.fert + 0.03 * dt);
      pl.tilth = Math.min(100, pl.tilth + 0.05 * dt);
    } else if (!crop && pl.prep === "bare") {
      pl.life = Math.max(0, pl.life - 0.015 * dt); // bare soil slowly loses its life
    }
    if (pl.fabric) pl.life = Math.max(0, pl.life - 0.012 * dt); // plastic feeds nothing
    pl.tilth = clamp(pl.tilth + (0.02 * (pl.life / 100) - (pl.till ? 0.06 : 0)) * dt, 0, 100); // tilled soil slumps back

    /* --- no-dig: grass dying under the mulch --- */
    if (pl.smothering) {
      /* a full year if it starts in summer: rotting is slow when it's hot and dry, faster when it's cool and damp */
      pl.smother += (dt / Farm.DAYS_PER_YEAR) * SMOTHER_RATE[s] * (loc.frost && s === 3 ? 0.2 : 1) * (0.5 + 0.5 * Math.min(1, pl.moist / 40));
      if (pl.smother >= 1) {
        pl.smothering = false;
        pl.prep = "bare";
        pl.life = Math.min(100, pl.life + 10);
        pl.fert = Math.min(100, pl.fert + 6);
        pl.tilth = Math.min(100, pl.tilth + 25);
        Farm.emit("smothered", i);
      }
    }

    /* --- weeds: bare soil is an invitation --- */
    if (pl.prep !== "grass") {
      let rate = (covered ? 0.1 : 0.5) * WEED_SEASON[s] * (pl.moist > 15 ? 1 : 0.3);
      if (pl.fabric) rate = 0.01;
      if (pl.noWeeds > 0) { rate *= 0.05; pl.noWeeds -= dt; }
      if (crop && S.progress(pl) > 0.4) rate *= 0.6;
      pl.weeds = clamp(pl.weeds + rate * dt, 0, 100);
      if (pl.weeds > 30) Farm.lesson("weeds");
    }
    if (pl.life > 60 && st.day > 20) Farm.lesson("worms");

    /* --- the crop --- */
    if (!crop || crop.dead) return;
    if ((def.frostDie && s === 3) || (def.tender && loc.frost && s === 3)) {
      crop.dead = true;
      if (def.tender) {
        Farm.toast("🥀 A freeze killed your " + def.name.toLowerCase() + ". Click to clear.");
        Farm.lesson("tender");
      } else Farm.toast("🥀 " + def.name + " is an annual: it dies back when winter comes. Click to clear.");
      return;
    }
    const fit = loc.fit[def.id] || 0.8;
    const w = pl.moist >= 30 ? 1 : pl.moist >= 12 ? 0.4 + (0.6 * (pl.moist - 12)) / 18 : 0.1;
    const soil = 0.5 + 0.55 * clamp((pl.fert * 0.45 + pl.life * 0.35 + pl.tilth * 0.2) / 100, 0, 1);
    let sm = def.season[s];
    if (!loc.frost && s === 3 && !def.frostDie) sm = Math.max(sm, 0.7); // mild winters keep crops growing
    const weedF = clamp(1 - pl.weeds / 50, 0, 1); // growth halves at 25% weeds and stops completely at 50%
    if (pl.weeds >= 50 && !pl.weedAlert) { pl.weedAlert = true; Farm.emit("weedAlert", i); }
    else if (pl.weeds < 20) pl.weedAlert = false;
    const rate = fit * sm * w * soil * weedF * (crop.fed ? 1.3 : 1);

    if (def.kind === "tree") {
      if (crop.age < 1) crop.age = Math.min(1, crop.age + (dt * rate) / def.matureDays);
      else if (crop.fruit < 1) {
        const was = crop.fruit;
        crop.fruit = Math.min(1, crop.fruit + (dt * rate) / def.fruitDays);
        if (was < 1 && crop.fruit >= 1) Farm.emit("ripe", i);
      }
    } else if (crop.p < 1) {
      crop.p = Math.min(1, crop.p + (dt * rate) / def.days);
      if (crop.p >= 1) Farm.emit("ripe", i);
    }
    pl.fert = Math.max(0, pl.fert - def.hunger * Math.min(1, rate) * dt * 0.5);

    if (pl.moist < 12 && !pl.thirstAlert) { pl.thirstAlert = true; Farm.emit("thirstAlert", i); }
    else if (pl.moist > 30) pl.thirstAlert = false;
    if (pl.moist < 8) {
      crop.stress += dt;
      if (crop.stress > 10) Farm.lesson("thirst");
      /* trees can last much longer than a field crop without a drink */
      const patience = def.kind === "tree" ? (crop.age < 0.3 ? 120 : 240) : 45;
      if (crop.stress > patience) {
        crop.dead = true;
        Farm.toast("🥀 A plant dried out completely. Click it to clear the plot, and give the next one a drink sooner.");
      }
    } else crop.stress = Math.max(0, crop.stress - dt * 0.5);
  };
})();
