# Fashion AI Stylist

A full-stack web app that recommends outfits (Indian ethnic wear, global fashion,
and Indo-Western fusion) based on body build, skin tone, age group, and occasion —
detected from a photo or entered manually.

## Dataset size & result variety (added on request)

- **Expanded from 16 to 47 outfits** across all three categories (22 Indian
  ethnic, 17 global, 8 Indo-Western), covering more regional Indian styles
  (Kanjivaram, Bandhani/Chaniya Choli, Mekhela Chador, Pheran, Phulkari,
  Jodhpuri, Sambalpuri, and more), more global formal/casual pieces, and
  more fusion looks — so more body-type/occasion/age combinations get a
  genuinely good match instead of falling back to the same few outfits.
- **Result rotation** (`get_top_matches(..., diversify=True)` in
  `recommender.py`) — when multiple outfits score within the same 0.5-point
  band, they're shuffled before picking the top N. This means the *same*
  profile submitted twice can surface different (equally valid) outfits
  instead of robotically repeating the identical 3 every time, while a
  genuinely better match is never bumped below a worse one — only real
  ties/near-ties rotate. Verified with a live test: calling `/recommend`
  five times with an identical profile returned five different top-3 sets.
  Pass `diversify=False` for fully deterministic output (used in tests).

## Reliability, security & real shopping (added on request)

- **Automated tests** (`backend/tests/`) — 19 tests covering the scoring
  logic and every endpoint's happy path AND fail-soft behavior, runnable
  without any API keys (`pytest tests/ -v`). CI-safe: no network calls, no
  credits spent.
- **Rate limiting** (via `slowapi`) — every LLM/search-backed endpoint is
  capped per client IP (`/recommend` 30/min, `/search-outfits` `/trends`
  `/shop` 10/min, `/chat` 15/min) so a single client can't exhaust your
  Claude/Gemini quota or hammer the free search API. Returns a clean 429,
  not a crash.
- **`/shop`** (`backend/shopping_search.py`) — finds **real, live** shopping
  links for a recommended outfit via an actual web search (no fabricated
  URLs, prices, or "in stock" claims). Returns whatever real pages come
  back, same as if you'd searched yourself — including an honest empty list
  if nothing useful turns up, rather than inventing something. Uses the
  `ddgs` package (the current name; it was renamed from `duckduckgo_search`).

## Two modes, on purpose

This app ships with **both** a fixed pipeline and a real autonomous agent,
side by side, so the difference is visible rather than theoretical:

| | **Guided form (bot/pipeline)** | **Chat with an agent** |
|---|---|---|
| Flow | Fixed: photo/form → dataset match → optional narration, every time | The LLM decides each turn: ask a question, run structured match, run semantic search, or check trends |
| Predictability | High — same input always takes the same path | Lower — the agent may take a different path each time |
| Endpoint | `/recommend` | `/chat` |
| Backing code | `recommender.py` (pure functions, no LLM in the decision loop) | `conversational_agent.py` (LangChain tool-calling agent with a real decide-act-observe loop) |

The chat agent is given three tools (`structured_outfit_match`,
`semantic_outfit_search`, `web_trend_search`) and decides for itself which
to call, based on what's actually been said in the conversation — including
asking a clarifying question first if it doesn't have enough information,
rather than following a fixed script.

## How it works

```
┌─────────────────────────────┐        ┌───────────────────────────────┐
│         Frontend            │        │            Backend              │
│  React + Vite                │        │  FastAPI                        │
│                              │  POST  │                                  │
│  • Photo upload              │ ─────► │  /recommend                      │
│  • MediaPipe Pose Landmarker │  JSON  │  1. Rule-based scoring engine    │
│    (body proportions)        │        │     over curated outfit dataset │
│  • k-means clustering (JS)   │        │     (outfits.json) — decides     │
│    (skin tone from face)     │ ◄───── │     WHICH outfits match          │
│  • Manual override form      │  JSON  │  2. Claude (optional) — writes   │
└─────────────────────────────┘        │     a fresh narrative + styling  │
                                        │     tips on top of the matches   │
                                        └───────────────────────────────┘
```

**Two different kinds of "AI" here, used for different jobs:**

- **MediaPipe + k-means** decide *what the user looks like* (body proportions,
  skin tone) — narrow, deterministic, on-device tasks well suited to a
  pretrained vision model and a clustering algorithm.
- **The rule-based scorer** decides *which outfits match* — kept transparent
  and debuggable on purpose, not an LLM call, so every match is explainable.
- **Claude or Gemini (LLM, your choice)** is layered on top, optionally, to turn
  the already-decided matches into natural, non-repetitive language, and to
  add practical styling tips (accessories, footwear, hairstyle) that aren't
  practical to hand-write for every outfit × profile combination in the
  dataset. Neither model re-ranks or second-guesses the rule-based matches —
  they only narrate them. Switch providers with `AI_PROVIDER=claude` or
  `AI_PROVIDER=gemini` in `backend/.env`. **Gemini has a free tier** (Google
  AI Studio, no credit card) if you'd rather not use a paid key.

**Why this architecture, honestly:**

- **MediaPipe Pose Landmarker** runs *in the browser* on a real pretrained model —
  no training needed, no photo ever leaves the device. It gives shoulder/hip
  landmark positions, which `lib/bodyAnalysis.js` turns into a body-type estimate
  (athletic / pear / hourglass / rectangle / etc.) using proportion ratios.
