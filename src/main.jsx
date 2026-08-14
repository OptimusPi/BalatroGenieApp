import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import bootsharp, { MotelyJaml, MotelySearch } from 'motely-wasm'
import {
  JimboApp, JimboBackground, JimboButton, JimboSectionHeader, JimboText, JimboTextArea,
  JimboPanel, JimboStatusPill, JimboTextInput, JimboGrid,
  JimboSeedCopyChip,
} from 'jaml-ui/ui'
import 'jaml-ui/jimbo.css'
import 'jaml-ui/fonts.css'
import './styles.css'

const JOKERS = ['Blueprint', 'Brainstorm', 'DNA', 'Perkeo', 'Triboulet', 'Yorick', 'Canio', 'Baron', 'Vampire', 'Hologram', 'Photograph', 'The Idol', 'Cavendish', 'Invisible Joker', 'Mime', 'Baron', 'Fibonacci', 'Campfire', 'Rocket', 'Lucky Cat']
const starter = `name: Genie Wish\ndeck: Red\nstake: White\nmust:\n  - joker: Blueprint\n    antes: [1, 2]`

const STATUS_MAP = {
  'Loading Motely…': 'idle',
  'Ready': 'idle',
  'Searching…': 'running',
  'Match found': 'ok',
  'No match': 'paused',
}

function App() {
  const [jaml, setJaml] = useState(starter)
  const [status, setStatus] = useState('Loading Motely…')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const suggestions = useMemo(() => JOKERS.filter((joker) => joker.toLowerCase().includes(query.toLowerCase())).slice(0, 8), [query])
  const pillStatus = STATUS_MAP[status] ?? (status.toLowerCase().includes('fail') || status.toLowerCase().includes('invalid') ? 'error' : 'idle')

  useEffect(() => { bootsharp.boot().then(() => setStatus('Ready')).catch(() => setStatus('Engine failed')) }, [])

  async function search() {
    setBusy(true); setResult(null); setStatus('Searching…')
    try {
      const found = await MotelySearch.findOne(MotelyJaml.fromJaml(jaml))
      setResult(found?.[0] ?? null); setStatus(found?.length ? 'Match found' : 'No match')
    } catch (error) { setStatus(error.message || 'Invalid JAML') }
    finally { setBusy(false) }
  }

  function choose(joker) {
    setQuery(joker)
    setJaml((value) => value.replace(/joker: .+/, `joker: ${joker.replace(/[^a-zA-Z0-9 ]/g, '').replace(/ (.)/g, (_, c) => c.toUpperCase())}`))
  }

  return <>
    <JimboBackground />
    <JimboApp variant="page" scroll>
    <main className="genie-shell">
      <header className="topbar">
        <div><JimboText size="lg" tone="bright">BALATRO GENIE</JimboText><span className="version">JAML SEARCH</span></div>
        <JimboStatusPill status={pillStatus} label={status} />
      </header>
      <section className="intro"><p className="eyebrow">SEED FINDER</p><h1>Find the run<br /><em>you want to play.</em></h1><p className="lede">Write a simple JAML rule. Genie searches the seed space and hands you a playable seed.</p></section>

      <JimboPanel title="Your search" className="workbench">
        <JimboTextArea value={jaml} onChange={(event) => setJaml(event.target.value)} spellCheck="false" aria-label="JAML search rule" />

        <div className="quick-pick">
          <JimboTextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a joker…" aria-label="Quick pick a joker" />
          {query && (
            suggestions.length > 0
              ? <JimboGrid columns={2} gap="sm">
                  {suggestions.map((joker) => (
                    <JimboButton key={joker} size="sm" tone="blue" onClick={() => choose(joker)}>{joker}</JimboButton>
                  ))}
                </JimboGrid>
              : <JimboText tone="muted" size="sm">No joker matches &ldquo;{query}&rdquo;</JimboText>
          )}
        </div>

        <JimboButton tone="orange" size="lg" fullWidth disabled={busy || status === 'Loading Motely…'} onClick={search}>{busy ? 'Searching…' : 'Find a seed'}</JimboButton>
      </JimboPanel>

      {result && (
        <JimboPanel title="Found a match" tone="ok" className="result">
          <JimboSeedCopyChip value={result.seed} />
          <p>Copy the seed into Balatro and start the run.</p>
        </JimboPanel>
      )}

      <p className="attribution">Powered by <b>motely-wasm 25.0.3</b> · built with <b>jaml-ui</b></p>
    </main>
    </JimboApp>
  </>
}

createRoot(document.getElementById('root')).render(<App />)

export { App }
