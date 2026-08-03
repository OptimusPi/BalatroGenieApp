// Harvested engine — identical logic to the original vanilla app,
// except the no-keyword path now also widens to antes 1-8 on a miss.
import bootsharp, { MotelyJaml, MotelySearch } from "motely-wasm";

export const JOKERS = [
  "Joker","Greedy Joker","Lusty Joker","Wrathful Joker","Gluttonous Joker",
  "Jolly Joker","Zany Joker","Mad Joker","Crazy Joker","Droll Joker",
  "Sly Joker","Wily Joker","Clever Joker","Devious Joker","Crafty Joker",
  "Half Joker","Credit Card","Banner","Mystic Summit","8 Ball",
  "Misprint","Raised Fist","Chaos the Clown","Scary Face","Abstract Joker",
  "Delayed Gratification","Gros Michel","Even Steven","Odd Todd","Scholar",
  "Business Card","Supernova","Ride the Bus","Egg","Runner",
  "Ice Cream","Splash","Blue Joker","Faceless Joker","Green Joker",
  "Superposition","To Do List","Cavendish","Red Card","Square Joker",
  "Riff-Raff","Photograph","Reserved Parking","Mail-In Rebate","Hallucination",
  "Fortune Teller","Juggler","Drunkard","Golden Joker","Popcorn",
  "Walkie Talkie","Smiley Face","Golden Ticket","Swashbuckler","Hanging Chad",
  "Shoot the Moon","Joker Stencil","Four Fingers","Mime","Ceremonial Dagger",
  "Marble Joker","Loyalty Card","Dusk","Fibonacci","Steel Joker",
  "Hack","Pareidolia","Space Joker","Burglar","Blackboard",
  "Sixth Sense","Constellation","Hiker","Card Sharp","Madness",
  "Séance","Vampire","Shortcut","Hologram","Cloud 9",
  "Rocket","Midas Mask","Luchador","Gift Card","Turtle Bean",
  "Erosion","To the Moon","Stone Joker","Lucky Cat","Bull",
  "Diet Cola","Trading Card","Flash Card","Spare Trousers","Ramen",
  "Seltzer","Castle","Mr. Bones","Acrobat","Sock and Buskin",
  "Troubadour","Certificate","Smeared Joker","Throwback","Rough Gem",
  "Bloodstone","Arrowhead","Onyx Agate","Glass Joker","Showman",
  "Flower Pot","Merry Andy","Oops! All 6s","The Idol","Seeing Double",
  "Matador","Satellite","Cartomancer","Astronomer","Bootstraps",
  "DNA","Vagabond","Baron","Obelisk","Baseball Card",
  "Ancient Joker","Campfire","Blueprint","Wee Joker","Hit the Road",
  "The Duo","The Trio","The Family","The Order","The Tribe",
  "Stuntman","Invisible Joker","Brainstorm","Driver's License","Burnt Joker",
  "Canio","Triboulet","Yorick","Chicot","Perkeo",
];

export const DISPLAY_TO_JAML = {};
JOKERS.forEach((j) => {
  let pascal = j
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  if (j === "8 Ball") pascal = "EightBall";
  if (j === "Chaos the Clown") pascal = "ChaostheClown";
  if (j === "Oops! All 6s") pascal = "OopsAll6s";
  if (j === "Riff-Raff") pascal = "RiffRaff";
  if (j === "Mail-In Rebate") pascal = "MailInRebate";
  if (j === "Mr. Bones") pascal = "MrBones";
  if (j === "Driver's License") pascal = "DriversLicense";
  if (j === "Séance") pascal = "Seance";
  DISPLAY_TO_JAML[j] = pascal;
});

export function resolveJoker(text) {
  const norm = (s) => s.normalize("NFD").toLowerCase().replace(/[^a-z0-9]/g, "");
  const t = norm(text);
  if (!t) return null;
  const exact = JOKERS.find((j) => norm(j) === t);
  if (exact) return exact;
  const partial = JOKERS.filter((j) => norm(j).includes(t));
  return partial.length === 1 ? partial[0] : null;
}

export function filterJokers(text) {
  if (!text) return JOKERS;
  const norm = (s) => s.normalize("NFD").toLowerCase().replace(/[^a-z0-9]/g, "");
  const t = norm(text);
  if (!t) return JOKERS;
  return JOKERS.filter((j) => norm(j).includes(t));
}

const ALPHABET = "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SEED_LEN = 8;
const CANDIDATE_CAP = 50000;

