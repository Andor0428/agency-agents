export const config = {
  port: Number(process.env.PORT ?? '3001'),
  apiSecret: process.env.API_SECRET ?? 'dev-secret-change-me',
  adminEmail: process.env.ADMIN_EMAIL ?? 'support@stocktake.local',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'changeme',
  supervisorEmail: process.env.SUPERVISOR_EMAIL ?? 'supervisor@stocktake.local',
  supervisorPassword: process.env.SUPERVISOR_PASSWORD ?? 'changeme',
  alertWebhookUrl: process.env.ALERT_WEBHOOK_URL ?? '',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  allowedOrigins: (process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  supportCodeTtlMinutes: 30,
  orgLinkCodeTtlHours: 48,
  dbPath: process.env.DB_PATH ?? 'data/support.db',
  googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
  googleOAuthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
  wisprFlowApiKey: process.env.WISPR_FLOW_API_KEY ?? '',
  togetherApiKey: process.env.TOGETHER_API_KEY ?? '',
};
