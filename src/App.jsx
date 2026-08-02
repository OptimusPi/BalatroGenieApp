import React, { useState, useCallback } from "react";
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
} from "jaml-ui";
import "jaml-ui/fonts.css";
import { useMotely, useSearch, analyzeSeeds, MotelyJaml } from "./useMotely.js";

const DEFAULT_JAML = `name: My First Search
deck: Red
stake: White
must:
  - voucher: Overstock
    antes: [1]
`;

export default function App() {
  const { status: engineStatus, error: engineError } = useMotely();
  const { results, progress, searching, searchError, search } = useSearch();
  const [jaml, setJaml] = useState(DEFAULT_JAML);
  const [selectedSeed, setSelectedSeed] = useState(null);
  const [analyzerResult, setAnalyzerResult] = useState(null);
  const [analyzerError, setAnalyzerError] = useState(null);

  const handleSearch = useCallback(() => {
    setSelectedSeed(null);
    setAnalyzerResult(null);
    search(jaml);
  }, [jaml, search]);

  const handleSeedClick = useCallback(
    (seed) => {
      setSelectedSeed(seed);
      setAnalyzerError(null);
      try {
        const results = analyzeSeeds(jaml);
        const match = results.find((r) => r.seed === seed);
        setAnalyzerResult(match || results[0]);
      } catch (e) {
        setAnalyzerError(e.message);
      }
    },
    [jaml]
  );

  const searchResults = results.map((r) => ({
    seed: r.seed,
    score: r.score,
    tallyColumns: r.tallies,
  }));

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
      <JimboApp variant="page">
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
                    <JimboText body={`${results.length} seeds found`} variant="label" />
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
                  <JimboText body={`Analyzing: ${selectedSeed}`} variant="title" />
                </JimboPanel>
                {analyzerError && <JimboErrorBlock message={analyzerError} />}
                {analyzerResult && (
                  <JamlyzerView result={analyzerResult} jamlText={jaml} />
                )}
              </JimboStack>
            )}
          </div>
        </JimboStack>
      </JimboApp>
    </JimboBackground>
  );
}
