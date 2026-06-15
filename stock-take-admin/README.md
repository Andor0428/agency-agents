# Stock Take Support Admin

Read-only web console for technical support (M11).

## Setup

```bash
# Terminal 1 — API
cd stock-take-api && npm install && npm run dev

# Terminal 2 — Admin UI
cd stock-take-admin && npm install && npm run dev
```

Open http://localhost:5173

1. Sign in with admin credentials from `stock-take-api/.env`
2. Ask the customer for their 6-digit code (Settings → Get support)
3. View sessions, totals, and count events — **no edit controls**
