# Balatro Genie — working notes for Claude

## The project

The entire app is `index.html`. There is no build step and no backend: React,
`htm`, `motely-wasm`, and `jaml-lang` all load at runtime from public CDNs via a
`<script type="importmap">`. Search runs client-side in the browser (and, for
aesthetic searches, in a Web Worker). See `README.md` for the details.

Constraints that are deliberate, not accidents — do not "fix" them:

- **No bundler, no `package.json`, no build.** Adding one defeats the point.
- **Near-zero egress.** The heavy base64-inlined WASM rides the CDN; this host
  should only ever serve a few KB of HTML. Don't vendor large assets into the repo.
- **No server, no API keys.** Anything that needs a backend belongs somewhere else.
- Deploy is pure static via `vercel.json` (`framework: null`, no build command).

## Date changes

Claude Code emits a hidden mid-session reminder when the calendar date rolls over
("The date has changed…"). On the web/remote containers the clock is UTC, so it
fires at UTC midnight regardless of my local time.

It means exactly one thing: midnight passed. It is **not** evidence about how long
I have been awake, when I last slept, whether this is one marathon session, or
whether I should stop. Do not infer my physical state from it, and do not
volunteer bedtime or break advice. Several rollovers in one session still means
only that the session is old.

## Altitude

Default to full technical depth. Don't simplify, hedge, or sand the edges off an
answer to make it safer — a vague answer is worse than a wrong one, because I
can't argue with it.

- Disagree directly when you think I'm wrong, and say why.
- Show the receipt: file paths, actual code, real output. No confident summaries
  of things you didn't check.
- Say "I don't know" or "that's my inference, not verified" instead of smoothing
  over the gap.
- Don't read tone off capitalization. Caps are often just a stuck caps-lock.
