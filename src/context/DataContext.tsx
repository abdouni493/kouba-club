import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData } from '../lib/mockData';
import {
  emptyAppData, fetchAllData, fetchPublicData, insertRow, updateRow, deleteRow,
  upsertClub, upsertContact, CASCADE_SET_NULL, type Collections,
} from '../lib/dataAdapter';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface DataCtx {
  data: AppData;
  loading: boolean;
  patch: (partial: Partial<Pick<AppData, 'club' | 'contact'>>) => void;
  // Each mutator resolves once the Supabase round-trip settles (success or
  // failure — failures already show a toast and roll back internally), so
  // most call sites fire-and-forget while sequencing-sensitive ones can await.
  add: <K extends Collections>(key: K, item: AppData[K][number]) => Promise<void>;
  updateItem: <K extends Collections>(key: K, id: string, patch: Partial<AppData[K][number]>) => Promise<void>;
  remove: <K extends Collections>(key: K, id: string) => Promise<void>;
  exportJSON: () => string;
  refresh: () => void;
}

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<AppData>(emptyAppData);
  const [loading, setLoading] = useState(true);
  const dataRef = useRef(data);
  dataRef.current = data;

  const load = async () => {
    setLoading(true);
    try {
      if (user) setData(await fetchAllData());
      else setData({ ...emptyAppData(), ...(await fetchPublicData()) });
    } catch (err) {
      console.error(err);
      toast('Erreur de chargement des données Supabase', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  const value = useMemo<DataCtx>(() => ({
    data,
    loading,

    patch: (partial) => {
      setData((d) => ({ ...d, ...partial }));
      if (partial.club) {
        upsertClub(partial.club).catch((err) => { console.error(err); toast(`Erreur : ${err.message}`, 'error'); });
      }
      if (partial.contact) {
        upsertContact(partial.contact).catch((err) => { console.error(err); toast(`Erreur : ${err.message}`, 'error'); });
      }
    },

    add: (key, item) => {
      setData((d) => ({ ...d, [key]: [item, ...(d[key] as unknown[])] } as AppData));
      return insertRow(key, item).catch((err) => {
        console.error(err);
        toast(`Erreur d'enregistrement : ${err.message}`, 'error');
        setData((d) => ({
          ...d,
          [key]: (d[key] as { id: string }[]).filter((x) => x.id !== (item as { id: string }).id),
        } as AppData));
      });
    },

    updateItem: (key, id, p) => {
      const prev = (dataRef.current[key] as { id: string }[]).find((x) => x.id === id);
      setData((d) => ({
        ...d,
        [key]: (d[key] as { id: string }[]).map((it) => (it.id === id ? { ...it, ...p } : it)),
      } as AppData));
      return updateRow(key, id, p, prev as never).catch((err) => {
        console.error(err);
        toast(`Erreur de mise à jour : ${err.message}`, 'error');
        if (prev) {
          setData((d) => ({
            ...d,
            [key]: (d[key] as { id: string }[]).map((it) => (it.id === id ? (prev as { id: string }) : it)),
          } as AppData));
        }
      });
    },

    remove: (key, id) => {
      const prev = (dataRef.current[key] as { id: string }[]).find((x) => x.id === id);
      setData((d) => ({ ...d, [key]: (d[key] as { id: string }[]).filter((it) => it.id !== id) } as AppData));
      return deleteRow(key, id).then(() => {
        // Mirror the DB's `on delete set null` so cached dependents don't resend a dangling id later.
        const cascades = CASCADE_SET_NULL[key];
        if (!cascades) return;
        setData((d) => {
          let next = d;
          for (const c of cascades) {
            next = {
              ...next,
              [c.collection]: (next[c.collection] as unknown as Record<string, unknown>[]).map((it) =>
                it[c.field] === id ? { ...it, [c.field]: undefined } : it,
              ),
            } as AppData;
          }
          return next;
        });
      }).catch((err) => {
        console.error(err);
        toast(`Erreur de suppression : ${err.message}`, 'error');
        if (prev) setData((d) => ({ ...d, [key]: [prev, ...(d[key] as unknown[])] } as AppData));
      });
    },

    exportJSON: () => JSON.stringify(data, null, 2),
    refresh: () => { load(); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data, loading, toast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useData must be used within DataProvider');
  return c;
}
