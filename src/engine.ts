// Thin wrapper around motely-wasm — the AOT/SIMD Balatro seed engine.
//
// motely-wasm 21.x is an EMBEDDED build: the runtime is base64-inlined into the
// JS, so boot() takes no args and needs no served binaries / special headers.
// Everything here runs entirely on the client (the user's CPU).
import bootsharp from "motely-wasm";
import { Program } from "motely-wasm/motely/wasm";
import type { IMotelySearch, MotelyScoredSeedResult } from "motely-wasm/motely";

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

/** Parse + validate JAML. Returns the engine error message, or null if valid. */
export function validateJaml(jaml: string): string | null {
  try {
    Program.fromJaml(jaml);
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

export interface SearchHandle {
  /** Resolves when the sweep finishes or is stopped. */
  done: Promise<void>;
  /** Stop the sweep at the next batch boundary. */
  stop: () => void;
}

// Balatro seeds: 8 chars over a 35-char alphabet → 35^8 ≈ 2.25 trillion.
// One sequential batch = 35^BATCH_CHARS seeds; the index space is therefore
// 35^(8 - BATCH_CHARS) batches. Each synchronous engine call sweeps a
// contiguous range of batches, sized for ~0.5s at the measured ~300k seeds/s,
// and we yield a macrotask between calls so the UI paints and Stop can land.
const BATCH_CHARS = 3;
const TOTAL_BATCHES = Math.pow(35, 8 - BATCH_CHARS); // 35^5 = 52,521,875
const BATCHES_PER_RANGE = 4; // ~171,500 seeds per synchronous call

/**
 * Run a client-side seed sweep against a JAML filter. Starts at a random batch
 * so repeated runs cover fresh ground, then walks forward (wrapping) until the
 * whole space is swept or stop() is called. Streams hits and progress out via
 * callbacks. Throws synchronously if the JAML is invalid.
 */
export function runSearch(
  jaml: string,
  onHit: (hit: SeedHit) => void,
  onProgress: (progress: SearchProgress) => void,
): SearchHandle {
  const config = Program.fromJaml(jaml);
  let stopped = false;

  const onScored = (r: MotelyScoredSeedResult) => {
    onHit({ seed: r.seed, score: r.score, tallies: Array.from(r.tallies) });
  };
  Program.onScoredResult.subscribe(onScored);

  const done = (async () => {
    let cursor = Math.floor(Math.random() * TOTAL_BATCHES);
    let scanned = 0;
    let hits = 0;
    let covered = 0;
    const started = performance.now();

    try {
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

        const elapsedSec = (performance.now() - started) / 1000;
        onProgress({
          scanned,
          hits,
          seedsPerSecond: elapsedSec > 0 ? Math.round(scanned / elapsedSec) : 0,
        });
      }
    } finally {
      Program.onScoredResult.unsubscribe(onScored);
      onProgress({ scanned, hits, seedsPerSecond: 0 });
    }
  })();

  return {
    done,
    stop: () => {
      stopped = true;
    },
  };
}
