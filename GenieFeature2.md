Absolutely, Nathanial. Here’s a comprehensive, self-contained Markdown document you can feed directly to Claude (or any capable LLM) to build your Cloudflare Worker function. It includes:
- Project overview
- Prompt handling logic
- LLM integration instructions
- Schema validation
- Deployment steps

# 🧞 Balatro Seed Oracle: Cloudflare Worker Function

This document defines a Cloudflare Worker that accepts a natural language prompt and returns a valid `ouija.json` config file for the Balatro Seed Oracle CLI. The function uses an LLM (like Claude or OpenAI) to generate the config, validates it against a schema, and returns the result.

---

## 📌 Project Goal

Create a self-contained Cloudflare Worker that:

1. Accepts a POST request with a user prompt (e.g. "I want a seed with Wee Joker and a bunch of 2s").
2. Uses an LLM to generate a valid `ouija.json` config file.
3. Validates the config against a predefined schema.
4. Returns the config as JSON.

---

## 📥 Input Format

```json
POST /generate
Content-Type: application/json

{
  "prompt": "I want a seed with good econ and a funny seed name"
}
```


📤 Output Format
```json
{
  "config": {
    "required_jokers": ["Golden_Ticket", "Coupon_Book"],
    "hand_composition": {
      "2": { "min": 3 }
    },
    "seed_prefix": "ROFL",
    "search_depth": 100000,
    "humor_mode": true
  },
  "valid": true
}
```

🧠 LLM System Prompt
Use this system prompt when calling the LLM:
You are a config generator for the Balatro Seed Oracle. Given a natural language prompt, generate a valid JSON config file that matches the ouija.json schema.

Rules:
- Only use real Balatro items from the provided list.
- Respect item synergies and prerequisites.
- Translate slang (e.g. "dice" → "Oops_All_6s").
- Avoid made-up items or mechanics.

If a user asks for "good econ", prioritize jokers like "Golden_Ticket", "Business_Card", or "Coupon_Book". If a joker requires a tarot card (e.g. "Golden_Ticket" needs "The Devil"), include that too.


📚 Balatro Knowledge Base (Partial Example)
```json
{
  "Oops_All_6s": {
    "type": "joker",
    "tags": ["luck", "dice"],
    "slang": ["dice", "lucky joker"],
    "effects": ["1 in 2 chance of face cards giving $2"]
  },
  "Golden_Ticket": {
    "type": "joker",
    "tags": ["economy", "gold"],
    "requires": ["The Devil"]
  },
  "The Devil": {
    "type": "tarot",
    "tags": ["enhancement", "gold"],
    "effects": ["Turns cards into Gold-enhanced cards"]
  }
}
```


