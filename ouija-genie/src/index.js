// Cloudflare Worker for Balatro Seed Oracle Config Generator
import Ajv from 'ajv';
import { Ai } from '@cloudflare/ai';

// Schema definition 
const OUIJA_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Ouija Configuration Schema",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "description": { "type": "string" },
    "author": { "type": "string" },
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "filter_config": {
      "type": "object",
      "properties": {
        "deck": {
          "type": "string",
          "enum": ["Red_Deck", "Blue_Deck", "Yellow_Deck", "Green_Deck", "Black_Deck", "Magic_Deck", "Nebula_Deck", "Ghost_Deck", "Abandoned_Deck", "Checkered_Deck", "Zodiac_Deck", "Painted_Deck", "Anaglyph_Deck", "Plasma_Deck", "Erratic_Deck"]
        },
        "stake": {
          "type": "string",
          "enum": ["White_Stake", "Red_Stake", "Green_Stake", "Black_Stake", "Blue_Stake", "Purple_Stake", "Orange_Stake", "Gold_Stake"]
        },
        "maxSearchAnte": { "type": "integer", "minimum": 1, "maximum": 16, "default": 8 },
        "startAnte": { "type": "integer", "minimum": 1, "maximum": 16, "default": 1 },
        "scoreNaturalNegatives": { "type": "boolean", "default": false },
        "scoreDesiredNegatives": { "type": "boolean", "default": false },
        "jokersPerAnte": { "type": "integer", "minimum": 1, "maximum": 16, "default": 4 },
        "shopSkipCount": { "type": "integer", "minimum": 0, "maximum": 8, "default": 2 },
        "searchNegativeTags": { "type": "boolean", "default": false },
        "searchPacks": { "type": "boolean", "default": false },
        "countNegativeEditions": { "type": "boolean", "default": false },
        "useDeepSearch": { "type": "boolean", "default": false },
        "deepSearchWindow": { "type": "integer", "minimum": 1, "maximum": 16, "default": 8 },
        "deepSearchSlide": { "type": "integer", "minimum": 1, "maximum": 8, "default": 2 },
        "deepSearchTotal": { "type": "integer", "minimum": 1, "maximum": 16, "default": 16 },
        "numNeeds": { "type": "integer", "minimum": 0, "maximum": 32 },
        "numWants": { "type": "integer", "minimum": 0, "maximum": 32 },
        "Needs": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "value": { "type": "string" },
              "jokeredition": { "type": "string", "enum": ["No_Edition", "Foil", "Holographic", "Polychrome", "Negative"], "default": "No_Edition" },
              "desireByAnte": { "type": "integer", "minimum": 1, "maximum": 16, "default": 8 },
              "minMatches": { "type": "integer", "minimum": 1, "default": 1 },
              "searchAntes": { "type": "array", "items": { "type": "integer", "minimum": 1, "maximum": 16 }, "uniqueItems": true, "default": [1,2,3,4,5,6,7,8] }
            },
            "required": ["value"]
          }
        },
        "Wants": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "value": { "type": "string" },
              "jokeredition": { "type": "string", "enum": ["No_Edition", "Foil", "Holographic", "Polychrome", "Negative"], "default": "No_Edition" },
              "desireByAnte": { "type": "integer", "minimum": 1, "maximum": 16, "default": 8 },
              "searchAntes": { "type": "array", "items": { "type": "integer", "minimum": 1, "maximum": 16 }, "uniqueItems": true, "default": [1,2,3,4,5,6,7,8] }
            },
            "required": ["value"]
          }
        }
      },
      "required": ["deck", "stake"]
    },
    "anaglyph_config": {
      "type": "object",
      "properties": {
        "searchAntes": { "type": "array", "items": { "type": "integer", "minimum": 1, "maximum": 16 }, "uniqueItems": true, "default": [8] },
        "searchWindow": { "type": "integer", "minimum": 1, "maximum": 16, "default": 8 }
      }
    }
  },
  "required": ["name", "filter_config"]
};

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

// System prompt for the LLM
const SYSTEM_PROMPT = `You are a config generator for the Balatro Seed Oracle. Given a natural language prompt, generate a valid JSON config file that matches the ouija.json schema.

Rules:
- Only use real Balatro items from the provided list
- Respect item synergies and prerequisites
- Translate slang (e.g. "dice" → "Oops_All_6s")
- Avoid made-up items or mechanics
- Default to Red_Deck and White_Stake if not specified
- If a user asks for "good econ", prioritize jokers like "Golden_Ticket", "Business_Card", or "Coupon_Book"
- If a joker requires a tarot card (e.g. "Golden_Ticket" needs "The Devil"), include that in Needs
- Generate a descriptive name and description based on the prompt
- Set reasonable defaults for search parameters

Knowledge base: ${JSON.stringify(BALATRO_KNOWLEDGE)}

Return ONLY the JSON config, no explanation.`;

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

      // Call AI
      const ai = new Ai(env.AI);
      
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Generate a config for: ${prompt}` }
      ];

      const response = await ai.run('@cf/meta/llama-3-8b-instruct', { 
        messages,
        temperature: 0.3 // Lower temperature for more consistent JSON
      });

      // Parse LLM response
      let config;
      try {
        // Extract JSON from response (handle if LLM adds extra text)
        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        config = JSON.parse(jsonMatch[0]);
      } catch (e) {
        return new Response(JSON.stringify({ 
          error: 'Invalid JSON from LLM', 
          llm_response: response.response 
        }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }

      // Auto-calculate numNeeds and numWants
      if (config.filter_config) {
        if (config.filter_config.Needs) {
          config.filter_config.numNeeds = config.filter_config.Needs.length;
        }
        if (config.filter_config.Wants) {
          config.filter_config.numWants = config.filter_config.Wants.length;
        }
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