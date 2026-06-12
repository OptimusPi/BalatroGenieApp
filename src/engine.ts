// Thin wrapper around motely-wasm — the AOT/SIMD Balatro seed engine.
//
// motely-wasm 21.x is an EMBEDDED build: the runtime is base64-inlined into the
// JS, so boot() takes no args and needs no served binaries / special headers.
// Everything here runs entirely on the client (the user's CPU).
import bootsharp from "motely-wasm";
import { Program } from "motely-wasm/motely/wasm";
import type { IMotelySearch, MotelyScoredSeedResult } from "motely-wasm/motely";
import { parseSeeds, stripSeeds } from "./jamlSeeds.ts";

export type { MotelyScoredSeedResult };

// Single-flight boot: every caller awaits the same promise so the engine boots
// exactly once no matter how many times we ask.
let bootPromise: Promise<void> | null = null;

export function bootEngine(): Promise<void> {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    if (bootsharp.getStatus() === bootsharp.BootStatus.Standby) {
      await bootsharp.boot();
    }
  })();
  return bootPromise;
}

/** Parse + validate JAML (seeds stripped). Returns the error message, or null. */
export function validateJaml(jaml: string): string | null {
  try {
    Program.fromJaml(stripSeeds(jaml));
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export interface SeedHit {
  seed: string;
  score: number;
  tallies: number[];
}

export interface SearchProgress {
  scanned: number;
  hits: number;
  seedsPerSecond: number;
}

export type SearchPhase = "seedlist" | "sweep";

export interface SearchCallbacks {
  onHit: (hit: SeedHit) => void;
  onProgress: (progress: SearchProgress) => void;
  /** The current best seeds by score (capped at MAX_BEST, unique, sorted). */
  onBest: (seeds: string[]) => void;
  onPhase: (phase: SearchPhase) => void;
}

export interface SearchHandle {
  /** Resolves when the sweep finishes or is stopped. */
  done: Promise<void>;
  /** Stop the sweep at the next batch boundary. */
  stop: () => void;
}

// π. We keep the best 3141 seeds by score and write them back into the filter.
export const MAX_BEST = 3141;

// Balatro seeds: 8 chars over a 35-char alphabet → 35^8 ≈ 2.25 trillion.
// One sequential batch = 35^BATCH_CHARS seeds; the index space is therefore
// 35^(8 - BATCH_CHARS) batches. Each synchronous engine call sweeps a
// contiguous range of batches, sized for ~0.5s at the measured ~300k seeds/s,
// and we yield a macrotask between calls so the UI paints and Stop can land.
const BATCH_CHARS = 3;
const TOTAL_BATCHES = Math.pow(35, 8 - BATCH_CHARS); // 35^5 = 52,521,875
const BATCHES_PER_RANGE = 4; // ~171,500 seeds per synchronous call

/**
 * Run a client-side seed search against a JAML filter, in two phases:
 *
 *  1. seedlist — re-score the seeds already saved in the filter's `seeds:` list.
 *  2. sweep    — continue across the full 2.25-trillion seed space, starting at
 *                a random batch and walking forward (wrapping) until swept/stopped.
 *
 * Both phases stream hits through the same handler; the best MAX_BEST seeds by
 * score (unique) are emitted via onBest so the caller can ratchet them back into
 * the filter. Throws synchronously if the JAML is invalid.
 */
export function runSearch(jaml: string, cb: SearchCallbacks): SearchHandle {
  const presetSeeds = parseSeeds(jaml);
  const config = Program.fromJaml(stripSeeds(jaml));
  let stopped = false;

  // Best seeds by score, unique by seed. Pruned to MAX_BEST so a long sweep
  // can't grow the map without bound.
  let best = new Map<string, number>();
  let lastBestEmit = 0;

  const topSeeds = (): string[] =>
    [...best.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_BEST)
      .map(([seed]) => seed);

  const emitBest = (force: boolean) => {
    const now = performance.now();
    if (!force && now - lastBestEmit < 1500) return;
    lastBestEmit = now;
    const top = topSeeds();
    if (best.size > MAX_BEST) best = new Map(top.map((s) => [s, best.get(s)!]));
    cb.onBest(top);
  };

  const onScored = (r: MotelyScoredSeedResult) => {
    const prev = best.get(r.seed);
    if (prev === undefined || r.score > prev) best.set(r.seed, r.score);
    cb.onHit({ seed: r.seed, score: r.score, tallies: Array.from(r.tallies) });
    emitBest(false);
  };
  Program.onScoredResult.subscribe(onScored);

  const done = (async () => {
    let scanned = 0;
    let hits = 0;
    const started = performance.now();
    const report = () => {
      const elapsedSec = (performance.now() - started) / 1000;
      cb.onProgress({
        scanned,
        hits,
        seedsPerSecond: elapsedSec > 0 ? Math.round(scanned / elapsedSec) : 0,
      });
    };

    try {
      // Phase 1: re-score the seeds already saved in the filter.
      if (presetSeeds.length > 0 && !stopped) {
        cb.onPhase("seedlist");
        config.seeds = presetSeeds;
        await new Promise((resolve) => setTimeout(resolve, 0));
        const run: IMotelySearch = Program.runSeedListSearch(config);
        scanned += Number(run.totalSeedsSearched);
        hits += Number(run.matchingSeeds);
        report();
        emitBest(true);
      }

      // Phase 2: continue sweeping the full space.
      config.seeds = [];
      cb.onPhase("sweep");
      let cursor = Math.floor(Math.random() * TOTAL_BATCHES);
      let covered = 0;
      while (covered < TOTAL_BATCHES && !stopped) {
        // Yield so React can paint and a Stop click can land before the next
        // synchronous engine run blocks the thread.
        await new Promise((resolve) => setTimeout(resolve, 0));

        const end = Math.min(cursor + BATCHES_PER_RANGE, TOTAL_BATCHES);
        const run: IMotelySearch = Program.runSequentialSearch(
          config,
          BigInt(cursor),
          BigInt(end),
          BATCH_CHARS,
        );

        scanned += Number(run.totalSeedsSearched);
        hits += Number(run.matchingSeeds);
        covered += end - cursor;
        cursor = end >= TOTAL_BATCHES ? 0 : end;
        report();
      }
    } finally {
      Program.onScoredResult.unsubscribe(onScored);
      report();
      emitBest(true);
    }
  })();

  return {
    done,
    stop: () => {
      stopped = true;
    },
  };
}
