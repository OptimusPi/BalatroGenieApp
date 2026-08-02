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
  const searchRef = useRef(null);

  const search = useCallback(async (jamlText) => {
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
    const onProgress = (p) => {
      setProgress({ searched: p.seedsSearched, matches: p.matchingSeeds });
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
      await MotelySearch.searchList(config);
    } catch (e) {
      setSearchError(e.message);
    } finally {
      MotelySearch.onProgress.unsubscribe(onProgress);
      MotelySearch.onScoredResult.unsubscribe(onScored);
      setSearching(false);
    }
  }, []);

  return { results, progress, searching, searchError, search };
}

export function analyzeSeeds(jamlText) {
  const config = MotelyJaml.fromJaml(jamlText);
  return MotelyJamlyzer.analyzeSeeds(config);
}

export { MotelyJaml };
