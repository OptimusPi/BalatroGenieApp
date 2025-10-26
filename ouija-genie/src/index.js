// Cloudflare Worker for Balatro Seed Oracle Config Generator
import Ajv from 'ajv';
import { Ai } from '@cloudflare/ai';

// Schema definition (updated to match Motely format)
const OUIJA_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Ouija Configuration Schema",
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
    "deck": {
      "type": "string",
      "description": "Deck to use for the search",
      "enum": ["Red", "Blue", "Yellow", "Green", "Black", "Magic", "Nebula", "Ghost", "Abandoned", "Checkered", "Zodiac", "Painted", "Anaglyph", "Plasma", "Erratic"]
    },
    "stake": {
      "type": "string",
      "description": "Stake level for the search",
      "enum": ["White", "Red", "Green", "Black", "Blue", "Purple", "Orange", "Gold"]
    },
    "must": {
      "type": "array",
      "description": "Required constraints that must be satisfied",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": ["Joker", "joker", "SmallBlindTag", "voucher", "SoulJoker", "Or", "And", "Tarot", "Planet", "Spectral"]
          },
          "value": { "type": "string" },
          "values": {
            "type": "array",
            "items": { "type": "string" }
          },
          "Edition": {
            "type": "string",
            "enum": ["None", "Foil", "Holographic", "Polychrome", "Negative"]
          },
          "Sticker": {
            "type": "string",
            "enum": ["None", "Eternal", "Rental", "Perishable"]
          },
          "antes": {
            "type": "array",
            "items": { "type": "integer", "minimum": 0, "maximum": 39 }
          },
          "shopSlots": {
            "type": "array",
            "items": { "type": "integer", "minimum": 0 }
          },
          "packSlots": {
            "type": "array",
            "items": { "type": "integer", "minimum": 0 }
          },
          "sources": {
            "type": "object",
            "properties": {
              "shopSlots": {
                "type": "array",
                "items": { "type": "integer", "minimum": 0 }
              },
              "packSlots": {
                "type": "array",
                "items": { "type": "integer", "minimum": 0 }
              },
              "minShopSlot": {
                "type": "integer",
                "minimum": 0
              },
              "maxShopSlot": {
                "type": "integer",
                "minimum": 0
              }
            }
          },
          "mode": { "type": "string" },
          "Clauses": { "type": "array" },
          "Antes": {
            "type": "array",
            "items": { "type": "integer", "minimum": 0, "maximum": 39 }
          }
        },
        "required": ["type"]
      }
    },
    "should": {
      "type": "array",
      "description": "Optional constraints that add to the score",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": ["Joker", "joker", "SmallBlindTag", "voucher", "SoulJoker", "Or", "And", "Tarot", "Planet", "Spectral"]
          },
          "value": { "type": "string" },
          "values": {
            "type": "array",
            "items": { "type": "string" }
          },
          "Edition": {
            "type": "string",
            "enum": ["None", "Foil", "Holographic", "Polychrome", "Negative"]
          },
          "Sticker": {
            "type": "string",
            "enum": ["None", "Eternal", "Rental", "Perishable"]
          },
          "antes": {
            "type": "array",
            "items": { "type": "integer", "minimum": 0, "maximum": 39 }
          },
          "shopSlots": {
            "type": "array",
            "items": { "type": "integer", "minimum": 0 }
          },
          "packSlots": {
            "type": "array",
            "items": { "type": "integer", "minimum": 0 }
          },
          "sources": {
            "type": "object",
            "properties": {
              "shopSlots": {
                "type": "array",
                "items": { "type": "integer", "minimum": 0 }
              },
              "packSlots": {
                "type": "array",
                "items": { "type": "integer", "minimum": 0 }
              },
              "minShopSlot": {
                "type": "integer",
                "minimum": 0
              },
              "maxShopSlot": {
                "type": "integer",
                "minimum": 0
              }
            }
          },
          "score": { "type": "number" },
          "mode": { "type": "string" },
          "Clauses": { "type": "array" },
          "Antes": {
            "type": "array",
            "items": { "type": "integer", "minimum": 0, "maximum": 39 }
          }
        },
        "required": ["type"]
      }
    },
    "mustNot": {
      "type": "array",
      "description": "Constraints that must not be satisfied",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": ["Joker", "joker", "SmallBlindTag", "voucher", "SoulJoker", "Or", "And", "Tarot", "Planet", "Spectral"]
          },
          "value": { "type": "string" },
          "values": {
            "type": "array",
            "items": { "type": "string" }
          },
          "Edition": {
            "type": "string",
            "enum": ["None", "Foil", "Holographic", "Polychrome", "Negative"]
          },
          "Sticker": {
            "type": "string",
            "enum": ["None", "Eternal", "Rental", "Perishable"]
          },
          "antes": {
            "type": "array",
            "items": { "type": "integer", "minimum": 0, "maximum": 39 }
          },
          "shopSlots": {
            "type": "array",
            "items": { "type": "integer", "minimum": 0 }
          },
          "packSlots": {
            "type": "array",
            "items": { "type": "integer", "minimum": 0 }
          },
          "sources": {
            "type": "object",
            "properties": {
              "shopSlots": {
                "type": "array",
                "items": { "type": "integer", "minimum": 0 }
              },
              "packSlots": {
                "type": "array",
                "items": { "type": "integer", "minimum": 0 }
              },
              "minShopSlot": {
                "type": "integer",
                "minimum": 0
              },
              "maxShopSlot": {
                "type": "integer",
                "minimum": 0
              }
            }
          },
          "Antes": {
            "type": "array",
            "items": { "type": "integer", "minimum": 0, "maximum": 39 }
          }
        },
        "required": ["type"]
      }
    }
  },
  "required": ["name", "deck", "stake", "must"]
};

