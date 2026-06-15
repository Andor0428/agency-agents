# Stock Take Support API

Backend for support sessions: device registration, short-lived support codes, snapshot storage, customer-verified change requests, and audit logging.

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
| POST | `/api/device/support/sessions/:id/snapshot` | Device | Upload data snapshot |
| GET | `/api/device/support/change-requests/pending` | Device | Pending approvals |
| POST | `/api/device/support/change-requests/:id/resolve` | Device | Approve or deny |
| POST | `/api/device/support/change-requests/:id/applied` | Device | Mark as applied |
| POST | `/api/admin/login` | — | Admin JWT |
| POST | `/api/admin/support/redeem` | Admin | Redeem customer code |
| GET | `/api/admin/support/sessions/:id` | Admin + view token | Session + snapshot |
| GET | `/api/admin/support/sessions/:id/change-requests` | Admin + view token | List requests |
| POST | `/api/admin/support/sessions/:id/change-requests` | Admin + view token | Propose adjustment |

## Security model

- Admins **cannot** edit customer data directly.
- Admins **propose** quantity changes; customer **approves or denies** on device.
- All actions are audit-logged.
