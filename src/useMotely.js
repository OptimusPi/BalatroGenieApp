import { useState, useEffect, useRef, useCallback } from "react";
import bootsharp, { MotelyJaml, MotelySearch, MotelyJamlyzer } from "motely-wasm";

export function useMotely() {
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (bootsharp.getStatus() === bootsharp.BootStatus.Booted) {
      setStatus("ready");
      return;
    }
    if (bootsharp.getStatus() !== bootsharp.BootStatus.Standby) return;

    bootsharp.boot().then(
      () => setStatus("ready"),
      (err) => {
        setError(err.message);
        setStatus("error");
      }
    );
  }, []);

  return { status, error };
}

export function useSearch() {
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const cancelRef = useRef(null);
  const throttleRef = useRef(null);
  const pendingProgressRef = useRef(null);

  const stop = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }
  }, []);

  const search = useCallback(async (jamlText, mode = "findOne") => {
    stop();
    setSearchError(null);
    setResults([]);
    setProgress(null);

    let config;
    try {
      const validationError = MotelyJaml.validate(jamlText);
      if (validationError) {
        setSearchError(validationError);
        return;
      }
      config = MotelyJaml.fromJaml(jamlText);
    } catch (e) {
      setSearchError(e.message);
      return;
    }

    const found = [];
    let cancelled = false;
    cancelRef.current = () => { cancelled = true; };

    const flushProgress = () => {
      if (pendingProgressRef.current) {
        setProgress({ ...pendingProgressRef.current });
        pendingProgressRef.current = null;
      }
    };

    const onProgress = (p) => {
      pendingProgressRef.current = { searched: p.seedsSearched, matches: p.matchingSeeds };
      if (!throttleRef.current) {
        throttleRef.current = setTimeout(() => {
          throttleRef.current = null;
          flushProgress();
        }, 120);
      }
    };

    const onScored = (r) => {
      found.push({
        seed: r.seed,
        score: r.score,
        tallies: Array.from(r.tallies),
      });
      setResults([...found]);
    };

    MotelySearch.onProgress.subscribe(onProgress);
    MotelySearch.onScoredResult.subscribe(onScored);
    setSearching(true);

    try {
      if (mode === "list") {
        await MotelySearch.searchList(config);
      } else if (mode === "findOne") {
        await MotelySearch.findOne(config);
      } else if (mode === "random") {
        await MotelySearch.searchRandom(config, 10000);
      } else if (mode === "collect") {
        await MotelySearch.collect(config, 100n);
      }
    } catch (e) {
      if (!cancelled) setSearchError(e.message);
    } finally {
      MotelySearch.onProgress.unsubscribe(onProgress);
      MotelySearch.onScoredResult.unsubscribe(onScored);
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
        throttleRef.current = null;
      }
      flushProgress();
      setSearching(false);
      cancelRef.current = null;
    }
  }, [stop]);

  return { results, progress, searching, searchError, search, stop };
}

export function parseDeckStake(jamlText) {
  const deckMatch = jamlText.match(/^deck:\s*(.+)$/m);
  const stakeMatch = jamlText.match(/^stake:\s*(.+)$/m);
  return {
    deck: deckMatch ? deckMatch[1].trim() : undefined,
    stake: stakeMatch ? stakeMatch[1].trim() : undefined,
  };
}

export { MotelyJaml, MotelyJamlyzer, MotelySearch };