// Helper function to fix common AI output issues
function fixCommonIssues(config) {
  // Ensure must, should, mustNot are arrays
  if (!config.must) config.must = [];
  if (!config.should) config.should = [];
  if (!config.mustNot) config.mustNot = [];

  // Set defaults if missing
  if (!config.deck) config.deck = "Red";
  if (!config.stake) config.stake = "White";
  if (!config.author) config.author = "AI Generated";

  // Fix common naming errors (underscores -> no underscores)
  const fixDeckName = (deck) => {
    return deck.replace(/_/g, '');
  };
  const fixStakeName = (stake) => {
    return stake.replace(/_/g, '');
  };

  config.deck = fixDeckName(config.deck);
  config.stake = fixStakeName(config.stake);

  // Ensure Edition is capitalized correctly
  const fixEdition = (constraint) => {
    if (constraint.Edition) {
      const edMap = {
        'none': 'None',
        'foil': 'Foil',
        'holographic': 'Holographic',
        'polychrome': 'Polychrome',
        'negative': 'Negative'
      };
      constraint.Edition = edMap[constraint.Edition.toLowerCase()] || constraint.Edition;
    }
    return constraint;
  };

  config.must = config.must.map(fixEdition);
  config.should = config.should.map(fixEdition);
  config.mustNot = config.mustNot.map(fixEdition);

  return config;
}

// Validate sticker-stake requirements
function validateStickerStakeRequirements(config) {
  const stakeOrder = ["White", "Red", "Green", "Black", "Blue", "Purple", "Orange", "Gold"];
  const currentStakeLevel = stakeOrder.indexOf(config.stake);

  const stickerRequirements = {
    "Eternal": stakeOrder.indexOf("Black"),  // Black or higher
    "Rental": stakeOrder.indexOf("Orange"),  // Orange or higher
    "Perishable": stakeOrder.indexOf("Gold") // Gold stake
  };

  // Check all constraints in must, should, mustNot
  const checkConstraints = (constraints) => {
    for (const constraint of constraints) {
      if (constraint.Sticker && constraint.Sticker !== "None") {
        const requiredLevel = stickerRequirements[constraint.Sticker];
        if (requiredLevel !== undefined && currentStakeLevel < requiredLevel) {
          const requiredStake = stakeOrder[requiredLevel];
          // Auto-upgrade stake to meet requirement
          config.stake = requiredStake;
          console.log(`Auto-upgraded stake to ${requiredStake} for ${constraint.Sticker} sticker`);
        }
      }
    }
  };

  if (config.must) checkConstraints(config.must);
  if (config.should) checkConstraints(config.should);
  if (config.mustNot) checkConstraints(config.mustNot);

  return config;
}

