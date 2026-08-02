# 🧞 Ouija Genie Setup

Natural language to ouija.json config generator for Balatro Seed Oracle.

## Quick Start

```bash
cd ouija-genie
npm install
wrangler dev  # Test locally
wrangler deploy  # Deploy to Cloudflare
```

## Usage

```bash
curl -X POST https://ouija-genie.balatrogenie.workers.dev/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "I want seeds with Wee Joker and good economy"}'
```

## Files
- `ouija-genie/` - Cloudflare Worker that converts prompts to configs
- `balatro-reference.md` - Complete Balatro item reference (150 jokers, consumables, etc.)

## Features
- Translates slang ("dice" → "Oops_All_6s")
- Auto-includes prerequisites (Golden Ticket needs The Devil)
- Schema validation
- CORS enabled

Built with KISS principles - no over-engineering!