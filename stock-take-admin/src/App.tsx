import { Fragment, useEffect, useState } from 'react';
import {
  clearSupportAccess,
  fetchChangeRequests,
  fetchSupportSession,
  getStoredAdminToken,
  getSupportAccess,
  loginAdmin,
  proposeChangeRequest,
  redeemCode,
  type ChangeRequest,
  type SupportSession,
  type SupportSnapshot,
} from './api';

type Step = 'login' | 'code' | 'dashboard';

function ProposeAdjustmentRow({
  countSessionId,
  countSessionName,
  itemId,
  itemName,
  currentQty,
  onProposed,
}: {
  countSessionId: string;
  countSessionName: string;
  itemId: string;
  itemName: string;
  currentQty: number;
  onProposed: () => void;
}) {
  const [proposedQty, setProposedQty] = useState(String(currentQty));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await proposeChangeRequest({
        countSessionId,
        countSessionName,
        itemId,
        itemName,
        currentQty,
        proposedQty: Number(proposedQty),
        reason: reason.trim() || undefined,
      });
      onProposed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proposal failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr>
      <td colSpan={4}>
        <div className="proposeRow">
          <span className="muted">Propose new total for {itemName}</span>
          <input
            type="number"
            value={proposedQty}
            onChange={(e) => setProposedQty(e.target.value)}
            aria-label={`Proposed quantity for ${itemName}`}
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            aria-label="Reason for adjustment"
          />
          <button type="button" onClick={() => void submit()} disabled={busy}>
            {busy ? 'Sending…' : 'Request approval'}
          </button>
          {error ? <span className="inlineError">{error}</span> : null}
        </div>
      </td>
    </tr>
  );
}

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
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [expandedPropose, setExpandedPropose] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSupportSession();
      setSession(data.session);
      setSnapshot(data.snapshot);
      setOrgName(data.session.orgName);
      const requests = await fetchChangeRequests();
      setChangeRequests(requests);
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
        <span className="badge">Customer-verified edits · M12</span>
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
            propose quantity changes; the customer must approve before anything is applied.
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

              <section className="card">
                <h3>Change requests</h3>
                {changeRequests.length === 0 ? (
                  <p className="muted">No change requests yet.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Session</th>
                        <th>Change</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changeRequests.map((request) => (
                        <tr key={request.id}>
                          <td>{request.itemName}</td>
                          <td>{request.countSessionName}</td>
                          <td>
                            {request.currentQty} → {request.proposedQty}
                          </td>
                          <td>
                            <span className="pill">{request.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

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
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {s.totals.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="muted">
                            No totals yet
                          </td>
                        </tr>
                      ) : (
                        s.totals.map((t) => {
                          const key = `${s.id}:${t.itemId}`;
                          return (
                            <Fragment key={key}>
                              <tr>
                                <td>{t.itemName}</td>
                                <td>{t.totalQty}</td>
                                <td>{t.eventCount}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="secondary"
                                    onClick={() =>
                                      setExpandedPropose(expandedPropose === key ? null : key)
                                    }
                                  >
                                    Propose
                                  </button>
                                </td>
                              </tr>
                              {expandedPropose === key ? (
                                <ProposeAdjustmentRow
                                  key={`${key}-form`}
                                  countSessionId={s.id}
                                  countSessionName={s.name}
                                  itemId={t.itemId}
                                  itemName={t.itemName}
                                  currentQty={t.totalQty}
                                  onProposed={() => {
                                    setExpandedPropose(null);
                                    void loadDashboard();
                                  }}
                                />
                              ) : null}
                            </Fragment>
                          );
                        })
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