// Balatro knowledge base for the LLM
const BALATRO_KNOWLEDGE = {
  jokers: {
    // Economy jokers
    "Golden_Ticket": { tags: ["economy", "gold"], requires: ["The_Devil"] },
    "Business_Card": { tags: ["economy"], slang: ["money joker"] },
    "Coupon_Book": { tags: ["economy"], slang: ["coupon"] },
    "Rocket": { tags: ["economy"], slang: ["money rocket"] },
    
    // Luck/dice jokers
    "Oops_All_6s": { tags: ["luck", "dice"], slang: ["dice", "lucky joker"] },
    "Vagabond": { tags: ["tarot"], slang: ["tarot joker"] },
    
    // Multiplier jokers
    "Ride_the_Bus": { tags: ["mult"], slang: ["bus"] },
    "Loyalty_Card": { tags: ["mult"], slang: ["loyalty"] },
    "Wee_Joker": { tags: ["mult"], slang: ["wee", "small joker"] },
    
    // Special jokers
    "Blueprint": { tags: ["copy"], slang: ["copier", "blueprint"] },
    "Brainstorm": { tags: ["copy"], slang: ["brain"] },
    "Baseball_Card": { tags: ["uncommon"], slang: ["baseball"] }
  },
  
  tarots: {
    "The_Devil": { tags: ["enhancement", "gold"] },
    "The_World": { tags: ["enhancement", "planet"] },
    "The_Fool": { tags: ["copy"] }
  },
  
  slangMap: {
    "dice": "Oops_All_6s",
    "lucky": "Oops_All_6s",
    "money": ["Golden_Ticket", "Business_Card", "Coupon_Book"],
    "econ": ["Golden_Ticket", "Business_Card", "Coupon_Book", "Rocket"],
    "economy": ["Golden_Ticket", "Business_Card", "Coupon_Book", "Rocket"],
    "wee": "Wee_Joker",
    "bus": "Ride_the_Bus",
    "blueprint": "Blueprint",
    "copier": "Blueprint",
    "brain": "Brainstorm"
  }
};

// Few-shot examples to teach the LLM
const FEW_SHOT_EXAMPLES = [
  {
    prompt: "I want Wee Joker and good economy on Blue deck",
    output: {
      "name": "Wee Economy",
      "description": "Blue deck with Wee Joker and economy jokers",
      "author": "AI Generated",
      "deck": "Blue",
      "stake": "White",
      "must": [
        {"type": "Joker", "value": "WeeJoker", "Edition": "None", "antes": [1,2,3,4], "shopSlots": [0,1,2,3,4]},
        {"type": "Joker", "values": ["GoldenTicket", "BusinessCard", "CouponBook"], "Edition": "None", "antes": [1,2,3], "shopSlots": [0,1,2]}
      ],
      "should": [],
      "mustNot": []
    }
  },
  {
    prompt: "Blueprint and Baron combo by ante 4",
    output: {
      "name": "Blueprint Baron",
      "description": "Find Blueprint and Baron combo early",
      "author": "AI Generated",
      "deck": "Red",
      "stake": "White",
      "must": [
        {"type": "Joker", "value": "Blueprint", "Edition": "None", "antes": [1,2,3,4], "shopSlots": [0,1,2,3,4]},
        {"type": "Joker", "value": "Baron", "Edition": "None", "antes": [1,2,3,4], "shopSlots": [0,1,2,3,4]}
      ],
      "should": [],
      "mustNot": []
    }
  }
];

