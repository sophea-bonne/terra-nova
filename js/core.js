/* Terra Nova — core helpers shared by every other file. */
(function () {
  const Farm = (window.Farm = { W: 1280, H: 720 });

  Farm.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  Farm.lerp = (a, b, t) => a + (b - a) * t;
  Farm.ease = (t) => 1 - Math.pow(1 - Farm.clamp(t, 0, 1), 2.2);
  Farm.$ = (sel, root) => (root || document).querySelector(sel);
  Farm.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  Farm.money = (n) => "$" + Math.round(n).toLocaleString("en-US");
  Farm.slug = (name) =>
    name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);

  Farm.el = function (tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  /* small seeded random generator so scenery stays put between frames */
  Farm.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* colours */
  Farm.mix = (a, b, t) => [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
  Farm.rgb = (c, k = 1, a = 1) => {
    const f = (v) => Farm.clamp(Math.round(v * k), 0, 255);
    return a >= 1 ? `rgb(${f(c[0])},${f(c[1])},${f(c[2])})` : `rgba(${f(c[0])},${f(c[1])},${f(c[2])},${a})`;
  };

  /* tiny event bus: sim -> ui without hard dependencies */
  const handlers = {};
  Farm.on = (name, fn) => (handlers[name] = handlers[name] || []).push(fn);
  Farm.emit = (name, data) => (handlers[name] || []).forEach((fn) => fn(data));
  Farm.toast = (msg) => Farm.emit("toast", msg);
  Farm.lesson = (id) => Farm.emit("lesson", id);

  /* gentle sound effects (no files needed) */
  Farm.sound = {
    on: true,
    ctx: null,
    blip(freq, dur, type, vol, slideTo) {
      if (!Farm.sound.on) return;
      try {
        const C = (Farm.sound.ctx = Farm.sound.ctx || new (window.AudioContext || window.webkitAudioContext)());
        const o = C.createOscillator();
        const g = C.createGain();
        o.type = type || "sine";
        o.frequency.value = freq;
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, C.currentTime + dur);
        g.gain.value = vol || 0.05;
        g.gain.exponentialRampToValueAtTime(0.0008, C.currentTime + dur);
        o.connect(g).connect(C.destination);
        o.start();
        o.stop(C.currentTime + dur + 0.02);
      } catch (e) {
        /* audio is optional */
      }
    },
  };
})();
