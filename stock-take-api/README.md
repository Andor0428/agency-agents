# Stock Take Support API

Backend for support sessions: device registration, short-lived support codes, snapshot storage, customer-verified change requests, audit logging, and ops tooling.

## Setup

```bash
cd stock-take-api
cp .env.example .env
npm install
npm run dev
```

Default accounts (dev only):
- Support: `support@stocktake.local` / `changeme`
- Supervisor: `supervisor@stocktake.local` / `changeme`

## Security model

- Admins **cannot** edit customer data directly.
- Admins **propose** quantity changes; customer **approves or denies** on device.
- Supervisor role can view cross-org audit data and export compliance logs.
- Webhook alerts fire on support access events when `ALERT_WEBHOOK_URL` is set.

## Key endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/device/register` | Register device (optional `orgLinkCode` for multi-device) |
| POST | `/api/device/org/link-code` | Generate org link code for additional devices |
| PUT | `/api/device/org/alert-email` | Set customer alert email on org |
| POST | `/api/admin/support/sessions/:id/notes` | Internal support notes |
| GET | `/api/admin/supervisor/audit?format=csv` | Compliance audit export |

See route files for the full list.