// System prompt for the LLM (optimized for coder models)
const SYSTEM_PROMPT = `You are a JSON config generator for Balatro Seed Oracle. Generate valid JSON matching the schema below.

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanations, no comments
2. Use PascalCase for all joker names: Blueprint, HangingChad, OopsAll6s, WeeJoker
3. Decks: Red, Blue, Yellow, Green, Black, Magic, Nebula, Ghost, Abandoned, Checkered, Zodiac, Painted, Anaglyph, Plasma, Erratic
4. Stakes: White, Red, Green, Black, Blue, Purple, Orange, Gold
5. Editions: None, Foil, Holographic, Polychrome, Negative
6. Stickers: None, Eternal, Rental, Perishable
7. Antes range from 0 to 39 (0 = pre-run shop)
8. Use "Sources": {} block after "Antes" to specify shopSlots, packSlots, or minShopSlot/maxShopSlot

STICKER REQUIREMENTS (auto-enforced):
- Eternal sticker requires Black stake or higher
- Rental sticker requires Orange stake or higher
- Perishable sticker requires Gold stake

SLANG TRANSLATIONS:
- "dice" → OopsAll6s
- "wee" → WeeJoker
- "bus" → RideTheBus
- "econ"/"economy" → GoldenTicket, BusinessCard, CouponBook, Rocket
- "blueprint" → Blueprint
- "brain" → Brainstorm

OPERATORS:
- Use "Or" operator for any-of conditions
- Use "And" operator for all-of conditions (nested constraints)

SCHEMA:
{
  "name": "string",
  "description": "string",
  "author": "AI Generated",
  "deck": "Red",
  "stake": "White",
  "must": [
    {
      "type": "Joker",
      "value": "JokerName",
      "Edition": "None",
      "Sticker": "None",
      "Antes": [0,1,2,3],
      "Sources": {
        "shopSlots": [0,1,2],
        "minShopSlot": 0,
        "maxShopSlot": 5
      }
    }
  ],
  "should": [],
  "mustNot": []
}

EXAMPLES:
Input: "Wee Joker and good economy on Blue deck"
Output: ${JSON.stringify(FEW_SHOT_EXAMPLES[0].output)}

Input: "Blueprint and Baron combo by ante 4"
Output: ${JSON.stringify(FEW_SHOT_EXAMPLES[1].output)}`;

