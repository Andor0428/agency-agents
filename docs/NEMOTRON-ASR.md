# NVIDIA Nemotron 3.5 ASR (British English)

Stock Take can use **[NVIDIA Nemotron 3.5 ASR](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b)** for speech-to-text — a cache-aware streaming model with native **en-GB** (British English) support, punctuation, and capitalization.

OpenAI is still used to **parse** counts (name + quantity) after transcription.

## Why Nemotron?

- **British English (en-GB)** — locale-aware, not just generic `en`
- **Streaming architecture** — designed for low-latency voice agents
- **Punctuation & capitalization** — production-ready output text
- **40 language locales** — single model if you expand beyond UK bars

## Architecture

```
Phone (Hold to Talk)
  → Together AI  POST /v1/audio/transcriptions
      model: nvidia/nemotron-3.5-asr-streaming-0.6b
      language: en-GB
  → OpenAI parser → confirm card → session totals
```

Or via your support API (keeps the Together key on the server):

```
Phone → stock-take-api  POST /api/device/voice/transcribe  { engine: "nemotron" }
     → Together AI (Nemotron ASR)
```

## 1. Get a Together AI API key

1. Sign up at [together.ai](https://www.together.ai)
2. Create an API key
3. Nemotron ASR model: `nvidia/nemotron-3.5-asr-streaming-0.6b`
4. Docs: [together.ai/models/nvidia-nemotron-35-asr](https://www.together.ai/models/nvidia-nemotron-35-asr)

## 2. Configure the app (direct — simplest)

In `stock-take-app/.env`:

```bash
TOGETHER_API_KEY=your-together-key
OPENAI_API_KEY=sk-...
```

Restart Expo:

```bash
npx expo start --clear
```

## 3. Enable in the app

1. **Settings** → turn **mock mode OFF**
2. **Settings** → **Voice pipeline** → select **Nemotron ASR**
3. Count tab → Hold to Talk

Speech recognition is fixed to **British English (en-GB)** via the Nemotron language-locale parameter.

## Alternative: via stock-take-api

If you already run `stock-take-api` and prefer keys on the server:

**stock-take-api/.env**

```bash
TOGETHER_API_KEY=your-together-key
```

**stock-take-app/.env**

```bash
SUPPORT_API_URL=http://YOUR_LAN_IP:3001
OPENAI_API_KEY=sk-...
```

The server converts m4a → 16 kHz wav before calling Together AI (requires `ffmpeg`).

Check health:

```bash
curl http://localhost:3001/health
# should include "nemotronAsr": true
```

## Self-hosted (GPU)

For on-prem inference without Together AI, install [NVIDIA NeMo](https://github.com/NVIDIA/NeMo) and run the model locally with `target_lang=en-GB`. That path is not wired into Stock Take yet — use Together AI or contact us if you need NeMo/Triton integration.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `TOGETHER_API_KEY is not configured` | Add key to app `.env` or `stock-take-api/.env` |
| Empty transcript | Hold mic longer; check Together AI billing/quota |
| Wrong spirit names | OpenAI parser + catalog aliases still apply after ASR |
| Switch back to Groq | Settings → **Groq Whisper** |

## Model reference

- Hugging Face: [nvidia/nemotron-3.5-asr-streaming-0.6b](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b)
- License: NVIDIA Open Model License (commercial use allowed)
