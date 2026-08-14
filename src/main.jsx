import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import bootsharp, { MotelyJaml, MotelySearch } from 'motely-wasm'
import { JimboApp, JimboBackground, JimboButton, JimboSectionHeader, JimboText, JimboTextArea } from 'jaml-ui/ui'
import { JimboBalatroFooter } from 'jaml-ui'
import 'jaml-ui/jimbo.css'
import 'jaml-ui/fonts.css'
import './styles.css'

const JOKERS = ['Blueprint', 'Brainstorm', 'DNA', 'Perkeo', 'Triboulet', 'Yorick', 'Canio', 'Baron', 'Vampire', 'Hologram', 'Photograph', 'The Idol', 'Cavendish', 'Invisible Joker', 'Mime', 'Baron', 'Fibonacci', 'Campfire', 'Rocket', 'Lucky Cat']
const starter = `name: Genie Wish\ndeck: Red\nstake: White\nmust:\n  - joker: Blueprint\n    antes: [1, 2]`

function App() {
  const [jaml, setJaml] = useState(starter)
  const [status, setStatus] = useState('Loading Motely…')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const suggestions = useMemo(() => JOKERS.filter((joker) => joker.toLowerCase().includes(query.toLowerCase())).slice(0, 6), [query])

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
      <header className="topbar"><div><JimboText size="lg" tone="bright">BALATRO GENIE</JimboText><span className="version">JAML SEARCH</span></div><span className="engine">{status}</span></header>
      <section className="intro"><p className="eyebrow">SEED FINDER</p><h1>Find the run<br /><em>you want to play.</em></h1><p className="lede">Write a simple JAML rule. Genie searches the seed space and hands you a playable seed.</p></section>
      <section className="workbench">
        <div className="editor-head"><JimboSectionHeader title="Your search" /><span className="hint">edit the rule below</span></div>
        <JimboTextArea value={jaml} onChange={(event) => setJaml(event.target.value)} spellCheck="false" aria-label="JAML search rule" />
        <div className="quick-pick"><label htmlFor="joker">Quick pick</label><div className="picker"><input id="joker" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a joker…" />{query && suggestions.length > 0 && <div className="suggestions">{suggestions.map((joker) => <button key={joker} onClick={() => choose(joker)}>{joker}</button>)}</div>}</div></div>
        <JimboButton tone="orange" size="lg" fullWidth disabled={busy || status === 'Loading Motely…'} onClick={search}>{busy ? 'Searching…' : 'Find a seed'}</JimboButton>
      </section>
      {result && <section className="result"><p className="eyebrow">FOUND A MATCH</p><strong>{result.seed}</strong><p>Copy the seed into Balatro and start the run.</p></section>}
      <JimboBalatroFooter style={{ position: 'static' }}>Powered by <b>motely-wasm 25.0.3</b> · JAML made readable</JimboBalatroFooter>
    </main>
    </JimboApp>
  </>
}

createRoot(document.getElementById('root')).render(<App />)

export { App }
