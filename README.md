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
3. `runSearch(jaml, onHit, onProgress)` — sweeps batches of the seed space via
   `Program.runSequentialSearch(...)`, streaming hits and progress out.

Balatro seeds are 8 chars over a 35-char alphabet (35⁸ ≈ 2.25 trillion). The
space is partitioned into 35⁵ batches; each synchronous engine call sweeps a
contiguous range, and the loop walks forward (wrapping from a random start)
until swept or stopped.

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
