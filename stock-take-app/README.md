# Stock Take — Voice-Driven Inventory Counting

Cross-platform mobile app (iOS + Android) for hands-free stock-taking in **hospitality** (bars, restaurants) and **retail** (clothing, shoes, merchandise). Speak item names and quantities while walking the floor; the app transcribes, parses, matches against your catalog, and syncs totals to a spreadsheet.

On first launch, choose **Hospitality** or **Retail** to configure locations, catalog fields, and voice counting behavior.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Expo (React Native) + TypeScript + expo-router |
| Audio | expo-audio (push-to-talk) |
| Transcription | Groq Whisper Large v3 Turbo |
| Parsing | OpenAI GPT-4o-mini (structured JSON) |
| Matching | Levenshtein + token-set + double metaphone (TypeScript) |
| Data | SQLite (expo-sqlite), offline-first with sync queue |
| Spreadsheet | Google Sheets (default), Microsoft Excel adapter |

## Prerequisites

- Node.js 20+
- npm
- [Expo Go](https://expo.dev/go) on your device, or Xcode / Android Studio for native builds
- API keys (free tiers): [Groq](https://console.groq.com), [OpenAI](https://platform.openai.com)

## Setup

```bash
cd stock-take-app
cp .env.example .env
# Edit .env with your API keys
npm install
npm start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | For live transcription | Groq API key for Whisper |
| `OPENAI_API_KEY` | For live parsing | OpenAI key for GPT-4o-mini |
| `GOOGLE_SHEETS_API_KEY` | For sheet sync | Google Sheets API key |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | For sheet sync | Target spreadsheet ID |
| `GOOGLE_SHEETS_SHEET_NAME` | Optional | Sheet tab name (default `Inventory`) |
| `MICROSOFT_GRAPH_CLIENT_ID` | Optional | Excel via Microsoft Graph |
| `CONFIDENCE_THRESHOLD` | Optional | Match auto-apply threshold (default 80) |

Keys are loaded via `app.config.ts` → `expo-constants` extra. Never commit `.env`.

## Running

```bash
npm start          # Expo dev server
npm run android    # Open on Android emulator/device
npm run ios        # Open on iOS simulator (macOS required for native build)
npm test           # Unit tests (matcher, totals, fill-level, BOM)
```

## Project Structure

```
stock-take-app/
├── app/                    # expo-router screens
│   ├── (tabs)/             # Count, Catalog, Recipes, Sessions, More
│   ├── catalog/            # Item editor
│   ├── recipes/            # Recipe editor
│   ├── aliases/            # Alias manager
│   ├── import-sync.tsx
│   └── settings.tsx
├── src/
│   ├── config/             # env, theme
│   ├── types/              # Shared TypeScript types
│   ├── services/
│   │   ├── db/             # SQLite schema + migrations
│   │   ├── transcription/  # Groq Whisper (swappable)
│   │   ├── parser/         # GPT-4o-mini (swappable)
│   │   ├── matcher/        # Fuzzy + phonetic matching
│   │   ├── business/       # Totals, fill-level, BOM explosion
│   │   ├── spreadsheetSync/# Google Sheets / Excel adapters
│   │   └── voicePipeline/  # End-to-end orchestration
│   └── components/ui/
└── __tests__/
```

## Voice Pipeline

1. **Record** — push-to-talk via expo-audio
2. **Transcribe** — Groq Whisper with catalog name prompt
3. **Parse** — GPT-4o-mini strict JSON schema
4. **Match** — blended fuzzy + phonetic score
5. **Confirm** — low-confidence gate with candidate picker
6. **Apply** — units, additive totals, batch fill-level, optional BOM
7. **Persist** — SQLite count_event + sync queue
8. **Sync** — flush queue to Google Sheets when online (session totals + audit trail)

Each step is a swappable service module with mock implementations for offline development.

## Build Milestones

- [x] **M1** — Scaffold, env, SQLite schema, service interfaces, navigation shell
- [x] **M2** — DB repositories, top-100 spirits seed, CSV import/export
- [x] **M3** — Catalog, recipe, alias managers (full CRUD)
- [x] **M4** — Voice pipeline end-to-end (mock default)
- [x] **M5** — Business logic + BOM resolver + tests
- [x] **M6** — Fill slider, confirm/correct UI, session totals polish
- [x] **M7** — Spreadsheet sync + offline queue
- [x] **M8** — Settings, polish, error states, accessibility
- [x] **M9** — Hospitality + Retail verticals (onboarding, SKU catalog, retail voice)
- [x] **M10** — Sheet import, barcode scan, bulk variants, session sync, EAS config
- [x] **M11** — Support admin API, read-only web console, customer support codes
- [x] **M12** — Customer-verified quantity adjustments (propose → approve → apply)
- [x] **M13** — Multi-device orgs, internal notes, support alerts, supervisor console

### M10 features

**Sheet → catalog import** — In **More → Import & Sync**, pull rows from your Google Sheet and upsert into SQLite (match by SKU, then name). Expected columns:

| Column | Required | Notes |
|--------|----------|-------|
| `name` | Yes | Item display name |
| `brand`, `sku`, `barcode`, `color`, `size`, `category` | No | Retail fields |
| `storage_location`, `base_unit`, `display_unit` | No | Defaults from vertical profile |
| `container_size`, `par_level` | No | Numeric |
| `aliases` | No | Semicolon-separated |

**Barcode scan** — Count and Catalog screens link to `/scan` (expo-camera). Items store a `barcode` field (schema v4).

**Bulk variants** — Retail catalog tab → size × color matrix creator.

**Session close sync** — Closing a session triggers `syncOnSessionClose()` to flush the offline queue when online.

### M11 — Support admin (read-only)

Customer-controlled technical support with no direct admin edits:

1. Set `SUPPORT_API_URL` in `.env` (e.g. `http://192.168.1.10:3001` — use your machine's LAN IP for Expo Go).
2. Start API + admin: see `stock-take-api/README.md` and `stock-take-admin/README.md`.
3. On the phone: **Settings → Get support** → share the 6-digit code.
4. Support opens the admin web app, signs in, enters the code → dashboard.
5. Support clicks **Propose** on a session total → customer sees approval on phone → **Approve** applies the adjustment locally.

### M13 — Ops polish

- **Multi-device:** Generate org link code on primary device; join from another handset.
- **Alert email:** Optional customer email stored on org; server fires webhook on support access (`ALERT_WEBHOOK_URL`).
- **Internal notes:** Support staff notes on admin console (not visible to customer).
- **Supervisor console:** `supervisor@stocktake.local` — org overview, session history, CSV audit export.

## EAS Build (standalone app)

To build for TestFlight or Play Store internal testing:

```bash
npm install -g eas-cli
cd stock-take-app
eas login
# Set EAS_PROJECT_ID in .env (create project at expo.dev)
eas build:configure   # already done — eas.json included
eas build --platform ios --profile preview    # internal iOS build
eas build --platform android --profile preview
eas submit --platform ios   # TestFlight (after production profile + Apple credentials)
```

Profiles in `eas.json`:
- **development** — dev client + simulator
- **preview** — internal APK / device install
- **production** — App Store / Play Store with auto version bump

## Paid Services

This project uses free-tier APIs only. No paid services are installed without your approval:

- **Groq** — free tier for Whisper transcription
- **OpenAI** — pay-per-use GPT-4o-mini (very low cost per parse)
- **Google Sheets API** — free quota for spreadsheet sync

## License

MIT
