# Wispr Flow transcription (WebSocket)

Stock Take can use **[Wispr Flow](https://wisprflow.ai)** for speech-to-text via their **WebSocket API** — the same family of tech people use in the WhisperFlow / Wispr keyboard apps. It tends to handle spirit names and casual UK speech better than raw Groq Whisper.

OpenAI is still used to **parse** counts (name + quantity) after transcription.

## Architecture

```
Phone (Hold to Talk)
  → stock-take-api  POST /api/device/voice/transcribe
      → ffmpeg (m4a → 16 kHz mono PCM)
      → Wispr Flow WebSocket API
          auth → append (1s PCM chunks) → commit
      → final transcript
  → OpenAI parser → confirm card → session totals
```

The **Wispr API key stays on the server** — never in the mobile `.env`.

Speech is primed for **British English (UK)** via Wispr `context.dictionary_context` (your catalog spirit names) and locale metadata.

## 1. Get a Wispr Flow API key

1. Sign up at [wisprflow.ai](https://wisprflow.ai)
2. Create an org API key (format `fl-…`)
3. See [api-docs.wisprflow.ai/websocket_api](https://api-docs.wisprflow.ai/websocket_api)

## 2. Configure stock-take-api

```bash
cd stock-take-api
cp .env.example .env
```

Add to `stock-take-api/.env`:

```bash
WISPR_FLOW_API_KEY=fl-your-key-here
```

Install **ffmpeg** (required to convert Expo’s m4a recordings):

```bash
brew install ffmpeg   # macOS
```

Start the API:

```bash
npm install
npm run dev
```

Check health:

```bash
curl http://localhost:3001/health
# should include "wisprFlow": true
```

## 3. Configure the app

In `stock-take-app/.env`:

```bash
SUPPORT_API_URL=http://YOUR_LAN_IP:3001
OPENAI_API_KEY=sk-...
```

Use your Mac’s LAN IP (not `localhost`) so a physical iPhone can reach the API.

## 4. Enable in the app

1. `npx expo start --clear`
2. **Settings** → turn **mock mode OFF**
3. **Settings** → **Voice pipeline** → select **Wispr Flow**
4. Count tab → Hold to Talk

The app auto-registers with `stock-take-api` on first use.

## WebSocket protocol (server-side)

The support API connects to:

`wss://platform-api.wisprflow.ai/api/v1/dash/ws?api_key=Bearer%20<YOUR_API_KEY>`

Then:

1. **auth** — `language: ["en"]`, catalog names in `dictionary_context`, British English app context
2. **append** — 1-second chunks of 16 kHz mono int16 PCM (base64), fixed `packet_duration`
3. **commit** — `{ total_packets: n }` when all chunks are sent
4. Receive **text** responses until the session completes

See [Wispr WebSocket docs](https://api-docs.wisprflow.ai/websocket_api) for full details.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `WISPR_FLOW_API_KEY is not configured` | Key missing in `stock-take-api/.env`, restart API |
| `ffmpeg required` | `brew install ffmpeg` on the machine running stock-take-api |
| `Support API URL is not configured` | Set `SUPPORT_API_URL` in app `.env`, restart Expo with `--clear` |
| WebSocket timeout | Check API key, network, and Wispr platform status |
| Still wrong spirit names | Add **aliases** in Catalog (e.g. “Beber” → Belvedere) |

## Switch back to Groq

Settings → Voice pipeline → **Groq Whisper** (only needs `GROQ_API_KEY` in app `.env`, no local API server).
