# Stock Take Support API

Backend for M11 support sessions: device registration, short-lived support codes, read-only snapshot storage, and audit logging.

## Setup

```bash
cd stock-take-api
cp .env.example .env
npm install
npm run dev
```

Default admin (dev only): `support@stocktake.local` / `changeme`

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/device/register` | — | Register device + org |
| POST | `/api/device/support/sessions` | Device | Create 6-digit support code |
| POST | `/api/device/support/sessions/:id/snapshot` | Device | Upload read-only data snapshot |
| POST | `/api/admin/login` | — | Admin JWT |
| POST | `/api/admin/support/redeem` | Admin | Redeem customer code → view token |
| GET | `/api/admin/support/sessions/:id` | Admin + view token | Read-only session + snapshot |

## Security model (M11)

- Support admins **cannot** edit customer data.
- Customer generates a code on-device; admin redeems for **read-only** access.
- All admin views are audit-logged.
- M12 will add customer-approved change requests.
