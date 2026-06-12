# 🧞 Balatro Genie

A **minimalist, client-side Balatro seed searcher** in a single static HTML file.
Write a [JAML](https://mcp.seedfinder.app/mcp) filter, hit search, and
[`motely-wasm`](https://www.npmjs.com/package/motely-wasm) grinds the
2.25-trillion-seed space **entirely in your browser** — no server, no backend,
no API keys. ~600k seeds/s on a single thread on a phone.

## No build, near-zero egress

The whole app is `index.html`. There's **nothing to bundle** — React, `htm`, and
the multi-MB embedded WASM engine all load at runtime from public CDNs via a
`<script type="importmap">`:

- React / `htm` → `esm.sh`
- `motely-wasm@21.2.0` → `jsdelivr.net` (the heavy base64-inlined WASM rides the
  CDN, so your own host serves only a few KB of HTML and egress stays near zero)

The engine is an *embedded* build: `bootsharp.boot()` takes no args and needs no
COOP/COEP headers, so a plain static deploy just works.

## How it works

A `<script type="module">` in `index.html`:

1. `bootEngine()` — single-flight `bootsharp.boot()`.
2. `validateJaml()` — `Program.fromJaml()` throws on invalid JAML.
3. `runSearch(jaml, callbacks)` — a **two-phase** search:
   - **seedlist** — first re-scores the seeds already saved in the filter's
     `seeds:` list via `Program.runSeedListSearch(...)`.
   - **sweep** — then continues across the full space via
     `Program.runSequentialSearch(...)`, yielding a macrotask between batches so
     the UI stays live and **Stop** lands instantly.

Balatro seeds are 8 chars over a 35-char alphabet (35⁸ ≈ 2.25 trillion),
partitioned into 35⁵ batches.

## Friendly JAML errors (jaml-lang)

The engine throws a single opaque `C# exception from NativeAOT` for *any* bad
JAML — a duplicate key, a typo'd enum, a missing field. Before searching, the
app runs [`jaml-lang`](https://www.npmjs.com/package/jaml-lang) (the authoritative
language server, loaded lazily from a CDN) to turn that into a real message with
a line number — e.g. `line 10: Map keys must be unique` or
`line 5: Invalid enum value. Expected … 'NegativeTag' …, received 'Negative'`. If
the CDN is unreachable it silently falls back to the engine's own validation.

## 🎲 Magic & auto-cutoff

- **🎲 Magic** rolls a random `JamlAesthetic` (Palindrome · Echo · Gross · Funny
  · Balatro) and runs `runAestheticSearch` in a Web Worker (one long synchronous
  enumeration, so it can't run on the main thread; Stop terminates the worker).
- The normal sweep runs with **auto-cutoff** on: the engine raises the score bar
  as better seeds surface, so the best-3141 ratchet fills with the top seeds.

## Filters as files & the 3141 ratchet

- **📂 Load / 💾 Save `.jaml`** — pull a filter in from disk, edit, save it back
  out. Local-only: a hidden file input + a Blob download, nothing uploads.
- **Best 3141 (π) ratchet** — the top **3141** seeds by score (unique) are
  written back into the filter's `seeds: [...]` list live. Save the file and the
  bests travel with it; re-run and phase 1 re-scores them *before* sweeping for
  more, so each run only sharpens the set.

## Deploy (Vercel)

Pure static — `vercel.json` declares no framework and no build, serving the repo
root. Import the repo at [vercel.com/new](https://vercel.com/new) and deploy, or
run `npx vercel --prod`. Or open `index.html` over any static server / `file://`.

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

(Any static server works; the importmap fetches everything else from the CDNs.)
