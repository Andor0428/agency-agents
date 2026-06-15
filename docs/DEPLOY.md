# Deployment Guide

## Phase 0 — Done

All milestones M1–M13 are merged to `main`.

## Phase 1 — M14 Google OAuth setup

1. Create a project at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Google Sheets API**
3. Create OAuth 2.0 credentials:
   - **Web client** → `GOOGLE_OAUTH_WEB_CLIENT_ID` (mobile + API refresh)
   - **iOS client** → `GOOGLE_OAUTH_IOS_CLIENT_ID` (optional, native)
   - **Android client** → `GOOGLE_OAUTH_ANDROID_CLIENT_ID` (optional, native)
4. Add authorized redirect URI: `stocktake://` (Expo scheme)
5. Copy client ID + secret to:
   - `stock-take-app/.env` — web client ID
   - `stock-take-api/.env` — web client ID + secret (for server-side token refresh)

## Phase 2 — Deploy API

### Docker (any host)

```bash
cd stock-take-api
cp .env.example .env   # fill production secrets
docker build -t stock-take-api .
docker run -p 3001:3001 -v stocktake-data:/app/data --env-file .env stock-take-api
```

### Railway / Render / Fly.io

- Root directory: `stock-take-api`
- Build: `npm install && npm run build`
- Start: `node dist/index.js`
- Mount persistent volume at `data/` for SQLite
- Set env vars from `.env.example`

Required production env:
- `API_SECRET` — strong random string
- `CORS_ORIGINS` — `https://your-admin.vercel.app`
- `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET`
- `ALERT_WEBHOOK_URL` — optional Slack/Discord webhook

## Phase 3 — Deploy Admin Web

```bash
cd stock-take-admin
npm install && npm run build
```

### Vercel

1. Import repo, root: `stock-take-admin`
2. Update `vercel.json` rewrite destination to your API URL
3. Deploy

Or set `VITE_API_URL` and proxy in vite.config for production build.

## Phase 4 — Mobile production builds

```bash
cd stock-take-app
cp .env.example .env
# Set SUPPORT_API_URL=https://api.yourdomain.com
# Set GOOGLE_OAUTH_WEB_CLIENT_ID=...
# Set GROQ_API_KEY, OPENAI_API_KEY, EAS_PROJECT_ID

npm install -g eas-cli
eas login
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

For App Store / TestFlight:
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

## Health checks

- API: `GET https://api.yourdomain.com/health`
- Admin: open login page, sign in as `support@stocktake.local`

## Security checklist

- [ ] Change default admin/supervisor passwords
- [ ] Set strong `API_SECRET`
- [ ] HTTPS everywhere
- [ ] Restrict CORS to admin domain only
- [ ] Back up `data/support.db` regularly
