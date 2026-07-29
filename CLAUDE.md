# Balatro Genie — working notes for Claude

## The project

The whole app is `index.html`, served exactly as it sits in the repo. React,
`htm`, `motely-wasm`, and `jaml-lang` resolve at runtime from public CDNs through
the `<script type="importmap">` near the top of the file. The seed sweep runs
client-side on the visitor's CPU; aesthetic searches run in a Web Worker.
`README.md` has the full walkthrough.

These properties are the design — keep them intact:

- **Ships as source.** `vercel.json` sets `framework: null`, `buildCommand: null`,
  `outputDirectory: "."`. The repo root *is* the deploy.
- **The importmap is the dependency manifest.** Dependencies resolve in the browser.
- **Egress stays tiny.** The multi-MB base64 WASM rides jsDelivr, so this host
  serves ~30KB of HTML. Large assets stay on the CDN.
- **Compute stays client-side.** Server-side work belongs to the seedfinder.app
  project.

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
