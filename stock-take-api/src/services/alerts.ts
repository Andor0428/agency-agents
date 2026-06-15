import { config } from '../config.js';
import { getDb } from '../db.js';

export type AlertEvent =
  | 'support_code_redeemed'
  | 'support_session_viewed'
  | 'change_proposed'
  | 'change_approved'
  | 'change_denied';

export type AlertPayload = {
  event: AlertEvent;
  orgName: string;
  orgId: string;
  supportSessionId?: string;
  details?: Record<string, unknown>;
  customerEmail?: string | null;
};

export async function sendSupportAlert(payload: AlertPayload): Promise<void> {
  const message = formatAlertMessage(payload);
  console.info(`[support-alert] ${message}`);

  if (!config.alertWebhookUrl) return;

  try {
    await fetch(config.alertWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
        ...payload,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error('[support-alert] webhook failed', error);
  }
}

function formatAlertMessage(payload: AlertPayload): string {
  const base = `[${payload.orgName}] ${payload.event}`;
  if (!payload.details) return base;
  return `${base} — ${JSON.stringify(payload.details)}`;
}

export function notifySupportSessionEvent(
  supportSessionId: string,
  event: AlertEvent,
  details?: Record<string, unknown>
): void {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.org_id, o.name as org_name, o.alert_email
       FROM support_sessions s
       JOIN organizations o ON o.id = s.org_id
       WHERE s.id = ?`
    )
    .get(supportSessionId) as
    | { org_id: string; org_name: string; alert_email: string | null }
    | undefined;
  if (!row) return;

  void sendSupportAlert({
    event,
    orgId: row.org_id,
    orgName: row.org_name,
    supportSessionId,
    customerEmail: row.alert_email,
    details,
  });
}