- **k-means clustering** (`lib/kmeans.js`) is a real, from-scratch implementation —
  it clusters sampled pixels from the estimated face region and picks the largest
  cluster as the dominant skin color, then maps it to fair / wheatish / dusky by
  luminance.
- **The recommendation engine** is intentionally **rule-based over a curated,
  richly-tagged dataset** rather than a trained deep model. Training a real
  DeepFashion/Polyvore-scale recommender needs GPU infrastructure, licensed
  dataset access, and days of training — not realistic to fabricate. A
  transparent, explainable scoring function over good data gives the user the
  same outcome (personalized picks with real reasoning) without pretending to
  be something it isn't. `backend/main.py`'s `score_outfit()` is fully readable —
  every point in the score is explainable, unlike a black-box model.
- Users can always **override any detected value** in the form — detection is a
  starting point, not a verdict.

## Project structure

```
fashion-ai-stylist/
├── backend/
│   ├── main.py                FastAPI app + endpoints (rate-limited)
│   ├── recommender.py         Shared rule-based scoring (used by /recommend AND the agent's tool)
│   ├── stylist_ai.py          LLM narration layer (Claude or Gemini)
│   ├── rag_engine.py          Semantic search via embeddings (RAG)
│   ├── trend_agent.py         Single-purpose LangChain agent (trend lookup for one outfit)
│   ├── conversational_agent.py  Full chat agent — decides which tool to call each turn
│   ├── shopping_search.py     Real, live shopping link search (no fabricated products)
│   ├── tests/                 Pytest suite — 19 tests, no API keys needed
│   ├── requirements.txt
│   └── data/
│       └── outfits.json       Curated, tagged outfit dataset
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── index.css
    │   ├── components/
    │   │   ├── PhotoCapture.jsx     MediaPipe + k-means pipeline
    │   │   ├── ProfileForm.jsx      Manual input / override
    │   │   └── Recommendations.jsx  Results display
    │   └── lib/
    │       ├── bodyAnalysis.js      Landmarks → body type
    │       └── kmeans.js            k-means + skin tone classification
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## Running it locally

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # optional: set AI_PROVIDER + a key to enable narration
uvicorn main:app --reload --port 8000
```

Check it's up: open `http://localhost:8000/health` — should return `{"status": "ok", ...}`.

**The LLM narration layer is optional and has two provider choices:**

| Provider | Env vars | Cost |
|---|---|---|
| Claude (default) | `AI_PROVIDER=claude`, `ANTHROPIC_API_KEY=...` | Paid, get a key at [console.anthropic.com](https://console.anthropic.com) |
| Gemini | `AI_PROVIDER=gemini`, `GEMINI_API_KEY=...` | **Free tier available** — no credit card needed. Get a key at [aistudio.google.com](https://aistudio.google.com) → "Get API Key". Free tier is rate-limited (a handful of requests/minute depending on model) — fine for personal use/testing, not production-scale traffic. |

Leave both keys blank and the app works exactly as before, using only the
rule-based reasoning already written into `outfits.json`. The response's
`ai_enabled` and `ai_provider` fields tell the frontend (and you) whether
narration actually ran, and with which provider.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env       # adjust VITE_API_BASE if your backend runs elsewhere
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

### 3. Optional: semantic search + trend agent

Two more features layer on top of the core recommend flow — both are fully
optional and fail with clear error messages (not crashes) if unconfigured:

**Semantic search (RAG)** — `/search-outfits`, powered by `rag_engine.py`.
Lets users describe what they want in their own words ("something breezy for
a summer day out") instead of picking exact tags. Under the hood: each
outfit's description is embedded once (cached to
`backend/data/outfit_embeddings.json`), the query is embedded the same way,
and results are ranked by cosine similarity. Needs `GEMINI_API_KEY` (free
tier) regardless of which provider you use for narration, since Anthropic
doesn't currently offer a public embeddings endpoint.

**Trend agent** — `/trends`, powered by `trend_agent.py`, a real LangChain
**tool-using agent** (distinct from the single-shot narration calls
elsewhere). Given an outfit, it decides for itself whether searching the web
(via a free DuckDuckGo tool, no API key needed) would help answer "is this
trending right now, and how would you style it to feel current" — then
answers, citing what kind of source it drew on if it searched. This reuses
whichever `AI_PROVIDER` + key is already set for narration.

```bash
pip install -r requirements.txt   # now includes langchain + duckduckgo-search
```

## Extending this

- **Add more outfits**: append entries to `backend/data/outfits.json` following
  the existing schema (`body_types`, `skin_tones`, `occasion`, `age_groups`,
  `colors`, and the three reasoning fields).
- **Swap in a real recommendation model**: `score_outfit()` in `main.py` is the
  single place to replace with a trained model's `.predict()` call — the API
  contract (`ProfileRequest` → `RecommendationResponse`) stays the same.
- **Improve skin-tone accuracy**: consider the Monk Skin Tone scale (10 shades)
  for finer granularity than the current 3-category system, or add a manual
  color-picker fallback for users whose photo lighting is inconsistent.
- **Scale up the RAG layer**: if the outfit dataset grows past a few hundred
  entries, swap the JSON-cache + cosine-similarity approach in `rag_engine.py`
  for a real vector database (Chroma, Pinecone) — the `semantic_search()`
  function signature can stay the same.
- **Deploy**: the backend is a standard FastAPI app (deployable to Render,
  Railway, Fly.io, etc.); the frontend is a static Vite build deployable to
  Vercel, Netlify, or any static host — just set `VITE_API_BASE` to your
  deployed backend URL at build time.
