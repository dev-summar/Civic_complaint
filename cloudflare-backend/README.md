# 🌐 SwachhSetu — 100% Free Cloudflare Worker Backend

This is the Cloudflare native backend for **SwachhSetu – Geo-Tagged Citizen Grievance & Civic Response Platform**, powered by:
- **Framework**: [Hono](https://hono.dev/)
- **Runtime**: Cloudflare Workers (Edge V8)
- **Database**: Cloudflare D1 (Serverless SQLite)
- **Real-Time**: Cloudflare Durable Objects (WebSockets)
- **Auth**: Native Web Crypto JWT (0 external dependencies)

---

## 🚀 How to Deploy to Your Cloudflare Account (100% Free)

### Step 1: Login to Cloudflare
From your terminal, run:
```bash
cd cloudflare-backend
npx wrangler login
```
*(A browser window will open — just click "Allow" to connect your free Cloudflare account).*

---

### Step 2: Create Your Free D1 Database on Cloudflare
```bash
npx wrangler d1 create swachhsetu-db
```
This will print output like:
```toml
[[d1_databases]]
binding = "DB"
database_name = "swachhsetu-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
Copy that `database_id` and replace `"local-swachhsetu-db"` in `wrangler.toml`.

---

### Step 3: Run Remote Migrations & Seed
```bash
npx wrangler d1 execute swachhsetu-db --remote --file=./schema.sql
npx wrangler d1 execute swachhsetu-db --remote --file=./seed.sql
```

---

### Step 4: Deploy the Worker
```bash
npx wrangler deploy
```

You will get your live production API URL:
👉 **`https://swachhsetu-api.<your-subdomain>.workers.dev`**

Health check:
`https://swachhsetu-api.<your-subdomain>.workers.dev/health`

---

## 💻 Local Development
To run locally:
```bash
npm run db:init
npm run db:seed
npm run dev
```
Local API: `http://localhost:8787`

### Voice secrets (Kashmiri / Dogri)
Copy `.dev.vars.example` → `.dev.vars` and fill:

| Secret | Use |
| --- | --- |
| `BHASHINI_INFERENCE_API_KEY` | Kashmiri/Dogri **ASR** via Bhashini Dhruva (`Authorization` header from Udyat app) |
| `GEMINI_API_KEY` | Kashmiri/Dogri **TTS** via Gemini (`gemini-3.1-flash-tts-preview`, fallbacks `3.8-flash-lite` / `2.5-flash-preview-tts`) |
| `VOICE_API_KEY` | MIET Setu TTS for English / Hindi / Urdu (and Gemini fallback) |

**Realtime path:** citizen mic → `/ai/transcribe` (Bhashini for ks/doi) → chat → `/ai/speak` (Gemini Setu voice). Dual male/female voices in demo videos are mock-only; in-app only Setu is TTS.

Production (reads `.dev.vars`, never prints values):
```bash
npm run secrets:voice
npx wrangler deploy
```

**Gemini billing:** enable pay-as-you-go on the Google AI Studio / Cloud project for `GEMINI_API_KEY`. Free-tier TTS daily caps will drop production voice under load — [AI Studio rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) / [billing](https://aistudio.google.com/apikey).

## Complaint workflow pilot

The mobile app's **Report by chat** supports English, Hindi and Hinglish. It fills the existing report form so the citizen can edit the draft, confirm the map pin and add a photo before filing. Tracking in chat uses the citizen's actual complaint records.

Set up a pilot on a separate Worker and D1 database before enabling dispatch on a live ward. Use existing department, zone and staff IDs. The Worker creates the workflow tables on first use. Existing complaints keep their previous tracking.

1. As an administrator, send `PUT /api/v1/routing-rules/staff/{userId}` with `{"zoneId":"…","departmentId":"…"}` for the ward officer and each eligible field worker.
2. Send `PUT /api/v1/routing-rules` with `zoneId`, `departmentId`, `category`, `officerId`, `supervisorId`, and numeric `south`, `west`, `north`, `east` bounds. The supervisor must be a different active administrator or department officer. Each ward can have one rule per category. Avoid overlapping rectangles for the same category.
3. Start with `autoAssign: false` to show the suggested worker in the officer queue. Set it to `true` on individual rules once staff have checked the recommendations. Missing routes, overlapping boundaries, unavailable AI and ambiguous classifications go to manual review.

Pilot assignment and resolution targets are 2 and 24 hours for High, 8 and 48 hours for Medium, and 24 and 72 hours for Low. Existing Critical priority is supported with targets of 1 and 4 hours. The Worker checks deadlines every five minutes. An assignment breach escalates to the supervisor after two hours, and a resolution breach after four. Citizen confirmation is requested on resolution and reminded after 24 hours. Alerts appear in the in-app notification inbox. Reopening starts a new deadline cycle.
