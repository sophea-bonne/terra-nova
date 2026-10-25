/* Terra Nova — game content: places, crops, materials and the "Field Notes" lessons. */
(function () {
  const Farm = window.Farm;

  Farm.SEASONS = ["Spring", "Summer", "Autumn", "Winter"];
  Farm.SEASON_ICONS = ["🌸", "☀️", "🍂", "❄️"];
  Farm.DAYS_PER_SEASON = 60; // one game day = one real second at 1× speed
  Farm.DAYS_PER_YEAR = 240;

  /* sand / silt / clay percentages are rounded from the soil surveys of each region */
  Farm.LOCATIONS = {
    rainbow: {
      id: "rainbow",
      name: "Rainbow, California",
      tag: "Sunny granite hills — avocado country.",
      sand: 70, silt: 15, clay: 15,
      soilName: "Sandy loam from weathered granite",
      soilNote: "Drains very quickly and holds few nutrients. Great for avocados and citrus that hate wet feet, hard on thirsty crops.",
      fert: 28, life: 24, heat: 1.3, frost: false, dryGrass: true,
      rain: [1.0, 0.2, 0.8, 1.2],
      crops: ["wheat", "avocado", "citrus"],
      fit: { wheat: 0.8, avocado: 1.15, citrus: 1.1 },
      soilColor: [214, 178, 128],
      hero: ["#ffe9a8", "#e6c58a", "#b98d55"],
    },
    sunnyvale: {
      id: "sunnyvale",
      name: "Sunnyvale, California",
      tag: "Dark valley clay — the old orchard capital.",
      sand: 7, silt: 46, clay: 47,
      soilName: "Deep silty clay",
      soilNote: "Rich and fertile, and it holds water for a long time. It can turn sticky and packed when it is wet and bare.",
      fert: 62, life: 44, heat: 1.0, frost: false, dryGrass: true,
      rain: [1.0, 0.15, 0.8, 1.2],
      crops: ["wheat", "apple", "citrus", "avocado", "cannabis"],
      fit: { wheat: 1.0, apple: 1.0, citrus: 1.05, avocado: 0.8, cannabis: 1.0 },
      soilColor: [112, 84, 62],
      hero: ["#c8ecff", "#b5d98a", "#7f9a5f"],
    },
    geneva: {
      id: "geneva",
      name: "Geneva, Switzerland",
      tag: "Balanced loam by the lake — but winter freezes the ground.",
      sand: 32, silt: 43, clay: 25,
      soilName: "Glacial moraine loam",
      soilNote: "A near-perfect mix of sand, silt and clay with good crumb structure. Cold winters slow everything down and freeze the soil.",
      fert: 66, life: 58, heat: 0.8, frost: true, dryGrass: false,
      rain: [1.2, 1.0, 1.2, 1.2],
      crops: ["wheat", "apple"],
      fit: { wheat: 1.1, apple: 1.15 },
      soilColor: [128, 98, 70],
      hero: ["#d6e6f2", "#bcd8a0", "#7c9a6e"],
    },
    farfa: {
      id: "farfa",
      name: "Farfa, Italy",
      tag: "Clay-loam terraces under an old abbey.",
      sand: 30, silt: 37, clay: 33,
      soilName: "Clay loam",
      soilNote: "Fertile ground that has grown wheat and olives for more than a thousand years. It cracks in the dry summer.",
      fert: 52, life: 46, heat: 1.1, frost: false, dryGrass: true,
      rain: [1.0, 0.4, 1.0, 1.3],
      crops: ["wheat", "olive", "citrus", "avocado"],
      fit: { wheat: 1.1, olive: 1.15, citrus: 1.0, avocado: 0.85 },
      soilColor: [160, 112, 80],
      hero: ["#ffe6c6", "#d4e1a7", "#a58a55"],
    },
  };

  /* season[] = how well the crop grows in spring, summer, autumn, winter */
  Farm.CROPS = {
    wheat: {
      id: "wheat", name: "Wheat", icon: "🌾", kind: "annual", cost: 12, value: 120,
      days: 85, season: [1, 0.9, 0.7, 0.2], hunger: 0.05,
      speed: "Quick", grid: [5, 3],
      blurb: "An annual: harvest it and the field is empty again. Cheap, quick, and the leftover straw makes free mulch.",
    },
    cannabis: {
      id: "cannabis", name: "Cannabis (6 plants)", icon: "🌿", kind: "annual", cost: 45, value: 380,
      days: 95, season: [0.8, 1.2, 0.6, 0], hunger: 0.07, frostDie: true,
      speed: "Summer only", grid: [3, 2],
      blurb: "Legal to grow at home in California (six plants per household). Loves summer, dies at the first frost.",
    },
    avocado: {
      id: "avocado", name: "Avocado trees", icon: "🥑", kind: "tree", species: "avocado", cost: 220, value: 420,
      matureDays: 200, fruitDays: 140, season: [1, 1, 0.8, 0.4], hunger: 0.03,
      speed: "Years", grid: [2, 1],
      blurb: "A slow investment: the trees need well over a year to grow before the first fruit, then keep giving without replanting.",
    },
    citrus: {
      id: "citrus", name: "Orange trees", icon: "🍊", kind: "tree", species: "citrus", cost: 200, value: 360,
      matureDays: 190, fruitDays: 130, season: [1, 1, 0.9, 0.5], hunger: 0.03,
      speed: "Years", grid: [2, 1],
      blurb: "Evergreen and generous once established. Roots stay near the surface, so they love a thick mulch ring.",
    },
    apple: {
      id: "apple", name: "Apple trees", icon: "🍎", kind: "tree", species: "apple", cost: 180, value: 330,
      matureDays: 180, fruitDays: 130, season: [1, 1, 0.8, 0.05], hunger: 0.03,
      speed: "Years", grid: [2, 1],
      blurb: "Blossoms in spring, fruit by autumn, bare in winter. Hardy enough for cold winters.",
    },
    olive: {
      id: "olive", name: "Olive trees", icon: "🫒", kind: "tree", species: "olive", cost: 170, value: 340,
      matureDays: 210, fruitDays: 150, season: [0.9, 1, 0.8, 0.4], hunger: 0.02,
      speed: "Years", grid: [2, 1],
      blurb: "Tough and drought-tolerant. A tree that can outlive its farmer by centuries.",
    },
  };

  Farm.MATERIALS = {
    straw: { id: "straw", name: "Straw", icon: "🌾", price: 10, blurb: "Light mulch. Breaks down within a season." },
    chips: { id: "chips", name: "Wood chips", icon: "🪵", price: 18, blurb: "Heavy mulch that lasts. Trees love it." },
    compost: { id: "compost", name: "Compost", icon: "🧺", price: 25, blurb: "Finished compost: feeds soil life and fertility." },
    feed: { id: "feed", name: "Quick-feed", icon: "🧪", price: 20, blurb: "Soluble fertilizer: fast growth, hungry soil." },
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
      text: "Instead of digging up grass, you can smother it. A thick layer of straw or chips blocks the light, the grass dies and rots in place, and worms drag the organic matter down for you. It is slower, but the soil gets richer instead of poorer." },
    { id: "mulch", icon: "🧣", title: "Mulch is a blanket",
      hint: "Mulch a plot that is already prepared.",
      text: "Mulch shades the soil so less water evaporates, keeps weed seeds from getting light, softens the impact of rain and keeps the soil temperature steadier. As it rots it feeds the soil life, so you are watering and fertilizing at once." },
    { id: "weeds", icon: "🌱", title: "Weeds love bare soil",
      hint: "Let weeds appear on an uncovered plot.",
      text: "Nature never leaves soil bare for long. Weeds are the first responders. A mulch layer or a crop planted close together leaves them very little room." },
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
  ];
})();