📐 Schema: schema.ouija.json
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Ouija Configuration Schema",
  "description": "Configuration schema for Ouija seed finder filters",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Human-readable name for this configuration"
    },
    "description": {
      "type": "string",
      "description": "Description of what this configuration searches for"
    },
    "author": {
      "type": "string",
      "description": "Configuration author"
    },
    "version": {
      "type": "string",
      "description": "Configuration version",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "filter_config": {
      "type": "object",
      "description": "Core filter configuration",
      "properties": {
        "deck": {
          "type": "string",
          "description": "Deck to use for the search",
          "enum": ["Red_Deck", "Blue_Deck", "Yellow_Deck", "Green_Deck", "Black_Deck", "Magic_Deck", "Nebula_Deck", "Ghost_Deck", "Abandoned_Deck", "Checkered_Deck", "Zodiac_Deck", "Painted_Deck", "Anaglyph_Deck", "Plasma_Deck", "Erratic_Deck"]
        },
        "stake": {
          "type": "string",
          "description": "Stake level for the search",
          "enum": ["White_Stake", "Red_Stake", "Green_Stake", "Black_Stake", "Blue_Stake", "Purple_Stake", "Orange_Stake", "Gold_Stake"]
        },
        "maxSearchAnte": {
          "type": "integer",
          "description": "Maximum ante to search through",
          "minimum": 1,
          "maximum": 16,
          "default": 8
        },
        "startAnte": {
          "type": "integer",
          "description": "Starting ante for search",
          "minimum": 1,
          "maximum": 16,
          "default": 1
        },
        "scoreNaturalNegatives": {
          "type": "boolean",
          "description": "Score jokers that are naturally negative",
          "default": false
        },
        "scoreDesiredNegatives": {
          "type": "boolean",
          "description": "Score desired jokers that are naturally negative",
          "default": false
        },
        "jokersPerAnte": {
          "type": "integer",
          "description": "Number of jokers to generate per ante",
          "minimum": 1,
          "maximum": 16,
          "default": 4
        },
        "shopSkipCount": {
          "type": "integer",
          "description": "Number of shop items to skip before checking",
          "minimum": 0,
          "maximum": 8,
          "default": 2
        },
        "searchNegativeTags": {
          "type": "boolean",
          "description": "Search for negative tags",
          "default": false
        },
        "searchPacks": {
          "type": "boolean",
          "description": "Search booster packs",
          "default": false
        },
        "countNegativeEditions": {
          "type": "boolean",
          "description": "Count negative editions",
          "default": false
        },
        "useDeepSearch": {
          "type": "boolean",
          "description": "Use sliding window deep search",
          "default": false
        },
        "deepSearchWindow": {
          "type": "integer",
          "description": "Window size for deep search",
          "minimum": 1,
          "maximum": 16,
          "default": 8
        },
        "deepSearchSlide": {
          "type": "integer",
          "description": "Slide step for deep search",
          "minimum": 1,
          "maximum": 8,
          "default": 2
        },
        "deepSearchTotal": {
          "type": "integer",
          "description": "Total jokers for deep search",
          "minimum": 1,
          "maximum": 16,
          "default": 16
        },
        "numNeeds": {
          "type": "integer",
          "description": "Number of needs (auto-calculated from Needs array)",
          "minimum": 0,
          "maximum": 32
        },
        "numWants": {
          "type": "integer",
          "description": "Number of wants (auto-calculated from Wants array)",
          "minimum": 0,
          "maximum": 32
        },
        "Needs": {
          "type": "array",
          "description": "Required items/jokers (must be found)",
          "items": {
            "type": "object",
            "properties": {
              "value": {
                "type": "string",
                "description": "Item or joker name"
              },
              "jokeredition": {
                "type": "string",
                "description": "Required joker edition",
                "enum": ["No_Edition", "Foil", "Holographic", "Polychrome", "Negative"],
                "default": "No_Edition"
              },
              "desireByAnte": {
                "type": "integer",
                "description": "Ante by which this item must be found",
                "minimum": 1,
                "maximum": 16,
                "default": 8
              },
              "minMatches": {
                "type": "integer",
                "description": "Minimum number of matches required (scores points for each match)",
                "minimum": 1,
                "default": 1
              },
              "searchAntes": {
                "type": "array",
                "description": "Specific antes to search in",
                "items": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 16
                },
                "uniqueItems": true,
                "default": [1,2,3,4,5,6,7,8]
              }
            },
            "required": ["value"],
            "additionalProperties": false
          }
        },
        "Wants": {
          "type": "array",
          "description": "Desired items/jokers (optional, adds score)",
          "items": {
            "type": "object",
            "properties": {
              "value": {
                "type": "string",
                "description": "Item or joker name"
              },
              "jokeredition": {
                "type": "string",
                "description": "Desired joker edition",
                "enum": ["No_Edition", "Foil", "Holographic", "Polychrome", "Negative"],
                "default": "No_Edition"
              },
              "desireByAnte": {
                "type": "integer",
                "description": "Ante by which this item should be found",
                "minimum": 1,
                "maximum": 16,
                "default": 8
              },
              "searchAntes": {
                "type": "array",
                "description": "Specific antes to search in",
                "items": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 16
                },
                "uniqueItems": true,
                "default": [1,2,3,4,5,6,7,8]
              }
            },
            "required": ["value"],
            "additionalProperties": false
          }
        }
      },
      "required": ["deck", "stake"],
      "additionalProperties": true
    },
    "anaglyph_config": {
      "type": "object",
      "description": "Anaglyph-specific filter configuration",
      "properties": {
        "searchAntes": {
          "type": "array",
          "description": "Antes to search for negative tags (automatically skips first 2 shop items)",
          "items": {
            "type": "integer",
            "minimum": 1,
            "maximum": 16
          },
          "uniqueItems": true,
          "default": [8]
        },
        "searchWindow": {
          "type": "integer",
          "description": "Number of jokers to generate and check per ante",
          "minimum": 1,
          "maximum": 16,
          "default": 8
        }
      },
      "additionalProperties": false
    }
  },
  "required": ["name", "filter_config"],
  "additionalProperties": false
}

```



🛠️ Cloudflare Worker Code (TypeScript)
```ts
import { Ai } from '@cloudflare/ai';
import Ajv from 'ajv';

const ajv = new Ajv();
const schema = /* paste schema.ouija.json here */;
const validate = ajv.compile(schema);

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Only POST allowed', { status: 405 });
    }

    const { prompt } = await request.json();
    const ai = new Ai(env.AI);

    const systemPrompt = `You are a config generator for the Balatro Seed Oracle...`; // full prompt here
    const userPrompt = `Prompt: ${prompt}`;

    const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    let config;
    try {
      config = JSON.parse(response.response);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON from LLM' }), { status: 500 });
    }

    const valid = validate(config);
    return new Response(JSON.stringify({ config, valid }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```


🧪 Local Dev & Deployment
- Install Wrangler:
npm install -g wrangler
- Init project:
wrangler init ouija-genie
- Add dependencies:
npm install ajv
- Add your AI binding in wrangler.toml:
```toml
[[ai]]
binding = "AI"
```
- Deploy:
wrangler publish


✅ Result
You now have a self-contained Cloudflare Worker that:
- Accepts natural language prompts
- Generates valid Balatro ouija.json configs
- Validates them
- Returns them to your app or CLI

🧞 Bonus Ideas
- Add a /funny endpoint that always uses humor_mode: true
- Add a /genie endpoint that returns a TTS audio file with a Genie voice
- Store configs in KV or Durable Objects for history

🧠 Claude, your task:
Please implement this Cloudflare Worker using the above instructions. You may use TypeScript or JavaScript. Ensure the LLM integration is modular and the schema is enforced. Let me know if you need the full item list or additional Balatro mechanics.
