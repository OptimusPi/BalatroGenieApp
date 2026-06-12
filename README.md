# 🧞 Balatro Genie

A **minimalist, client-side Balatro seed searcher**. Write a [JAML](https://mcp.seedfinder.app/mcp)
filter, hit search, and [`motely-wasm`](https://www.npmjs.com/package/motely-wasm)
grinds the 2.25-trillion-seed space **entirely in your browser** — no server, no
backend, no API keys. ~600k seeds/s on a single thread on a phone.

## Stack

- **Vite + React + TypeScript** — static SPA, nothing else.
- **motely-wasm** (`^21.2.0`) — the AOT/SIMD seed engine, embedded build
  (base64-inlined WASM: no separate asset, no boot args, no COOP/COEP headers).
- **No worker / single thread** — the search runs on the main thread in chunked
  synchronous batches, yielding a macrotask between each so the UI stays live
  and **Stop** lands instantly.

## How it works

`src/engine.ts` is the whole engine surface:

1. `bootEngine()` — single-flight `bootsharp.boot()`.
2. `validateJaml(jaml)` — `Program.fromJaml(jaml)` throws on invalid JAML.
3. `runSearch(jaml, callbacks)` — a **two-phase** search:
   - **seedlist** — first re-scores the seeds already saved in the filter's
     `seeds:` list via `Program.runSeedListSearch(...)`.
   - **sweep** — then continues across the full space via
     `Program.runSequentialSearch(...)`, streaming hits and progress out.

Balatro seeds are 8 chars over a 35-char alphabet (35⁸ ≈ 2.25 trillion). The
space is partitioned into 35⁵ batches; each synchronous engine call sweeps a
contiguous range, and the loop walks forward (wrapping from a random start)
until swept or stopped.

## Filters as files & the 3141 ratchet

- **📂 Load / 💾 Save `.jaml`** — pull a filter in from disk, edit, and save it
  back out (the file picker is just a hidden `<input type="file">` + a Blob
  download; no upload, everything stays local).
- **Best 3141 (π) ratchet** — as the search runs, the top **3141** seeds by
  score (unique) are written back into the filter's `seeds: [...]` list live
  (`src/jamlSeeds.ts` handles parse / strip / write, flow + block forms). Save
  the file and the bests travel with the filter. Re-run and phase 1 re-scores
  those saved seeds *before* sweeping for more — so each run only sharpens the
  set. Strip `seeds:` before `fromJaml` and feed them via `config.seeds`, so
  parsing never depends on the key.

## Develop

```bash
npm install
npm run dev        # vite dev server
npm run build      # tsc + vite build → dist/
npm run typecheck
```

## Deploy (Vercel)

Auto-detected as a Vite app — `vercel.json` pins the framework, build command,
and `dist` output. Push the branch and import the repo, or:

```bash
npx vercel --prod
```

It's a pure static site; everything runs on the visitor's CPU.

## JAML filters

JAML (Jimbo's Ante Markup Language) is parsed and validated by the engine. Top-level
keys: `name`, `deck`, `stake`, `must`, `should`, `mustNot` (at least one of the
last three). Use the generic `joker:` discriminator. Draft filters with the
Balatro Seed Curator MCP server at `https://mcp.seedfinder.app/mcp` (see
`.mcp.json`).
