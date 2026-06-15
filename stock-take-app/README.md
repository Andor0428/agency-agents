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

## Paid Services

This project uses free-tier APIs only. No paid services are installed without your approval:

- **Groq** — free tier for Whisper transcription
- **OpenAI** — pay-per-use GPT-4o-mini (very low cost per parse)
- **Google Sheets API** — free quota for spreadsheet sync

## License

MIT
