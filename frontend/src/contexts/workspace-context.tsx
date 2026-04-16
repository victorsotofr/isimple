'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { Workspace } from '@/db';

type WorkspaceContextType = {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace) => void;
  loading: boolean;
};

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: memberships } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id);

      if (!memberships?.length) {
        setLoading(false);
        if (pathname !== '/create-workspace') {
          router.push('/create-workspace');
        }
        return;
      }

      const ids = memberships.map((m) => m.workspace_id);
      const { data: ws } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', ids);

      const list = (ws ?? []) as Workspace[];
      setWorkspaces(list);
      if (list.length > 0) {
        setActiveWorkspace(list[0]);
      } else if (pathname !== '/create-workspace') {
        router.push('/create-workspace');
      }

      setLoading(false);
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, setActiveWorkspace, loading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