export function candidateSeeds(name, cap = CANDIDATE_CAP) {
  const padLen = SEED_LEN - name.length;
  const positions = padLen + 1;
  const total = positions * Math.pow(ALPHABET.length, padLen);
  const seeds = new Set();

  if (total <= cap) {
    const padCount = Math.pow(ALPHABET.length, padLen);
    for (let pos = 0; pos < positions; pos++) {
      for (let i = 0; i < padCount; i++) {
        let x = i,
          pad = "";
        for (let d = 0; d < padLen; d++) {
          pad += ALPHABET[x % ALPHABET.length];
          x = Math.floor(x / ALPHABET.length);
        }
        seeds.add(pad.slice(0, pos) + name + pad.slice(pos));
      }
    }
    return { seeds: [...seeds], exhaustive: true };
  }

  let guard = cap * 3;
  while (seeds.size < cap && guard-- > 0) {
    const pos = Math.floor(Math.random() * positions);
    let pad = "";
    for (let d = 0; d < padLen; d++) {
      pad += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    seeds.add(pad.slice(0, pos) + name + pad.slice(pos));
  }
  return { seeds: [...seeds], exhaustive: false };
}

export function buildJaml(pascal, antes, seedList) {
  return [
    `name: Genie Wish`,
    `deck: Red`,
    `stake: White`,
    seedList ? `seeds: [${seedList.join(", ")}]` : ``,
    `must:`,
    `  - joker: ${pascal}`,
    `    antes: [${antes.join(", ")}]`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const EARLY_ANTES = [1, 2];
export const ALL_ANTES = [1, 2, 3, 4, 5, 6, 7, 8];

async function searchSeedList(seedList, pascal, antes, onStatus) {
  const CHUNK = 2500;
  for (let i = 0; i < seedList.length; i += CHUNK) {
    const config = MotelyJaml.fromJaml(buildJaml(pascal, antes, seedList.slice(i, i + CHUNK)));
    const results = await MotelySearch.searchList(config);
    if (results.length > 0) return results;
    onStatus?.(
      `checked ${Math.min(i + CHUNK, seedList.length).toLocaleString()} of ${seedList.length.toLocaleString()} seeds...`,
    );
  }
  return [];
}

let bootPromise = null;
export function bootEngine() {
  if (!bootPromise) bootPromise = bootsharp.boot();
  return bootPromise;
}

export function subscribeProgress(fn) {
  MotelySearch.onProgress.subscribe(fn);
  return () => MotelySearch.onProgress.unsubscribe(fn);
}

/**
 * Grant a wish. Always tries antes 1-2 first, widens to 1-8 on a miss —
 * in BOTH the keyword and no-keyword paths.
 */
export async function grantWish({ joker, keyword, onStatus }) {
  const pascal = DISPLAY_TO_JAML[joker];
  if (!pascal) throw new Error(`Unknown joker: ${joker}`);

  const t0 = performance.now();
  let results = [];
  let anteNote = "guaranteed in antes 1\u20132";

  if (keyword) {
    const { seeds, exhaustive } = candidateSeeds(keyword);
    onStatus?.(
      exhaustive
        ? `${seeds.length.toLocaleString()} seeds can contain "${keyword}" — checking all...`
        : `checking ${seeds.length.toLocaleString()} seeds containing "${keyword}"...`,
    );

    results = await searchSeedList(seeds, pascal, EARLY_ANTES, onStatus);

    if (results.length === 0) {
      onStatus?.(`none in antes 1\u20132 — widening to antes 1\u20138...`);
      results = await searchSeedList(seeds, pascal, ALL_ANTES, onStatus);
      anteNote = "appears within antes 1\u20138";
    }

    if (results.length === 0) {
      const detail = exhaustive
        ? `All ${seeds.length.toLocaleString()} seeds containing "${keyword}" checked — none has ${joker} even by ante 8. Try fewer letters.`
        : `Checked ${seeds.length.toLocaleString()} seeds containing "${keyword}" — no ${joker} found. Wish again for a fresh batch, or try fewer letters.`;
      throw new Error(detail);
    }
  } else {
    let config = MotelyJaml.fromJaml(buildJaml(pascal, EARLY_ANTES));
    results = await MotelySearch.findOne(config);

    if (results.length === 0) {
      onStatus?.(`none in antes 1\u20132 — widening to antes 1\u20138...`);
      config = MotelyJaml.fromJaml(buildJaml(pascal, ALL_ANTES));
      results = await MotelySearch.findOne(config);
      anteNote = "appears within antes 1\u20138";
    }

    if (results.length === 0) {
      throw new Error("The genie found nothing — try again or pick a different joker.");
    }
  }

  const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
  const best = results.reduce((a, b) => (a.score >= b.score ? a : b));
  return { seed: best.seed, joker, anteNote, elapsed };
}
