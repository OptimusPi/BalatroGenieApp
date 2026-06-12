// Starter JAML filters. JAML (Jimbo's Ante Markup Language) is parsed and
// validated by the engine itself — these are just convenient starting points.
// Always use the generic `joker:` discriminator (rarity-specific ones are
// footguns that require source-stream alignment).
export interface Preset {
  label: string;
  jaml: string;
}

export const PRESETS: Preset[] = [
  {
    label: "Blueprint",
    jaml: `name: Blueprint Start
deck: Red
stake: White
must:
  - joker: Blueprint
    antes: [1, 2]
`,
  },
  {
    label: "Perkeo + copies",
    jaml: `name: Perkeo Start
deck: Red
stake: White
must:
  - joker: Perkeo
    antes: [1]
should:
  - joker: Blueprint
    antes: [1, 2, 3, 4]
    score: 30
  - joker: Brainstorm
    antes: [1, 2, 3, 4]
    score: 30
`,
  },
  {
    label: "Negative tag",
    jaml: `name: Early Negative
deck: Red
stake: White
must:
  - tag: Negative
    antes: [1, 2]
`,
  },
];

export const DEFAULT_JAML = PRESETS[0].jaml;
