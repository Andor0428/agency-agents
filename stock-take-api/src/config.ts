export const config = {
  port: Number(process.env.PORT ?? '3001'),
  apiSecret: process.env.API_SECRET ?? 'dev-secret-change-me',
  adminEmail: process.env.ADMIN_EMAIL ?? 'support@stocktake.local',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'changeme',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  supportCodeTtlMinutes: 30,
  dbPath: process.env.DB_PATH ?? 'data/support.db',
};
