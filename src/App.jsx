import React, { useState, useCallback, useMemo } from "react";
import {
  JimboApp,
  JimboBackground,
  JimboPanel,
  JimboButton,
  JimboText,
  JimboStack,
  JimboRow,
  JimboSpacer,
  JimboSpinner,
  JimboSeedCopyChip,
  JimboWordmark,
  JimboStatusPill,
  JimboErrorBlock,
  JamlIde,
  JamlyzerView,
  JimboBalatroFooter,
  DeckSprite,
} from "jaml-ui";
import "jaml-ui/fonts.css";
import { useMotely, useSearch, parseDeckStake, MotelyJaml, MotelyJamlyzer } from "./useMotely.js";

const DEFAULT_JAML = `name: My First Search
deck: Red
stake: White
must:
  - voucher: Overstock
    antes: [1]
`;

export default function App() {
  const { status: engineStatus, error: engineError } = useMotely();
  const { results, progress, searching, searchError, search, stop } = useSearch();
  const [jaml, setJaml] = useState(DEFAULT_JAML);
  const [selectedSeed, setSelectedSeed] = useState(null);
  const [analyzerResult, setAnalyzerResult] = useState(null);
  const [analyzerError, setAnalyzerError] = useState(null);
  const [searchMode, setSearchMode] = useState("findOne");

  const searchJamlRef = React.useRef(jaml);

  const handleSearch = useCallback(() => {
    searchJamlRef.current = jaml;
    setSelectedSeed(null);
    setAnalyzerResult(null);
    search(jaml, searchMode);
  }, [jaml, search, searchMode]);

  const handleSeedClick = useCallback((seed) => {
    setSelectedSeed(seed);
    setAnalyzerError(null);
    try {
      const frozenJaml = searchJamlRef.current;
      const config = MotelyJaml.fromJaml(frozenJaml);
      config.seeds = [seed];
      const analysisResults = MotelyJamlyzer.analyzeSeeds(config);
      if (!analysisResults.length) {
        setAnalyzerError("No analysis returned for this seed");
        return;
      }
      setAnalyzerResult(analysisResults[0]);
    } catch (e) {
      setAnalyzerError(e.message);
    }
  }, []);

  const searchResults = useMemo(
    () => results.map((r) => ({
      seed: r.seed,
      score: r.score,
      tallyColumns: r.tallies,
    })),
    [results]
  );

  const { deck, stake } = useMemo(() => parseDeckStake(searchJamlRef.current), [results]);

  const selectedTallies = useMemo(() => {
    if (!selectedSeed) return undefined;
    const match = results.find((r) => r.seed === selectedSeed);
    return match?.tallies;
  }, [selectedSeed, results]);

  if (engineStatus === "loading") {
    return (
      <JimboBackground>
        <JimboApp variant="page">
          <JimboStack style={{ alignItems: "center", paddingTop: 80 }}>
            <JimboSpinner size="lg" />
            <JimboText body="Booting Motely engine..." variant="label" />
          </JimboStack>
        </JimboApp>
      </JimboBackground>
    );
  }

  if (engineStatus === "error") {
    return (
      <JimboBackground>
        <JimboApp variant="page">
          <JimboStack style={{ padding: 24 }}>
            <JimboErrorBlock message={engineError || "Failed to boot engine"} />
          </JimboStack>
        </JimboApp>
      </JimboBackground>
    );
  }

  return (
    <JimboBackground>
      <JimboApp
        variant="page"
        footer={<JimboBalatroFooter />}
      >
        <JimboStack style={{ padding: 16, gap: 16, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <JimboRow style={{ alignItems: "center", gap: 12 }}>
            <JimboWordmark />
            <JimboText body="Seed Genie" variant="title" />
            <JimboSpacer />
            <JimboStatusPill status="success" label="Engine Ready" />
          </JimboRow>

          <div style={{ display: "grid", gridTemplateColumns: selectedSeed ? "1fr 1fr" : "1fr", gap: 16 }}>
            <JimboStack style={{ gap: 16 }}>
              <JamlIde
                jaml={jaml}
                onChange={setJaml}
                onSearch={handleSearch}
                isSearching={searching}
                searchResults={searchResults}
                title="Seed Genie"
                subtitle="Write JAML to find your perfect seed"
                actions={
                  <JimboRow style={{ gap: 8, alignItems: "center" }}>
                    <select
                      value={searchMode}
                      onChange={(e) => setSearchMode(e.target.value)}
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        color: "white",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: 6,
                        padding: "4px 8px",
                        fontSize: 12,
                      }}
                    >
                      <option value="findOne">Find One</option>
                      <option value="list">List Search</option>
                      <option value="random">Random (10k)</option>
                      <option value="collect">Collect (100)</option>
                    </select>
                    {searching && (
                      <JimboButton onClick={stop} variant="danger" size="sm">
                        Stop
                      </JimboButton>
                    )}
                  </JimboRow>
                }
              />

              {searchError && <JimboErrorBlock message={searchError} />}

              {progress && (
                <JimboPanel>
                  <JimboRow style={{ gap: 12 }}>
                    <JimboText
                      body={`Searched: ${progress.searched.toLocaleString()}`}
                      variant="label"
                    />
                    <JimboText
                      body={`Matches: ${progress.matches.toLocaleString()}`}
                      variant="label"
                    />
                  </JimboRow>
                </JimboPanel>
              )}

              {results.length > 0 && (
                <JimboPanel>
                  <JimboStack style={{ gap: 8 }}>
                    <JimboText body={`${results.length} seed${results.length === 1 ? "" : "s"} found`} variant="label" />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {results.map((r) => (
                        <JimboSeedCopyChip
                          key={r.seed}
                          seed={r.seed}
                          onClick={() => handleSeedClick(r.seed)}
                        />
                      ))}
                    </div>
                  </JimboStack>
                </JimboPanel>
              )}
            </JimboStack>

            {selectedSeed && (
              <JimboStack style={{ gap: 16 }}>
                <JimboPanel>
                  <JimboRow style={{ alignItems: "center", gap: 12 }}>
                    <JimboText body={`Analyzing: ${selectedSeed}`} variant="title" />
                    <JimboSpacer />
                    {deck && <DeckSprite deck={deck} stake={stake} />}
                  </JimboRow>
                </JimboPanel>
                {analyzerError && <JimboErrorBlock message={analyzerError} />}
                {analyzerResult && (
                  <JamlyzerView
                    result={analyzerResult}
                    deck={deck}
                    stake={stake}
                    jamlText={searchJamlRef.current}
                    tallies={selectedTallies}
                  />
                )}
              </JimboStack>
            )}
          </div>
        </JimboStack>
      </JimboApp>
    </JimboBackground>
  );
}
