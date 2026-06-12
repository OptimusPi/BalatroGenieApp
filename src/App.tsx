import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  bootEngine,
  MAX_BEST,
  runSearch,
  validateJaml,
  type SearchHandle,
  type SearchPhase,
  type SeedHit,
} from "./engine.ts";
import { readName, writeSeeds } from "./jamlSeeds.ts";
import { DEFAULT_JAML, PRESETS } from "./presets.ts";

const MAX_ROWS = 50;

type BootState = "booting" | "ready" | "error";

export function App() {
  const [boot, setBoot] = useState<BootState>("booting");
  const [bootError, setBootError] = useState<string | null>(null);
  const [jaml, setJaml] = useState(DEFAULT_JAML);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<SearchPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SeedHit[]>([]);
  const [stats, setStats] = useState({ scanned: 0, hits: 0, seedsPerSecond: 0 });
  const [bestCount, setBestCount] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const handleRef = useRef<SearchHandle | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    bootEngine().then(
      () => !cancelled && setBoot("ready"),
      (e) => {
        if (cancelled) return;
        setBoot("error");
        setBootError(e instanceof Error ? e.message : String(e));
      },
    );
    return () => {
      cancelled = true;
      handleRef.current?.stop();
    };
  }, []);

  const onSearch = useCallback(async () => {
    if (boot !== "ready" || running) return;

    const validationError = validateJaml(jaml);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setResults([]);
    setStats({ scanned: 0, hits: 0, seedsPerSecond: 0 });
    setRunning(true);

    // Buffer hits and repaint on a throttle so a flood of matches can't thrash
    // React. Keep the top MAX_ROWS by score.
    const found: SeedHit[] = [];
    let lastPaint = 0;
    const paint = (force: boolean) => {
      const now = performance.now();
      if (!force && now - lastPaint < 120) return;
      lastPaint = now;
      found.sort((a, b) => b.score - a.score);
      setResults(found.slice(0, MAX_ROWS));
    };

    try {
      const handle = runSearch(jaml, {
        onHit: (hit) => {
          found.push(hit);
          paint(false);
        },
        onProgress: setStats,
        onPhase: setPhase,
        // Ratchet the best 3141 seeds back into the filter's `seeds:` list.
        onBest: (seeds) => {
          setBestCount(seeds.length);
          setJaml((prev) => writeSeeds(prev, seeds));
        },
      });
      handleRef.current = handle;
      await handle.done;
      paint(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      handleRef.current = null;
      setPhase(null);
      setRunning(false);
    }
  }, [boot, running, jaml]);

  const onStop = useCallback(() => {
    handleRef.current?.stop();
  }, []);

  const onLoadFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setJaml(String(reader.result ?? ""));
      setBestCount(0);
      setResults([]);
      setError(null);
    };
    reader.readAsText(file);
  }, []);

  const onSaveFile = useCallback(() => {
    const blob = new Blob([jaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(readName(jaml) ?? "balatro-filter").replace(/[^\w.-]+/g, "-")}.jaml`;
    a.click();
    URL.revokeObjectURL(url);
  }, [jaml]);

  const onCopy = useCallback((seed: string) => {
    navigator.clipboard?.writeText(seed).then(
      () => {
        setCopied(seed);
        setTimeout(() => setCopied((s) => (s === seed ? null : s)), 1200);
      },
      () => {},
    );
  }, []);

  const statusLabel =
    boot === "booting"
      ? "booting engine…"
      : boot === "error"
        ? "engine error"
        : running
          ? phase === "seedlist"
            ? "re-scoring saved seeds"
            : "sweeping"
          : "ready";

  return (
    <main className="app">
      <header className="head">
        <h1 className="title">
          <span className="genie">🧞</span> Balatro Genie
        </h1>
        <p className="tagline">
          Client-side seed search · 2.25 trillion seeds, all in your browser
        </p>
      </header>

      <div className="statusbar">
        <span className={`badge badge-${boot === "error" ? "red" : running ? "orange" : boot === "ready" ? "green" : "grey"}`}>
          {statusLabel}
        </span>
        <span className="badge badge-blue">{stats.seedsPerSecond.toLocaleString()}/s</span>
        <span className="badge badge-purple">{stats.hits.toLocaleString()} hits</span>
        <span className="badge badge-gold">
          ★ {bestCount.toLocaleString()}/{MAX_BEST}
        </span>
      </div>

      <div className="toolbar">
        <button type="button" className="chip" disabled={running} onClick={() => fileRef.current?.click()}>
          📂 Load .jaml
        </button>
        <button type="button" className="chip" onClick={onSaveFile}>
          💾 Save .jaml
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".jaml,.yaml,.yml,.txt,text/yaml"
          hidden
          onChange={onLoadFile}
        />
      </div>

      <div className="presets">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="chip"
            disabled={running}
            onClick={() => {
              setJaml(p.jaml);
              setBestCount(0);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <textarea
        className="editor"
        spellCheck={false}
        value={jaml}
        disabled={running}
        onChange={(e) => setJaml(e.target.value)}
        placeholder="Write a JAML filter…"
      />

      {boot === "error" && bootError ? (
        <p className="error">Engine failed to boot: {bootError}</p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}

      {running ? (
        <button type="button" className="run run-stop" onClick={onStop}>
          Stop
        </button>
      ) : (
        <button type="button" className="run" disabled={boot !== "ready"} onClick={onSearch}>
          {boot === "ready" ? "Search Seeds" : "Booting…"}
        </button>
      )}

      {results.length > 0 ? (
        <ul className="results">
          {results.map((r) => (
            <li key={r.seed} className="seed" onClick={() => onCopy(r.seed)} title="Click to copy">
              <span className="seed-id">{r.seed}</span>
              <span className="seed-score">{copied === r.seed ? "copied!" : r.score}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <footer className="foot">
        Powered by{" "}
        <a href="https://www.npmjs.com/package/motely-wasm" target="_blank" rel="noreferrer">
          motely-wasm
        </a>{" "}
        · JAML filters via{" "}
        <a href="https://mcp.seedfinder.app/mcp" target="_blank" rel="noreferrer">
          seedfinder.app
        </a>
      </footer>
    </main>
  );
}
