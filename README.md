# ✈️ FF Urdu Name Converter

**Type your Urdu name normally — get a Free Fire nickname with the letters properly joined.**

[![Live](https://img.shields.io/badge/Live-ffurduname.tsunstudio.cyou-0071e3)](https://ffurduname.tsunstudio.cyou)
![Node](https://img.shields.io/badge/Node-%3E%3D18-339933)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![License](https://img.shields.io/badge/License-MIT-yellow)

### 🌐 Live: **[ffurduname.tsunstudio.cyou](https://ffurduname.tsunstudio.cyou)**

---

## The problem

Free Fire renders nicknames strictly **left-to-right** and does **not** shape Arabic-script text. Paste a normal Urdu name and the game shows it:

- **reversed**, and
- with every letter in its **isolated** form — `ج ہ ا ز` instead of `جہاز`.

The popular "Photoshop trick" fixes the reversal but still exports every letter in its isolated form, so words never actually join.

## How this fixes it

For every letter, the converter looks at its neighbours inside the word and picks the form Urdu calligraphy actually requires:

| Form | When it's used |
|---|---|
| **Initial** | starts a joined run |
| **Medial** | joins on both sides |
| **Final** | ends a joined run |
| **Isolated** | stands alone — including letters like `ا`, `آ`, `ز` that *never* join forward (their gaps are correct Urdu, not a bug) |

The shaped result is then stored in **visual order** (words and letters reversed), and words are joined with `U+FFA0` — an invisible filler Free Fire accepts as a space. A naive left-to-right renderer now draws the name exactly as it should be read.

**Example**

| | |
|---|---|
| Input | `تھک آلہ جہاز` |
| Photoshop-style output | `ﺯﺍہﺝﾠہﻝﺁﾠکھﺕ` — letters still separate |
| **This converter** | `ﺯﺎﮩﺟﾠﮧﻟﺁﾠﮏﮭﺗ` — `جـہـا`, `لـہ`, `تـھـک` joined, exactly 12 characters |

![Comparison: Photoshop-style output vs this converter](https://ffurduname.tsunstudio.cyou/preview.png)

## Features

- ✅ Correct joining (initial / medial / final / isolated) for Urdu **and** Arabic letters
- ✅ **Original Urdu letters**, always — (`ہ`, `ھ`, `ک`) in their joined Forms-A shapes, no settings to fiddle with
- ✅ Words always joined with the **hidden FF space** (`U+FFA0`) automatically
- ✅ **12-character limit** indicator with warnings (over-limit, stripped vowel marks, unsupported letters)
- ✅ Letter-by-letter breakdown of every form chosen
- ✅ Zero dependencies — plain Node.js, runs anywhere
- ✅ A small JSON **API** for bots and other apps

## Run locally

```bash
git clone https://github.com/SaeedX302/FF-Urdu-Name-Converter.git
cd FF-Urdu-Name-Converter
npm start          # → http://127.0.0.1:20348
npm test           # converter test suite (node:test)
```

No `npm install` needed — there are no dependencies.

## API

```http
POST /api/convert
Content-Type: application/json

{ "text": "تھک آلہ جہاز", "mode": "urdu", "separator": "filler" }
```

```json
{
  "output": "ﺯﺎﮩﺟﾠﮧﻟﺁﾠﮏﮭﺗ",
  "charCount": 12,
  "limit": 12,
  "overLimit": false,
  "words": [ … per-word, per-letter form breakdown … ],
  "warnings": []
}
```

- Optional `mode`: `"urdu"` (default) or `"safe"` (Urdu-only letters swapped for plain Arabic ones, for fonts that would show a box `□`)
- Optional `separator`: `"filler"` (default, `U+FFA0`), `"space"`, or `"none"`
- `GET /api/health` → `{ "ok": true }`

## Project structure

```
├── server.js              # zero-dependency HTTP server (static + API)
├── lib/
│   ├── convert.js         # the shaping / reversing engine
│   └── forms.json         # letter → presentation forms, generated from Unicode data
├── public/                # Dark-chocolate terminal frontend (Android + desktop) with a generative ASCII plasma hero
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── test/convert.test.js   # node:test suite incl. verified sample names
├── tools/generate-forms.py# regenerates lib/forms.json from unicodedata
├── ecosystem.config.js    # PM2 process file
└── deploy/
    └── nginx.conf.example # reverse-proxy vhost example
```

## Deployment

The live site runs on a VPS under PM2 behind nginx with a Let's Encrypt certificate:

```bash
pm2 start ecosystem.config.js && pm2 save
```

See `deploy/nginx.conf.example` for the vhost (`ffurduname.tsunstudio.cyou` → `127.0.0.1:20348`).

## Notes

- Don't retype the output — copy-paste it. Some apps will *display* it flipped because they shape Urdu right-to-left; the stored order is what Free Fire needs, so always trust the game's own preview.
- Vowel marks (zabar, zer, pesh…) are stripped — FF nicknames don't carry them.

## Credits

The hero's animated ASCII field follows the **ascii-animation** skill from
[iart-ai/web-animation-skills](https://github.com/iart-ai/web-animation-skills/tree/main/skills/ascii-animation):
brightness ramp ` .:-=+*#%@`, layered-sine plasma, character-cell aspect correction,
a deliberately throttled 18 fps loop, a `?t=N` deterministic seek frame, and a static
frame under `prefers-reduced-motion`.

## License

MIT © TSun Studio

> Not affiliated with Garena. Free Fire is a trademark of Garena.
