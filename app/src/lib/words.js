/**
 * Themed word packs — one per chapter of the journey.
 *
 * Rules for every entry: A-Z only, 3-10 letters, no spaces or hyphens, and
 * recognisable without regional knowledge. The generator filters by length
 * against the grid size, so each pack needs a healthy spread of short and
 * long words or the bigger levels run out of candidates.
 */

export const CHAPTERS = [
  {
    id: "coast",
    name: "Coast Trip",
    icon: "🏖️",
    blurb: "Salt air and easy afternoons.",
    words: [
      "BEACH", "SHELL", "WAVE", "TIDE", "SAND", "SURF", "PALM", "REEF",
      "SUNNY", "BOAT", "SAIL", "SHORE", "CORAL", "CRAB", "DUNE", "LAGOON",
      "PIER", "SEAGULL", "SUNSET", "TOWEL", "BUCKET", "SANDAL", "BREEZE",
      "HARBOR", "ISLAND", "OCEAN", "SPLASH", "DOLPHIN", "STARFISH", "SEAWEED",
      "DRIFTWOOD", "LIGHTHOUSE", "COVE", "SWIM", "KAYAK"
    ]
  },
  {
    id: "forest",
    name: "Forest Trail",
    icon: "🌲",
    blurb: "Moss, pine and quiet paths.",
    words: [
      "TREE", "LEAF", "PINE", "MOSS", "FERN", "OWL", "DEER", "FOX",
      "TRAIL", "CABIN", "CREEK", "BIRCH", "ACORN", "BADGER", "CANOPY",
      "MAPLE", "SPRUCE", "BRANCH", "HOLLOW", "MEADOW", "BRACKEN", "TOADSTOOL",
      "SQUIRREL", "WOODPECKER", "CAMPFIRE", "LANTERN", "SATCHEL", "COMPASS",
      "RIDGE", "THICKET", "CEDAR", "WILLOW", "BRAMBLE", "HEDGEHOG", "CLEARING"
    ]
  },
  {
    id: "mountain",
    name: "Mountain Pass",
    icon: "⛰️",
    blurb: "Thin air, wide views.",
    words: [
      "PEAK", "SNOW", "ROPE", "CLIMB", "RIDGE", "CRAG", "SLOPE", "CAIRN",
      "SUMMIT", "GLACIER", "BOULDER", "VALLEY", "GORGE", "ASCENT", "SHERPA",
      "ALPINE", "CREVASSE", "AVALANCHE", "PLATEAU", "TUNDRA", "GRANITE",
      "EAGLE", "MARMOT", "IBEX", "GOAT", "TENT", "FLASK", "CRAMPON",
      "PICKAXE", "ALTITUDE", "FOOTHILL", "SADDLE", "SCREE", "BASECAMP"
    ]
  },
  {
    id: "city",
    name: "City Lights",
    icon: "🌆",
    blurb: "Neon, traffic and late trains.",
    words: [
      "CITY", "TAXI", "TRAM", "CAFE", "PARK", "SIGN", "LOFT", "METRO",
      "STREET", "BRIDGE", "TOWER", "MARKET", "GALLERY", "SUBWAY", "PLAZA",
      "AVENUE", "SKYLINE", "BOUTIQUE", "THEATRE", "STATION", "CROSSING",
      "BAKERY", "ROOFTOP", "LOBBY", "ALLEY", "KIOSK", "NEON", "COMMUTE",
      "ESCALATOR", "BOULEVARD", "FOUNTAIN", "MURAL", "ARCADE", "TERRACE"
    ]
  },
  {
    id: "desert",
    name: "Desert Road",
    icon: "🏜️",
    blurb: "Long highways and red rock.",
    words: [
      "DUNE", "CACTUS", "OASIS", "MESA", "DUST", "HEAT", "MIRAGE", "CANYON",
      "ADOBE", "ARROYO", "COYOTE", "LIZARD", "SCORPION", "TUMBLEWEED",
      "SANDSTONE", "HORIZON", "CARAVAN", "CAMEL", "DATES", "SHADE", "WELL",
      "ROUTE", "DINER", "MOTEL", "GASOLINE", "PLATEAU", "BUTTE", "SAGE",
      "VULTURE", "SUNBAKED", "ROADSIDE", "COMPASS", "BANDANA", "CANTEEN"
    ]
  },
  {
    id: "harvest",
    name: "Harvest Market",
    icon: "🧺",
    blurb: "Baskets, bread and bright stalls.",
    words: [
      "BREAD", "APPLE", "HONEY", "PLUM", "PEAR", "CORN", "JAM", "HERB",
      "BASKET", "CHEESE", "TOMATO", "PUMPKIN", "WALNUT", "ORCHARD", "CIDER",
      "PRESERVE", "LAVENDER", "SUNFLOWER", "BEETROOT", "CABBAGE", "PEPPER",
      "RHUBARB", "APRICOT", "GINGER", "PASTRY", "BUTTER", "MARROW", "CHUTNEY",
      "SCALES", "AWNING", "PRODUCE", "BARLEY", "CRATE", "VENDOR"
    ]
  },
  {
    id: "night",
    name: "Night Sky",
    icon: "🌌",
    blurb: "Constellations and cold air.",
    words: [
      "STAR", "MOON", "ORBIT", "COMET", "NOVA", "DUSK", "GLOW", "VOID",
      "PLANET", "GALAXY", "NEBULA", "METEOR", "ECLIPSE", "AURORA", "COSMOS",
      "SATURN", "VENUS", "MERCURY", "TELESCOPE", "ASTEROID", "STARLIGHT",
      "TWILIGHT", "MIDNIGHT", "CRATER", "SOLSTICE", "ZENITH", "LUNAR",
      "SPIRAL", "QUASAR", "PULSAR", "DRIFT", "SILENCE", "SHIMMER", "COSMIC"
    ]
  },
  {
    id: "safari",
    name: "Savannah Safari",
    icon: "🦓",
    blurb: "Dust clouds and long grass.",
    words: [
      "LION", "ZEBRA", "RHINO", "HERD", "MANE", "ROAR", "JEEP", "GRASS",
      "GIRAFFE", "ELEPHANT", "CHEETAH", "BUFFALO", "GAZELLE", "BABOON",
      "MEERKAT", "WARTHOG", "OSTRICH", "ANTELOPE", "SAVANNAH", "WATERHOLE",
      "ACACIA", "TERMITE", "VULTURE", "HYENA", "LEOPARD", "IMPALA", "SUNRISE",
      "TRACKER", "BINOCULAR", "SHRUB", "PRIDE", "MIGRATE", "HORNBILL"
    ]
  },
  {
    id: "harbor",
    name: "Winter Harbor",
    icon: "⚓",
    blurb: "Frost on the rigging.",
    words: [
      "FROST", "ICE", "DOCK", "ROPE", "MAST", "FERRY", "ANCHOR", "CRATE",
      "WINTER", "LANTERN", "TRAWLER", "MITTEN", "SHIPYARD", "SEAGULL",
      "HARBOUR", "SCHOONER", "FISHERMAN", "COMPASS", "SNOWFALL", "CHANDLER",
      "BLIZZARD", "ICICLE", "WHARF", "NETTING", "BOATHOUSE", "FOGHORN",
      "CAPTAIN", "VOYAGE", "SLEET", "KEEL", "BOLLARD", "STOVE", "CHOWDER"
    ]
  },
  {
    id: "festival",
    name: "Lantern Festival",
    icon: "🏮",
    blurb: "The last stop, lit up.",
    words: [
      "DRUM", "SILK", "KITE", "GLOW", "MASK", "DANCE", "SONG", "FLAG",
      "LANTERN", "RIBBON", "PARADE", "FIREWORK", "CARNIVAL", "COSTUME",
      "STREAMER", "CONFETTI", "MARCHING", "JUGGLER", "ACROBAT", "TRUMPET",
      "CYMBAL", "BANNER", "GARLAND", "CELEBRATE", "FESTIVAL", "SPARKLER",
      "PUPPET", "CHORUS", "TORCH", "MELODY", "APPLAUSE", "FINALE", "JOURNEY"
    ]
  }
];

/** Chapter lookup by id. */
export const chapterById = (id) => CHAPTERS.find((c) => c.id === id) || CHAPTERS[0];

/**
 * Letter frequencies used to fill the empty cells.
 *
 * Uniform random letters make placed words stand out — real puzzles blend in
 * because the filler follows the same distribution as English. This is the
 * standard relative-frequency table, expanded into a pick list.
 */
const FREQ = {
  E: 12, T: 9, A: 8, O: 8, I: 7, N: 7, S: 6, H: 6, R: 6, D: 4, L: 4,
  C: 3, U: 3, M: 3, W: 2, F: 2, G: 2, Y: 2, P: 2, B: 2, V: 1, K: 1,
  J: 1, X: 1, Q: 1, Z: 1
};

export const FILLER_POOL = Object.entries(FREQ)
  .flatMap(([letter, weight]) => Array(weight).fill(letter));
