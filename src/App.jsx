import { useEffect, useMemo, useRef, useState } from "react";
import {
  JimboApp,
  JimboBackground,
  JimboPanel,
  JimboButton,
  JimboText,
  JimboTextInput,
  JimboStack,
  JimboRow,
  JimboStatusPill,
  JimboSeedCopyChip,
  JimboErrorBlock,
  JimboInset,
  JamlGameCard,
  JimboBalatroFooter,
} from "jaml-ui";
import {
  JOKERS,
  DISPLAY_TO_JAML,
  filterJokers,
  resolveJoker,
  buildJaml,
  bootEngine,
  grantWish,
  subscribeProgress,
  EARLY_ANTES,
} from "./engine.js";

import { JimboColorOption } from "jaml-ui";

/** Token-level JAML syntax highlighting using jimbo palette colors. */
function JamlHighlight({ jaml }) {
  return jaml.split("\n").map((line, i) => {
    const m = line.match(/^(\s*-?\s*)([A-Za-z]+)(:)(.*)$/);
    if (!m) {
      return (
        <span key={i}>
          {line}
          {"\n"}
        </span>
      );
    }
    const [, indent, key, colon, value] = m;
    return (
      <span key={i}>
        {indent}
        <span style={{ color: JimboColorOption.BLUE }}>{key}</span>
        <span style={{ color: JimboColorOption.GREY }}>{colon}</span>
        <span style={{ color: JimboColorOption.GOLD_TEXT }}>{value}</span>
        {"\n"}
      </span>
    );
  });
}

export default function App() {
  const [engineState, setEngineState] = useState("booting"); // booting | ready | failed
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bootEngine()
      .then(() => setEngineState("ready"))
      .catch((e) => {
        setEngineState("failed");
        setError(String(e?.message || e));
      });
  }, []);

  useEffect(() => {
    if (!busy) return;
    return subscribeProgress((p) => {
      const m = Number(p.seedsSearched) / 1e6;
      if (m >= 0.1) setProgress(`${m.toFixed(1)}M seeds`);
    });
  }, [busy]);

  const matches = useMemo(() => filterJokers(query), [query]);
  const activeJoker = selected || resolveJoker(query);

  const jamlPreview = useMemo(() => {
    if (!activeJoker) return "";
    return buildJaml(DISPLAY_TO_JAML[activeJoker], EARLY_ANTES);
  }, [activeJoker]);

  function pick(joker) {
    setSelected(joker);
    setQuery(joker);
    setError(null);
  }

  async function wish() {
    if (!activeJoker || busy || engineState !== "ready") return;
    setBusy(true);
    setResult(null);
    setError(null);
    setProgress("");
    setStatus("");
    try {
      const r = await grantWish({
        joker: activeJoker,
        keyword: keyword.trim(),
        onStatus: setStatus,
      });
      setResult(r);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
      setStatus("");
      setProgress("");
    }
  }

  function onKeyDown(e) {
    if (e.key !== "Enter") return;
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    if (!activeJoker && matches.length > 0) {
      pick(matches[0]);
      return;
    }
    wish();
  }

  const pillStatus =
    engineState === "failed" ? "error" : engineState === "booting" ? "loading" : busy ? "loading" : "ok";
  const pillLabel =
    engineState === "failed"
      ? "engine failed"
      : engineState === "booting"
        ? "waking the genie..."
        : busy
          ? progress || "crunching..."
          : "ready";

  return (
    <JimboApp variant="page" footer={<JimboBalatroFooter style={{ position: "static" }} />}>
      <JimboBackground />
      <main style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "16px" }}>
        <JimboStack gap="lg">
          <JimboRow justify="between" align="center">
            <JimboText size="xl" tone="gold" as="h1">
              Balatro Genie
            </JimboText>
            <JimboStatusPill status={pillStatus} label={pillLabel} />
          </JimboRow>

          <JimboPanel title="Make a wish" tone="blue">
            <JimboStack gap="md">
              <JimboTextInput
                ref={inputRef}
                value={query}
                placeholder="Type a joker... e.g. Blueprint"
                aria-label="Joker to wish for"
                autoFocus
                disabled={engineState !== "ready" || busy}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
                onKeyDown={onKeyDown}
              />

              {!activeJoker && (
                <JimboInset style={{ maxHeight: 340, overflowY: "auto" }}>
                  {query && (
                    <JimboText size="sm" tone="muted" style={{ display: "block", marginBottom: 8 }}>
                      {matches.length} joker{matches.length === 1 ? "" : "s"} match — tap a card, or keep typing
                    </JimboText>
                  )}
                  <div className="genie-picker-grid">
                    {matches.map((j) => (
                      <button key={j} type="button" title={j} onClick={() => pick(j)} aria-label={`Pick ${j}`}>
                        <JamlGameCard card={{ name: j, scale: 0.55 }} type="joker" />
                      </button>
                    ))}
                  </div>
                </JimboInset>
              )}

              {activeJoker && (
                <JimboRow gap="md" align="center" justify="center" style={{ flexWrap: "wrap" }}>
                  <div className="genie-card-slot">
                    <JamlGameCard card={{ name: activeJoker }} type="joker" hoverTilt />
                  </div>
                  <JimboInset style={{ flex: "1 1 280px", minWidth: 240 }}>
                    <pre
                      style={{
                        margin: 0,
                        fontFamily: "monospace",
                        fontSize: 13,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      <JamlHighlight jaml={jamlPreview} />
                    </pre>
                  </JimboInset>
                </JimboRow>
              )}

              <JimboTextInput
                value={keyword}
                placeholder="Optional: letters your seed must contain (e.g. PIFREAK)"
                aria-label="Vanity letters for the seed"
                disabled={engineState !== "ready" || busy}
                onChange={(e) =>
                  setKeyword(e.target.value.toUpperCase().replace(/0/g, "O").replace(/[^A-Z1-9]/g, "").slice(0, 7))
                }
                onKeyDown={onKeyDown}
              />

              <JimboButton
                tone="orange"
                size="lg"
                fullWidth
                disabled={!activeJoker || busy || engineState !== "ready"}
                onClick={wish}
              >
                {engineState === "booting"
                  ? "Waking the genie..."
                  : busy
                    ? progress
                      ? `${progress} checked`
                      : "Crunching..."
                    : "Grant Wish"}
              </JimboButton>

              {status && (
                <JimboText size="sm" tone="muted" style={{ textAlign: "center" }}>
                  {status}
                </JimboText>
              )}
            </JimboStack>
          </JimboPanel>

          {error && <JimboErrorBlock title="No dice">{error}</JimboErrorBlock>}

          {result && (
            <JimboPanel title="Your seed" tone="gold">
              <JimboStack gap="md" align="center">
                <JimboSeedCopyChip value={result.seed} copiedLabel="copied!" />
                <JimboRow gap="md" align="center" justify="center">
                  <div className="genie-card-slot">
                    <JamlGameCard card={{ name: result.joker, scale: 0.8 }} type="joker" hoverTilt />
                  </div>
                  <JimboStack gap="xs">
                    <JimboText size="md">{result.joker}</JimboText>
                    <JimboText size="sm" tone="muted">
                      {result.anteNote}
                    </JimboText>
                    <JimboText size="sm" tone="muted">
                      found in {result.elapsed}s
                    </JimboText>
                  </JimboStack>
                </JimboRow>
              </JimboStack>
            </JimboPanel>
          )}
        </JimboStack>
      </main>
    </JimboApp>
  );
}
