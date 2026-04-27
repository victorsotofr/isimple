'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Bot, ChevronRight, Loader2, Plus } from 'lucide-react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { WorkspaceProvider } from '@/contexts/workspace-context';
import { LanguageProvider, useLanguage } from '@/contexts/language-context';
import { useWorkspace } from '@/contexts/workspace-context';
import { Button } from '@/components/ui/button';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <LanguageProvider>
      <WorkspaceProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <AppTopbar />
            <main className="flex min-h-0 flex-1 flex-col gap-4 bg-background p-4 lg:p-5">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </WorkspaceProvider>
    </LanguageProvider>
  );
}

function AppTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const { activeWorkspace } = useWorkspace();

  const route = [
    { href: '/inbox', label: t.nav.inbox, action: null },
    { href: '/tickets', label: t.nav.tickets, action: null },
    { href: '/agenda', label: t.nav.agenda, action: null },
    { href: '/lots', label: t.nav.lots, action: null },
    { href: '/tenants', label: t.nav.tenants, action: null },
    { href: '/prestataires', label: t.nav.contractors, action: null },
    { href: '/documents', label: t.nav.documents, action: { label: t.documents.upload, href: '/documents/upload' } },
    { href: '/analytics', label: t.nav.analytics, action: null },
    { href: '/settings', label: t.nav.settings, action: null },
    { href: '/profile', label: 'Profil', action: null },
  ].find(item => pathname.startsWith(item.href));

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-card px-4">
      <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        <span className="truncate text-muted-foreground">
          {activeWorkspace?.name ?? 'ImmoSimple'}
        </span>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
        <span className="truncate font-semibold">{route?.label ?? 'Application'}</span>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <div className="flex items-center gap-2 rounded-full border bg-background px-2.5 py-1">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-isimple-pulse" />
          <Bot className="size-3 text-brand" />
          <span className="text-[11px] font-medium text-muted-foreground">IA active</span>
        </div>
        {route?.action && (
          <Button
            size="sm"
            onClick={() => router.push(route.action.href)}
            className="h-8 gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <Plus className="size-3.5" />
            {route.action.label}
          </Button>
        )}
      </div>
    </header>
  );
}
