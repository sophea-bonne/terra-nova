/* Terra Nova — game content: places, crops, materials and the "Field Notes" lessons. */
(function () {
  const Farm = window.Farm;

  Farm.SEASONS = ["Spring", "Summer", "Autumn", "Winter"];
  Farm.SEASON_ICONS = ["🌸", "☀️", "🍂", "❄️"];
  /* The simulation counts in "ticks" (one tick = one real second at 1× speed; growth rates are tuned in ticks).
     The calendar shows real-world days: 4 ticks = 1 day, 365 days a year, four seasons of 91.25 days. */
  Farm.TICKS_PER_DAY = 4;
  Farm.DAYS_PER_SEASON = (365 / 4) * Farm.TICKS_PER_DAY; // in ticks
  Farm.DAYS_PER_YEAR = 365 * Farm.TICKS_PER_DAY;

  Farm.LEVELS = ["sunnyvale", "rainbow", "geneva", "farfa"];

  /* sand / silt / clay percentages are rounded from the soil surveys of each region.
     rain[] = how often it rains in spring, summer, autumn, winter (1 = normal). */
  Farm.LOCATIONS = {
    sunnyvale: {
      id: "sunnyvale", level: 1,
      climate: { mean: 15.5, amp: 5, drop: 4, sigma: 1.8 }, // Jan ~10.5°C, Jul ~20.5°C
      name: "Sunnyvale back yard", short: "Sunnyvale", place: "Sunnyvale, California", scale: "yard", bed: "bed",
      tag: "A small back yard. Everything is done by hand.",
      intro: "It's the end of a long, dry summer. The back yard soil is baked into hard clumps and thirsty. It's too hard to dig by hand at first. You only have a shovel for now: buy a rototiller from the Tools menu, or build the soil up with compost and mulch.",
      sand: 7, silt: 46, clay: 47,
      soilName: "Silty clay",
      soilNote: "Rich and fertile, and it holds water for a long time. But dry clay bakes into hard clods, and it won't soak up water until it has been softened up.",
      fert: 58, life: 28, tilth: 12, moist: 4, heat: 1.0, frost: false, dryGrass: true, wind: 0.6, hills: false,
      tractorOK: false, tractorWhy: "A back yard is far too small for a tractor.", costMul: 1, valueMul: 1, money: 260, startDay: 680, labor: 1, pour: 48,
      rain: [0, 0, 0, 1.6],
      fit: { wheat: 1, cannabis: 1, avocado: 0.85, citrus: 1, apple: 1, olive: 1 },
      soilColor: [112, 84, 62],
      hero: ["#c8ecff", "#b5d98a", "#7f9a5f"],
    },
    rainbow: {
      id: "rainbow", level: 2,
      climate: { mean: 17.4, amp: 4.6, drop: 5, sigma: 2 }, // Jan ~12.8°C, Jul ~22°C
      name: "Rainbow, 40 acres", short: "Rainbow", place: "Rainbow, California", scale: "ranch", bed: "field",
      tag: "Forty hilly acres of sand. Not much grows here.",
      intro: "Forty acres of sandy granite hills. Water drains straight through, nothing holds nutrients, and the slopes are far too steep for a tractor. Every field is about six acres, so spreading anything by hand takes real labor.",
      sand: 70, silt: 15, clay: 15,
      soilName: "Sandy loam from weathered granite",
      soilNote: "Drains very quickly, holds few nutrients and bakes in the sun. The strong autumn winds here will carry off anything that isn't weighed down.",
      fert: 14, life: 10, tilth: 60, moist: 3, heat: 1.2, frost: false, dryGrass: true, wind: 2.4, hills: true,
      tractorOK: false, tractorWhy: "These slopes are far too steep for a tractor. It would tip over.", costMul: 5, valueMul: 5, money: 2200, startDay: 680, labor: 4.5, pour: 32,
      rain: [0, 0, 0, 1.0],
      fit: { wheat: 1, cannabis: 1, avocado: 1, citrus: 1, apple: 1, olive: 1 },
      soilColor: [214, 178, 128],
      hero: ["#ffe9a8", "#e6c58a", "#b98d55"],
    },
    geneva: {
      id: "geneva", level: 3,
      climate: { mean: 10.8, amp: 9.2, drop: 3.5, sigma: 4 }, // Jan ~1.5°C, Jul ~20°C, cold snaps
      name: "Geneva, Switzerland", short: "Geneva", place: "Geneva, Switzerland", scale: "farm", bed: "field",
      tag: "Balanced loam by the lake. It rains all year and winter freezes the ground.",
      intro: "Good loam and plenty of rain in every season, but cold. Winter freezes the ground and kills anything tender, like avocados.",
      sand: 32, silt: 43, clay: 25,
      soilName: "Glacial moraine loam",
      soilNote: "A near-perfect mix of sand, silt and clay with good crumb structure. Cold winters slow everything down and freeze the soil.",
      fert: 66, life: 50, tilth: 60, moist: 40, heat: 0.8, frost: true, dryGrass: false, wind: 1, hills: false,
      tractorOK: true, scenery: "swiss", costMul: 2, valueMul: 2, money: 1500, startDay: 0, labor: 1.5, pour: 40,
      rain: [1, 1, 1, 1],
      fit: { wheat: 1, cannabis: 1, avocado: 1, citrus: 1, apple: 1, olive: 1 },
      soilColor: [128, 98, 70],
      hero: ["#d6e6f2", "#bcd8a0", "#7c9a6e"],
    },
    farfa: {
      id: "farfa", level: 4,
      climate: { mean: 15, amp: 9, drop: 6, sigma: 3 }, // Jan ~6°C, Jul ~24°C
      name: "Farfa, Italy", short: "Farfa", place: "Farfa, Italy", scale: "farm", bed: "field",
      tag: "Clay-loam terraces under an old abbey.",
      intro: "Wheat and olives have grown here for over a thousand years. Wet winters, dry summers, and clay that cracks in the heat.",
      sand: 30, silt: 37, clay: 33,
      soilName: "Clay loam",
      soilNote: "Fertile ground that cracks in the dry summer.",
      fert: 52, life: 40, tilth: 50, moist: 30, heat: 1.1, frost: false, dryGrass: true, wind: 1, hills: false,
      tractorOK: true, costMul: 2, valueMul: 2, money: 1500, startDay: 0, labor: 1.5, pour: 40,
      rain: [0.8, 0.2, 1, 1.2],
      fit: { wheat: 1, cannabis: 1, avocado: 1, citrus: 1, apple: 1, olive: 1 },
      soilColor: [160, 112, 80],
      hero: ["#ffe6c6", "#d4e1a7", "#a58a55"],
    },
  };
  Object.values(Farm.LOCATIONS).forEach((l) => (l.crops = ["wheat", "cannabis", "avocado", "citrus", "apple", "olive"]));

  /* what you have to do to finish each level (evaluated by the UI) */
  const avgLife = (st) => st.plots.reduce((a, p) => a + p.life, 0) / st.plots.length;
  Farm.GOALS = {
    sunnyvale: [
      { text: "Bring the soil to healthy (average soil life 55%)", val: (st) => avgLife(st), max: 55 },
      { text: "Harvest 4 crops", val: (st) => st.stats.harvests, max: 4 },
    ],
    rainbow: [
      { text: "Turn the sand around (average soil life 40%)", val: (st) => avgLife(st), max: 40 },
      { text: "Harvest 5 crops", val: (st) => st.stats.harvests, max: 5 },
    ],
    geneva: [
      { text: "Build rich soil (average soil life 65%)", val: (st) => avgLife(st), max: 65 },
      { text: "Harvest 6 crops", val: (st) => st.stats.harvests, max: 6 },
      { text: "Get through a whole winter", val: (st) => Math.min(1, Math.floor(st.day / Farm.DAYS_PER_YEAR)), max: 1 },
    ],
    farfa: [
      { text: "Soil life of 70% across the farm", val: (st) => avgLife(st), max: 70 },
      { text: "Harvest 8 crops", val: (st) => st.stats.harvests, max: 8 },
    ],
  };

  /* temp = [coldest it grows, start of ideal, end of ideal, hottest it grows] in °C of daily mean temperature
     p    = share of the soil's available water the plant can use before it starts to struggle (FAO-56 table 22)
     killTemp = overnight low that kills it (young trees are hurt 2° earlier) */
  Farm.CROPS = {
    wheat: {
      id: "wheat", name: "Wheat", icon: "🌾", kind: "annual", cost: 12, value: 120,
      days: 85, temp: [3, 18, 22, 32], p: 0.55, killTemp: -18, hunger: 0.05,
      speed: "Quick", grid: [5, 3],
      blurb: "An annual: harvest it and the field is empty again. Cheap, quick, and the leftover straw makes free mulch.",
    },
    cannabis: {
      id: "cannabis", name: "Cannabis (6 plants)", icon: "🌿", kind: "annual", cost: 45, value: 380,
      days: 95, temp: [8, 21, 28, 36], p: 0.4, killTemp: -3, hunger: 0.07, frostDie: true,
      speed: "Summer only", grid: [3, 2],
      blurb: "Legal to grow at home in California (six plants per household). Loves warm weather; as an annual it dies back when winter comes.",
    },
    avocado: {
      id: "avocado", name: "Avocado trees", icon: "🥑", kind: "tree", tender: true, species: "avocado", cost: 220, value: 420,
      matureDays: 200, fruitDays: 140, temp: [10, 20, 26, 35], p: 0.7, killTemp: -2, hunger: 0.03,
      speed: "Years", grid: [2, 1],
      blurb: "A slow investment: well over a year of growing before the first fruit. A freeze kills them.",
    },
    citrus: {
      id: "citrus", name: "Orange trees", icon: "🍊", kind: "tree", tender: true, species: "citrus", cost: 200, value: 360,
      matureDays: 190, fruitDays: 130, temp: [12, 22, 30, 38], p: 0.5, killTemp: -3, hunger: 0.03,
      speed: "Years", grid: [2, 1],
      blurb: "Evergreen and generous, with roots near the surface that love mulch. A freeze kills them.",
    },
    apple: {
      id: "apple", name: "Apple trees", icon: "🍎", kind: "tree", species: "apple", cost: 180, value: 330,
      matureDays: 180, fruitDays: 130, temp: [4, 18, 24, 32], p: 0.5, killTemp: -30, hunger: 0.03,
      speed: "Years", grid: [2, 1],
      blurb: "Blossoms in spring, fruit by autumn, bare in winter. Hardy enough for cold winters.",
    },
    olive: {
      id: "olive", name: "Olive trees", icon: "🫒", kind: "tree", species: "olive", cost: 170, value: 340,
      matureDays: 210, fruitDays: 150, temp: [5, 20, 30, 40], p: 0.65, killTemp: -9, hunger: 0.02,
      speed: "Years", grid: [2, 1],
      blurb: "Tough and drought-tolerant. A tree that can outlive its farmer by centuries.",
    },
  };

  Farm.MATERIALS = {
    straw: { id: "straw", name: "Straw", icon: "🌾", price: 10, blurb: "Cheap mulch. Light, rots within a season. Slow to spread over a big field." },
    chips: { id: "chips", name: "Wood chips", icon: "🪵", price: 18, blurb: "Heavy mulch that lasts. Trees love it." },
    compost: { id: "compost", name: "Compost", icon: "🧺", price: 25, blurb: "Finished compost: feeds soil life, fertility and crumbly soil." },
    feed: { id: "feed", name: "Quick-feed", icon: "🧪", price: 20, blurb: "Soluble fertilizer: fast growth, hungry soil." },
    fabric: { id: "fabric", name: "Landscape fabric", icon: "🟫", price: 25, blurb: "Plastic sheet that stops weeds. Wind can rip it up, and water struggles to soak through." },
    herbicide: { id: "herbicide", name: "Herbicide", icon: "☠️", price: 40, blurb: "Kills weeds and grass in a flash. Pricey, and it harms soil life. Not for planted beds." },
  };

  /* the Tools menu: you start with a shovel; machines are bought. Prices scale with the size of the place. */
  Farm.TOOLS = {
    shovel: { id: "shovel", name: "Shovel", icon: "shovel", price: 0, blurb: "Dig a bed by hand. Slow, hard work (worse in clumpy soil), but gentle on the soil life." },
    rototiller: { id: "rototiller", name: "Rototiller", icon: "⚙️", price: 120, blurb: "A walk-behind tiller. Quick, but it chops up the soil life. Won't bite into dry, baked ground." },
    tractor: { id: "tractor", name: "Tractor", icon: "🚜", price: 450, blurb: "Tills a whole field fast. Needs flat, open land." },
  };
  Farm.PRICES = { drip: 120, bigBucket: 150 };

  /* The "Field Notes" journal. A note unlocks the first time the matching thing happens in-game. */
  Farm.LESSONS = [
    { id: "alive", icon: "🪱", title: "Soil is alive",
      hint: "Start any farm.",
      text: "A handful of healthy soil is home to billions of living things: bacteria, fungi, worms, tiny insects. Gardening is mostly about feeding and protecting them. Watch the little worm meter on each plot." },
    { id: "texture", icon: "🏖️", title: "Sand, silt and clay",
      hint: "Water a plot in a sandy place.",
      text: "Sandy soil drains quickly and dries out. Clay holds water for ages but packs down. Organic matter helps both: it acts like a sponge in sand and loosens up clay." },
    { id: "tilling", icon: "🚜", title: "What tilling really does",
      hint: "Till a plot with the tractor.",
      text: "Tilling is fast, but it chops up the fungal threads and worm tunnels that hold soil together, and the fresh air makes microbes burn through the soil's organic matter. Bare, loosened soil also dries out and washes away more easily." },
    { id: "sheet", icon: "🍂", title: "Sheet mulching (no-dig)",
      hint: "Smother a grassy plot with mulch.",
      text: "Instead of digging up grass, you can smother it. A thick layer of straw or chips blocks the light, the grass dies and rots in place, and worms drag the organic matter down for you. It is slow (about a year if you start in summer, faster in a wet winter), but the soil gets richer instead of poorer." },
    { id: "mulch", icon: "🧣", title: "Mulch is a blanket",
      hint: "Mulch a plot that is already prepared.",
      text: "Mulch shades the soil so less water evaporates, keeps weed seeds from getting light, softens the impact of rain and keeps the soil temperature steadier. As it rots it feeds the soil life, so you are watering and fertilizing at once." },
    { id: "weeds", icon: "🌱", title: "Weeds love bare soil",
      hint: "Let weeds appear on an uncovered plot.",
      text: "Nature never leaves soil bare for long. Weeds are the first responders, and they steal water, light and nutrients, so a crop can't grow while they have the upper hand. A mulch layer or a crop planted close together leaves them very little room." },
    { id: "pulling", icon: "🧤", title: "Weeds are compost",
      hint: "Pull weeds by hand.",
      text: "Pulled weeds are not waste: they are 'greens' (fresh, nitrogen-rich plant material) for your compost bin. Pull them before they flower and set seed." },
    { id: "compost", icon: "🧺", title: "Compost is finished food",
      hint: "Collect compost from your bin.",
      text: "Compost is plant material that microbes have already broken down into dark, crumbly humus. It feeds the soil life, adds nutrients slowly and helps soil hold water. The bin turns garden scraps into it, for free." },
    { id: "heap", icon: "🔥", title: "How a compost heap works",
      hint: "Watch your compost bin cook.",
      text: "A good heap mixes 'greens' (fresh, wet scraps and weeds) with 'browns' (straw, dry leaves), stays as damp as a wrung-out sponge and gets some air. Microbes then heat it up as they work, which also helps break down most weed seeds." },
    { id: "worms", icon: "📏", title: "Worms are a report card",
      hint: "Get a plot's soil life above half.",
      text: "Earthworms turn up where there is food and not much disturbance. More worms usually means better crumb structure, better drainage and more nutrients available to roots." },
    { id: "feed", icon: "🧪", title: "Quick fertilizer",
      hint: "Use quick-feed on a plant.",
      text: "Soluble fertilizer feeds the plant directly and skips the soil life. It gives a quick burst, but if it is all the soil ever gets, the organisms that build soil go hungry, and the extra can wash into rivers. Use it as a rescue, not a habit." },
    { id: "drip", icon: "💧", title: "Water where it counts",
      hint: "Install a drip line.",
      text: "Drip lines trickle water slowly right at the roots, so far less is lost to evaporation or runoff than with sprinklers. Add mulch on top and you save even more." },
    { id: "straw", icon: "🌾", title: "Leftovers are resources",
      hint: "Harvest a wheat field.",
      text: "After harvest, the wheat straw stays on the field as free mulch. The nutrients in it stay on the farm, instead of being burned or hauled away." },
    { id: "treechips", icon: "🌳", title: "Trees love wood chips",
      hint: "Mulch a plot of trees.",
      text: "Most roots of orchard trees live in the top layer of soil. A deep ring of wood chips copies a forest floor: it keeps roots cool and moist and feeds the fungi that trees partner with." },
    { id: "thirst", icon: "🥀", title: "Thirsty plants",
      hint: "Let a plant dry out.",
      text: "Wilting is a plant saving water. Give a drink soon, preferably in the morning or evening, and cover the soil with mulch afterwards so it stays." },
    { id: "rain", icon: "🌧️", title: "Rain on bare soil",
      hint: "See it rain.",
      text: "Raindrops hitting bare soil can seal the surface into a crust, so more water runs off than soaks in. Mulch and plant cover cushion the drops and let water sink in where it is needed." },
    { id: "perennial", icon: "⏳", title: "Annuals vs. perennials",
      hint: "Plant a tree.",
      text: "An annual such as wheat lives one season, so you replant each year. A tree is a slow investment. It spends years growing before it bears fruit, but then it produces for decades without any replanting, and its permanent roots protect the soil." },
    { id: "frozen", icon: "🧊", title: "Winter rest",
      hint: "Experience a frozen winter.",
      text: "Soil life slows down in the cold but doesn't disappear. Covered soil is insulated and stays a little warmer than bare ground, which is a good reason to keep a blanket of mulch on over winter." },
    { id: "nutrients", icon: "🥕", title: "Harvests take nutrients with them", hint: "",
      text: "Every crop you carry away takes minerals the soil had to give. Left alone, the soil runs down. On a big farm, people till and add fertilizer. In a garden you can give back what you took: compost, leaves and plant waste, so the soil stays fertile without any bagged fertilizer." },
    { id: "shovel", icon: "⛏️", title: "Digging by hand", hint: "",
      text: "Turning soil with a shovel is hard work, but it's gentle: you loosen a bed without pulverizing it, so worms and fungal threads survive far better than under a rototiller or tractor." },
    { id: "clumpy", icon: "🧱", title: "Dry soil repels water", hint: "Water the baked soil at the start.",
      text: "Hard, dry, clumpy soil is like a baked brick: water beads up and runs off instead of soaking in. Soil with lots of organic matter and crumbly structure drinks up water like a sponge." },
    { id: "fabric", icon: "🟫", title: "Landscape fabric", hint: "Lay landscape fabric.",
      text: "Fabric stops weeds, but it's plastic: water soaks through slowly, soil life gets no food from above, strong wind can rip it up, and old fabric breaks into plastic fragments in the soil." },
    { id: "herbicide", icon: "☠️", title: "Herbicide: fast but costly", hint: "Spray herbicide.",
      text: "Weedkiller works in days and needs no labor, but it costs money and it harms the soil life that your crops depend on. Repeated use leaves soil that needs more and more help." },
    { id: "tender", icon: "🥶", title: "Know your climate", hint: "Lose a tree to frost.",
      text: "Avocados and oranges come from warm places and die when the ground freezes. Choosing crops that suit your climate matters more than any trick." },
    { id: "steep", icon: "⛰️", title: "Slopes and erosion", hint: "Try to use the tractor on the hills.",
      text: "A tractor can tip over on a steep slope, and loosened soil washes downhill in the rain. On hills, keeping the soil covered is the way to keep it in place." },
  ];
})();
