import { useEffect, useState } from 'react';
import {
  clearSupportAccess,
  fetchSupportSession,
  getStoredAdminToken,
  getSupportAccess,
  loginAdmin,
  redeemCode,
  type SupportSession,
  type SupportSnapshot,
} from './api';

type Step = 'login' | 'code' | 'dashboard';

export function App() {
  const [step, setStep] = useState<Step>(() =>
    getStoredAdminToken() ? (getSupportAccess() ? 'dashboard' : 'code') : 'login'
  );
  const [email, setEmail] = useState('support@stocktake.local');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SupportSession | null>(null);
  const [snapshot, setSnapshot] = useState<SupportSnapshot | null>(null);
  const [orgName, setOrgName] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSupportSession();
      setSession(data.session);
      setSnapshot(data.snapshot);
      setOrgName(data.session.orgName);
      setStep('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      clearSupportAccess();
      setStep('code');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 'dashboard') {
      void loadDashboard();
    }
  }, [step]);

  const onLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginAdmin(email, password);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onRedeem = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await redeemCode(code.trim());
      setOrgName(result.orgName);
      setStep('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Redeem failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Stock Take</p>
          <h1>Support Console</h1>
        </div>
        <span className="badge">Read-only · M11</span>
      </header>

      {error ? <div className="alert error">{error}</div> : null}

      {step === 'login' ? (
        <form className="card" onSubmit={onLogin}>
          <h2>Admin sign in</h2>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      ) : null}

      {step === 'code' ? (
        <form className="card" onSubmit={onRedeem}>
          <h2>Enter customer support code</h2>
          <p className="muted">
            Ask the customer to open Settings → Get support and share the 6-digit code. You can
            view their data but cannot edit counts without customer approval (M12).
          </p>
          <label>
            Support code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
            />
          </label>
          <button type="submit" disabled={loading || code.trim().length < 6}>
            {loading ? 'Connecting…' : 'Connect read-only session'}
          </button>
        </form>
      ) : null}

      {step === 'dashboard' ? (
        <div className="stack">
          <div className="card">
            <h2>{orgName || session?.orgName}</h2>
            <p className="muted">
              Session {session?.status} · expires {session ? new Date(session.expiresAt).toLocaleString() : '—'}
            </p>
            <p className="muted">
              Snapshot captured{' '}
              {snapshot ? new Date(snapshot.capturedAt).toLocaleString() : 'not uploaded yet'}
            </p>
            <div className="actions">
              <button type="button" onClick={() => void loadDashboard()} disabled={loading}>
                Refresh
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  clearSupportAccess();
                  setStep('code');
                }}
              >
                Enter new code
              </button>
            </div>
          </div>

          {snapshot ? (
            <>
              <div className="grid">
                <div className="stat">
                  <span>Catalog items</span>
                  <strong>{snapshot.catalog.itemCount}</strong>
                </div>
                <div className="stat">
                  <span>Sessions</span>
                  <strong>{snapshot.sessions.length}</strong>
                </div>
                <div className="stat">
                  <span>Sync pending</span>
                  <strong>{snapshot.syncQueue.pending ?? 0}</strong>
                </div>
              </div>

              {snapshot.sessions.map((s) => (
                <section className="card" key={s.id}>
                  <h3>
                    {s.name} <span className="pill">{s.status}</span>
                  </h3>
                  <p className="muted">
                    {s.location} · started {new Date(s.started_at).toLocaleString()}
                  </p>
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Total qty</th>
                        <th>Events</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.totals.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="muted">
                            No totals yet
                          </td>
                        </tr>
                      ) : (
                        s.totals.map((t) => (
                          <tr key={t.itemId}>
                            <td>{t.itemName}</td>
                            <td>{t.totalQty}</td>
                            <td>{t.eventCount}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {s.events.length > 0 ? (
                    <details>
                      <summary>{s.events.length} count events</summary>
                      <table>
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Transcript</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.events.map((e) => (
                            <tr key={e.id}>
                              <td>{new Date(e.created_at).toLocaleTimeString()}</td>
                              <td>{e.itemName}</td>
                              <td>{e.qty}</td>
                              <td>{e.raw_transcript || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </details>
                  ) : null}
                </section>
              ))}
            </>
          ) : (
            <div className="card">
              <p className="muted">
                Waiting for the customer device to upload a snapshot. Ask them to keep the support
                screen open and tap refresh.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
