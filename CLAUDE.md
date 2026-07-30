# Balatro Genie — working notes for Claude

## The project

The whole app is `index.html`, served exactly as it sits in the repo. React,
`htm`, `motely-wasm`, and `jaml-lang` resolve at runtime from public CDNs through
the `<script type="importmap">` near the top of the file. The seed sweep runs
client-side on the visitor's CPU; aesthetic searches run in a Web Worker.
`README.md` has the full walkthrough.

These properties are the design — keep them intact:

- **Ships as source.** `vercel.json` sets `framework: null`, `buildCommand: null`,
  `outputDirectory: "."`. The repo root *is* the deploy, and the browser runs
  `index.html` unchanged.
- **`package.json` pins versions; the importmap loads them.** `npm install` gives
  local resolution, types, and a lockfile. The runtime keeps resolving from the
  CDN through the importmap, so the two stay in step by hand — bump both.
- **Egress stays tiny.** The multi-MB base64 WASM and jaml-ui's inlined sprite
  sheets ride the CDN, so this host serves ~30KB of HTML.
- **Compute stays client-side.** Server-side work belongs to the seedfinder.app
  project.

## The packages

`motely-wasm`, `jaml-ui`, `jaml-lang`, and `jaml-codemirror` are all pifreak's own
work. Check npm for the current version before assuming an API — this app has
sat three majors behind before. `jaml-ui` supersedes `jaml-codemirror`: it ships
`JamlCodeEditor`, `JamlIde`, `JamlIdeToolbar`, and `JamlIdeVisual` directly.

## Date changes

A mid-session "the date has changed" reminder reports one fact: midnight passed on
the container clock, which runs UTC. Read it as a timestamp and continue the work
in progress.

## Altitude

Full technical depth.

- Show the receipt: file paths, real code, actual command output.
- Mark inference as inference, and say "I don't know" where that is the answer.
- Disagree directly, and give the reason.
- Read text for its content. Capitalization is typography.
- Write rules here in the affirmative: state the behavior to perform.
