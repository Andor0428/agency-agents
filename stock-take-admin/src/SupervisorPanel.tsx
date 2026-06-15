import { useEffect, useState } from 'react';
import {
  fetchSupervisorOrganizations,
  fetchSupervisorSessions,
  getStoredAdminToken,
  getSupervisorAuditExportUrl,
} from './api';

export function SupervisorPanel() {
  const [orgs, setOrgs] = useState<Awaited<ReturnType<typeof fetchSupervisorOrganizations>>>([]);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof fetchSupervisorSessions>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [organizationData, sessionData] = await Promise.all([
          fetchSupervisorOrganizations(),
          fetchSupervisorSessions(),
        ]);
        setOrgs(organizationData);
        setSessions(sessionData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load supervisor data');
      }
    };
    void load();
  }, []);

  const token = getStoredAdminToken();

  return (
    <div className="stack">
      <div className="card">
        <h2>Supervisor console</h2>
        <p className="muted">Cross-organization overview and compliance export.</p>
        {error ? <div className="alert error">{error}</div> : null}
        <a
          className="linkButton"
          href={`${getSupervisorAuditExportUrl()}&token=${token}`}
          onClick={(e) => {
            e.preventDefault();
            if (!token) return;
            fetch(getSupervisorAuditExportUrl(), {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((res) => res.blob())
              .then((blob) => {
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = 'support-audit.csv';
                anchor.click();
                URL.revokeObjectURL(url);
              });
          }}
        >
          Export audit log (CSV)
        </a>
      </div>

      <section className="card">
        <h3>Organizations ({orgs.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Devices</th>
              <th>Alert email</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => (
              <tr key={org.id}>
                <td>{org.name}</td>
                <td>{org.businessType}</td>
                <td>{org.deviceCount}</td>
                <td>{org.alertEmail || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h3>Recent support sessions ({sessions.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Organization</th>
              <th>Status</th>
              <th>Created</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>{session.orgName}</td>
                <td>
                  <span className="pill">{session.status}</span>
                </td>
                <td>{new Date(session.createdAt).toLocaleString()}</td>
                <td>{new Date(session.expiresAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
