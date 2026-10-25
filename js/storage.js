/* Saving and loading farms.
   - Always writes a copy to this browser (localStorage).
   - If FarmConfig.dbUrl is set, also writes to a shared Firebase Realtime Database through its
     plain REST API, so a farmer can resume from any device and see their neighbours. */
(function () {
  const Farm = window.Farm;
  const LOCAL = "terranova:farm:";
  const LAST = "terranova:lastName";

  const base = () => (window.FarmConfig && window.FarmConfig.dbUrl ? window.FarmConfig.dbUrl.replace(/\/+$/, "") : "");

  async function remote(path, opts, ms) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms || 7000);
    try {
      const r = await fetch(base() + "/" + path + ".json", Object.assign({ signal: ctl.signal, cache: "no-store" }, opts));
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function readLocal(key) {
    try {
      const s = localStorage.getItem(LOCAL + key);
      return s ? JSON.parse(s) : null;
    } catch (e) {
      return null;
    }
  }

  function summary(state) {
    const S = Farm.sim;
    const plots = state.plots;
    const soil = plots.reduce((a, p) => a + p.life, 0) / plots.length;
    return {
      name: state.name,
      loc: state.loc,
      year: S.year(state),
      money: Math.round(state.money),
      soil: Math.round(soil),
      notes: Object.keys(state.lessons || {}).length,
      savedAt: state.savedAt,
    };
  }

  Farm.storage = {
    isCloud: () => !!base(),
    lastName() {
      try { return localStorage.getItem(LAST) || ""; } catch (e) { return ""; }
    },

    /* Returns { state, source } where source is "cloud", "device" or null. `offline` is true if the cloud was unreachable. */
    async load(key) {
      const local = readLocal(key);
      let cloud = null;
      let offline = false;
      if (base()) {
        try {
          cloud = await remote("saves/" + key);
        } catch (e) {
          offline = true;
        }
      }
      let best = local, source = local ? "device" : null;
      if (cloud && (!local || (cloud.savedAt || 0) >= (local.savedAt || 0))) {
        best = cloud;
        source = "cloud";
      }
      return { state: best, source, offline };
    },

    /* Resolves to "cloud", "device" (cloud not set up), or "offline" (cloud failed, device copy kept). */
    async save(state, opts) {
      state.savedAt = Date.now();
      const key = Farm.slug(state.name);
      try {
        localStorage.setItem(LOCAL + key, JSON.stringify(state));
        localStorage.setItem(LAST, state.name);
      } catch (e) { /* storage may be blocked; cloud may still work */ }
      if (!base()) return "device";
      try {
        const keepalive = !!(opts && opts.keepalive);
        const put = (path, data) =>
          remote(path, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), keepalive }, 8000);
        await Promise.all([put("saves/" + key, state), put("neighbours/" + key, summary(state))]);
        return "cloud";
      } catch (e) {
        return "offline";
      }
    },

    async neighbours() {
      let list = [];
      if (base()) {
        try {
          const data = await remote("neighbours");
          list = data ? Object.values(data) : [];
        } catch (e) { list = []; }
      } else {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.indexOf(LOCAL) === 0) list.push(summary(JSON.parse(localStorage.getItem(k))));
          }
        } catch (e) { /* ignore */ }
      }
      return list.filter((n) => n && n.name).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)).slice(0, 12);
    },
  };
})();