// HTML interface
const HTML_INTERFACE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🧞 Ouija Genie - Balatro Seed Config Generator</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
        }

        body {
            font-family: 'Silkscreen', monospace;
            background: #0f1419;
            background-image: 
                repeating-linear-gradient(
                    0deg,
                    rgba(0, 255, 0, 0.03) 0px,
                    transparent 1px,
                    transparent 2px,
                    rgba(0, 255, 0, 0.03) 3px
                );
            color: #e8dcc4;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            animation: scanlines 8s linear infinite;
        }

        @keyframes scanlines {
            0% { background-position: 0 0; }
            100% { background-position: 0 10px; }
        }

        .container {
            max-width: 800px;
            width: 100%;
            flex: 1;
        }

        h1 {
            font-size: 48px;
            text-align: center;
            margin-bottom: 8px;
            color: #ffd700;
            text-shadow: 
                2px 2px 0 #ff6b6b,
                4px 4px 0 #4ecdc4,
                6px 6px 10px rgba(0,0,0,0.5);
            animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }

        .tagline {
            text-align: center;
            color: #8b9dc3;
            font-size: 14px;
            margin-bottom: 32px;
        }

        .card {
            background: #1a1f29;
            border: 3px solid #2a3441;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 
                0 4px 0 #0a0d11,
                0 8px 16px rgba(0,0,0,0.5);
            position: relative;
            overflow: hidden;
        }

        .card::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #ffd700, #ff6b6b);
            border-radius: 12px;
            opacity: 0;
            z-index: -1;
            transition: opacity 0.3s;
        }

        .card:hover::before {
            opacity: 0.3;
        }

        .card-title {
            color: #4ecdc4;
            font-size: 18px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .card-title::before {
            content: '♠';
            color: #ff6b6b;
        }

        .example-chip {
            background: #2a3441;
            border: 2px solid #3a4451;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 13px;
        }

        .example-chip:hover {
            transform: translateX(8px);
            border-color: #4ecdc4;
            box-shadow: -4px 0 0 #ff6b6b;
        }

        textarea {
            width: 100%;
            background: #0a0d11;
            border: 3px solid #2a3441;
            border-radius: 8px;
            padding: 16px;
            color: #e8dcc4;
            font-family: 'Silkscreen', monospace;
            font-size: 14px;
            resize: vertical;
            min-height: 120px;
        }

        textarea:focus {
            outline: none;
            border-color: #4ecdc4;
            box-shadow: 0 0 0 3px rgba(78, 205, 196, 0.2);
        }

        .button {
            width: 100%;
            background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
            color: #0a0d11;
            border: none;
            border-radius: 8px;
            padding: 16px;
            font-family: 'Silkscreen', monospace;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            margin-top: 16px;
            text-transform: uppercase;
            letter-spacing: 1px;
            position: relative;
            box-shadow: 
                0 4px 0 #c44545,
                0 8px 16px rgba(0,0,0,0.3);
            transition: all 0.1s;
        }

        .button:hover {
            transform: translateY(2px);
            box-shadow: 
                0 2px 0 #c44545,
                0 4px 8px rgba(0,0,0,0.3);
        }

        .button:active {
            transform: translateY(4px);
            box-shadow: none;
        }

        .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .result {
            display: none;
        }

        .result.show {
            display: block;
        }

        .status {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            margin-bottom: 16px;
            font-weight: 700;
            text-transform: uppercase;
        }

        .status.valid {
            background: #52c41a;
            color: #0a0d11;
            box-shadow: 0 2px 0 #3a8f0f;
        }

        .status.invalid {
            background: #ff4d4f;
            color: #fff;
            box-shadow: 0 2px 0 #cc3333;
        }

        pre {
            background: #0a0d11;
            border: 2px solid #2a3441;
            border-radius: 8px;
            padding: 16px;
            overflow-x: auto;
            font-size: 12px;
            line-height: 1.6;
            tab-size: 2;
        }

        .error {
            background: #ff4d4f;
            color: #fff;
            padding: 16px;
            border-radius: 8px;
            margin-top: 16px;
            box-shadow: 0 4px 0 #cc3333;
        }

        .footer {
            margin-top: auto;
            padding-top: 48px;
            text-align: center;
            font-size: 12px;
            color: #6c7785;
            line-height: 1.8;
        }

        .footer a {
            color: #4ecdc4;
            text-decoration: none;
            border-bottom: 2px solid transparent;
            transition: border-color 0.2s;
        }

        .footer a:hover {
            border-bottom-color: #4ecdc4;
        }

        .suit-icons {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin: 24px 0;
            font-size: 32px;
        }

        .suit-icons span {
            animation: bounce 2s ease-in-out infinite;
        }

        .suit-icons span:nth-child(1) { animation-delay: 0s; color: #ff0000; }
        .suit-icons span:nth-child(2) { animation-delay: 0.2s; color: #ff8c00; }
        .suit-icons span:nth-child(3) { animation-delay: 0.4s; color: #000; }
        .suit-icons span:nth-child(4) { animation-delay: 0.6s; color: #000; }

        @keyframes bounce {
            0%, 100% { transform: translateY(0) rotate(0); }
            50% { transform: translateY(-20px) rotate(180deg); }
        }

        @media (max-width: 600px) {
            h1 { font-size: 32px; }
            .card { padding: 16px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧞 Ouija Genie</h1>
        <p class="tagline">Natural language → Balatro seed configs</p>
        
        <div class="suit-icons">
            <span>♥</span>
            <span>♦</span>
            <span>♣</span>
            <span>♠</span>
        </div>

        <div class="card">
            <h3 class="card-title">Example Prompts</h3>
            <div class="example-chip" onclick="setPrompt('I want seeds with Wee Joker and good economy')">
                "I want seeds with Wee Joker and good economy"
            </div>
            <div class="example-chip" onclick="setPrompt('Find me dice joker on Blue Deck with Gold Stake')">
                "Find me dice joker on Blue Deck with Gold Stake"
            </div>
            <div class="example-chip" onclick="setPrompt('I need Blueprint and Baron combo by ante 4')">
                "I need Blueprint and Baron combo by ante 4"
            </div>
            <div class="example-chip" onclick="setPrompt('Lucky joker with negative tags on Anaglyph deck')">
                "Lucky joker with negative tags on Anaglyph deck"
            </div>
        </div>

        <div class="card">
            <h3 class="card-title">Your Seed Request</h3>
            <textarea id="prompt" placeholder="Describe the seeds you're looking for..."></textarea>
            <button class="button" id="generate" onclick="generateConfig()">
                ✨ Generate Config
            </button>
        </div>

        <div id="result" class="card result">
            <h3 class="card-title">Generated Config</h3>
            <div id="resultContent"></div>
        </div>
    </div>

    <footer class="footer">
        <p>Not affiliated with LocalThunk or Playstack</p>
        <p><a href="https://www.playbalatro.com/" target="_blank">Buy Balatro</a> • Created with ♥ for the Balatro community</p>
    </footer>

    <script>
        function setPrompt(text) {
            document.getElementById('prompt').value = text;
        }

        async function generateConfig() {
            const prompt = document.getElementById('prompt').value;
            const button = document.getElementById('generate');
            const result = document.getElementById('result');
            const resultContent = document.getElementById('resultContent');
            
            if (!prompt.trim()) {
                alert('Please enter a seed description!');
                return;
            }
            
            button.disabled = true;
            button.textContent = '🎰 Generating...';
            
            try {
                const response = await fetch('/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    resultContent.innerHTML = \`
                        <span class="status \${data.valid ? 'valid' : 'invalid'}">
                            \${data.valid ? '✓ Valid Config' : '✗ Invalid Config'}
                        </span>
                        <pre>\${JSON.stringify(data.config, null, 2)}</pre>
                        \${data.errors ? \`<div class="error">Errors: \${JSON.stringify(data.errors)}</div>\` : ''}
                    \`;
                    result.classList.add('show');
                } else {
                    resultContent.innerHTML = \`<div class="error">Error: \${data.error || 'Unknown error'}</div>\`;
                    result.classList.add('show');
                }
            } catch (error) {
                resultContent.innerHTML = \`<div class="error">Network error: \${error.message}</div>\`;
                result.classList.add('show');
            } finally {
                button.disabled = false;
                button.textContent = '✨ Generate Config';
            }
        }
        
        // Enter key support
        document.getElementById('prompt').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                generateConfig();
            }
        });
    </script>
</body>
</html>`;

// Main worker
export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Serve HTML interface on GET
    if (request.method === 'GET' && new URL(request.url).pathname === '/') {
      return new Response(HTML_INTERFACE, {
        headers: {
          'Content-Type': 'text/html',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY'
        }
      });
    }

    // Only allow POST for /generate
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Only POST allowed' }), { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    try {
      // Parse request
      const { prompt } = await request.json();
      
      if (!prompt || typeof prompt !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid prompt' }), { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      // Call AI with optimized model and parameters
      const ai = new Ai(env.AI);

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt } // Direct prompt, no extra text
      ];

      // Using Qwen2.5-Coder-32B - excellent for structured JSON output
      const response = await ai.run('@cf/qwen/qwen2.5-coder-32b-instruct', {
        messages,
        temperature: 0.1, // Very low for consistent JSON
        max_tokens: 1000  // Limit output for speed
      });

      // Parse LLM response with better extraction
      let config;
      try {
        const llmOutput = response.response || response;

        // Try to extract JSON (handle markdown code blocks, extra text, etc.)
        let jsonStr = llmOutput;

        // Remove markdown code blocks if present
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        // Extract JSON object (greedy match)
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON object found in response');
        }

        config = JSON.parse(jsonMatch[0]);

        // Post-process: Fix common issues
        config = fixCommonIssues(config);

        // Validate and auto-upgrade stake for sticker requirements
        config = validateStickerStakeRequirements(config);

      } catch (e) {
        return new Response(JSON.stringify({
          error: 'Failed to parse LLM output',
          details: e.message,
          llm_response: response.response || response
        }), {
          status: 500,
          headers: corsHeaders
        });
      }

      // Validate against schema
      const ajv = new Ajv();
      const validate = ajv.compile(OUIJA_SCHEMA);
      const valid = validate(config);

      // Return response
      const result = { 
        config, 
        valid,
        errors: valid ? null : validate.errors 
      };

      return new Response(JSON.stringify(result), { 
        headers: corsHeaders 
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },
};