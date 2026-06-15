import { useCallback, useEffect, useState } from 'react';
import { getRepositories } from '@/services/db';
import type { CountSession } from '@/types';

export function useActiveSession() {
  const [session, setSession] = useState<CountSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const repos = await getRepositories();
    const open = await repos.sessions.getOpen();
    setSession(open);
    setLoading(false);
    return open;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const ensureSession = useCallback(async (): Promise<CountSession> => {
    const repos = await getRepositories();
    const existing = await repos.sessions.getOpen();
    if (existing) {
      setSession(existing);
      return existing;
    }

    const name = `Count ${new Date().toLocaleString()}`;
    const created = await repos.sessions.create(name);
    setSession(created);
    return created;
  }, []);

  const startSession = useCallback(async (name?: string) => {
    const repos = await getRepositories();
    const open = await repos.sessions.getOpen();
    if (open) {
      setSession(open);
      return open;
    }
    const created = await repos.sessions.create(
      name?.trim() || `Count ${new Date().toLocaleString()}`
    );
    setSession(created);
    return created;
  }, []);

  const closeSession = useCallback(async () => {
    if (!session) return null;
    const repos = await getRepositories();
    const closed = await repos.sessions.close(session.id);
    setSession(null);
    return closed;
  }, [session]);

  return {
    session,
    loading,
    refresh,
    ensureSession,
    startSession,
    closeSession,
  };
}
