import { useCallback, useEffect, useRef, useState } from "react";
import {
  bootEngine,
  runSearch,
  validateJaml,
  type SearchHandle,
  type SeedHit,
} from "./engine.ts";
import { DEFAULT_JAML, PRESETS } from "./presets.ts";

const MAX_ROWS = 50;

type BootState = "booting" | "ready" | "error";

export function App() {
  const [boot, setBoot] = useState<BootState>("booting");
  const [bootError, setBootError] = useState<string | null>(null);
  const [jaml, setJaml] = useState(DEFAULT_JAML);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SeedHit[]>([]);
  const [stats, setStats] = useState({ scanned: 0, hits: 0, seedsPerSecond: 0 });
  const [copied, setCopied] = useState<string | null>(null);

  const handleRef = useRef<SearchHandle | null>(null);

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
      const handle = runSearch(
        jaml,
        (hit) => {
          found.push(hit);
          paint(false);
        },
        setStats,
      );
      handleRef.current = handle;
      await handle.done;
      paint(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      handleRef.current = null;
      setRunning(false);
    }
  }, [boot, running, jaml]);

  const onStop = useCallback(() => {
    handleRef.current?.stop();
  }, []);

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
          ? "searching"
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
        <span className="badge badge-grey">{stats.scanned.toLocaleString()} scanned</span>
      </div>

      <div className="presets">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="chip"
            disabled={running}
            onClick={() => setJaml(p.jaml)}
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
        <button
          type="button"
          className="run"
          disabled={boot !== "ready"}
          onClick={onSearch}
        >
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
