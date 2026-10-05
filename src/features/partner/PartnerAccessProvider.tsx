import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getErrorMessage } from '@/lib/errors';
import { logError } from '@/lib/logger';
import * as partnerService from './services/partnerService';
import type { IncomingShare } from './services/partnerService';

interface PartnerAccess {
  status: 'loading' | 'error' | 'ready';
  error: string | null;
  /** Invitations to the signed-in user and shares they accepted. */
  incoming: IncomingShare[];
  reload: () => void;
  accept: (shareId: string) => Promise<void>;
  leave: (shareId: string) => Promise<void>;
}

const PartnerAccessContext = createContext<PartnerAccess | null>(null);

export function PartnerAccessProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PartnerAccess['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<IncomingShare[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    partnerService
      .listIncomingShares()
      .then((shares) => {
        if (!active) return;
        setIncoming(shares);
        setStatus('ready');
      })
      .catch((e: unknown) => {
        logError('partner.listIncoming', e);
        if (!active) return;
        setError(getErrorMessage(e));
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => {
    setStatus('loading');
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  const accept = useCallback(
    async (shareId: string) => {
      await partnerService.acceptShare(shareId);
      reload();
    },
    [reload],
  );

  const leave = useCallback(
    async (shareId: string) => {
      await partnerService.leaveShare(shareId);
      setIncoming((items) => items.filter((s) => s.id !== shareId));
    },
    [],
  );

  const value = useMemo(
    () => ({ status, error, incoming, reload, accept, leave }),
    [status, error, incoming, reload, accept, leave],
  );

  return <PartnerAccessContext.Provider value={value}>{children}</PartnerAccessContext.Provider>;
}

export function usePartnerAccess(): PartnerAccess {
  const ctx = useContext(PartnerAccessContext);
  if (!ctx) throw new Error('usePartnerAccess must be used inside <PartnerAccessProvider>');
  return ctx;
}
