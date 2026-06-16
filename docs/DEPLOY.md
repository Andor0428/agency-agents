# Deployment Guide

## Phase 0 — Done

All milestones M1–M13 are merged to `main`.

## Phase 1 — M14 Google OAuth setup

### Use a **Desktop app** OAuth client (not Web application)

Google's **Web application** type only accepts HTTPS redirect URLs. This app uses the native deep link `stocktake://`, which requires a **Desktop app** client.

1. Open [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Enable **Google Sheets API**
3. **Create credentials → OAuth client ID → Desktop app**
4. Under **Authorized redirect URIs**, add:
   ```
   stocktake://
   ```
5. Copy the **Client ID** and **Client secret** to both apps:

| Variable | Where | Purpose |
|----------|-------|---------|
| `GOOGLE_OAUTH_CLIENT_ID` | `stock-take-app/.env` | Mobile sign-in (PKCE + `stocktake://`) |
| `GOOGLE_OAUTH_CLIENT_ID` | `stock-take-api/.env` | Server-side token refresh |
| `GOOGLE_OAUTH_CLIENT_SECRET` | `stock-take-api/.env` | Server-side token refresh |

**Do not** put the client secret in the mobile app — only the Client ID on device.

### Why not Web application?

| Client type | Redirect | Works with Expo `stocktake://`? |
|-------------|----------|----------------------------------|
| Web application | HTTPS only | No |
| Desktop app | Custom URI / localhost | Yes |

If you later add a browser-based OAuth flow (e.g. admin web), create a separate **Web application** client with `https://your-admin.vercel.app/oauth/callback` — that is optional and not required for the mobile app today.

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
- `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` (Desktop app)
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

## Phase 4 — Mobile production builds

```bash
cd stock-take-app
cp .env.example .env
# GOOGLE_OAUTH_CLIENT_ID=...  (Desktop app client ID only)
# SUPPORT_API_URL=https://api.yourdomain.com
# GROQ_API_KEY, OPENAI_API_KEY, EAS_PROJECT_ID

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
- [ ] Never commit `GOOGLE_OAUTH_CLIENT_SECRET` to the mobile app
