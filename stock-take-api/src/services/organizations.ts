import { getDb } from '../db.js';

export function updateOrgAlertEmail(orgId: string, alertEmail: string | null): void {
  const db = getDb();
  db.prepare('UPDATE organizations SET alert_email = ? WHERE id = ?').run(alertEmail, orgId);
}

export function getOrgById(orgId: string): {
  id: string;
  name: string;
  businessType: string;
  alertEmail: string | null;
} | null {
  const db = getDb();
  const row = db
    .prepare('SELECT id, name, business_type, alert_email FROM organizations WHERE id = ?')
    .get(orgId) as
    | { id: string; name: string; business_type: string; alert_email: string | null }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    businessType: row.business_type,
    alertEmail: row.alert_email,
  };
}

export function listOrganizations(): Array<{
  id: string;
  name: string;
  businessType: string;
  deviceCount: number;
  alertEmail: string | null;
  createdAt: string;
}> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT o.id, o.name, o.business_type, o.alert_email, o.created_at,
              COUNT(d.id) as device_count
       FROM organizations o
       LEFT JOIN devices d ON d.org_id = o.id
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    )
    .all() as Array<{
    id: string;
    name: string;
    business_type: string;
    alert_email: string | null;
    created_at: string;
    device_count: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    businessType: row.business_type,
    deviceCount: row.device_count,
    alertEmail: row.alert_email,
    createdAt: row.created_at,
  }));
}
