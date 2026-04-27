'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Users, Ticket, Wrench,
  Calendar, BarChart2, FileText, Settings, Building2, ChevronsUpDown,
  Search, Command, Inbox, LayoutDashboard, ArrowRight, User,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useWorkspace } from '@/contexts/workspace-context';
import { useLanguage } from '@/contexts/language-context';
import { createClient } from '@/lib/supabase-browser';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { key: 'inbox' as const, href: '/inbox', icon: Inbox, group: 'ops' },
  { key: 'tickets' as const, href: '/tickets', icon: Ticket, group: 'ops' },
  { key: 'agenda' as const, href: '/agenda', icon: Calendar, group: 'portfolio' },
  { key: 'lots' as const, href: '/lots', icon: Building2, group: 'portfolio' },
  { key: 'tenants' as const, href: '/tenants', icon: Users, group: 'portfolio' },
  { key: 'contractors' as const, href: '/prestataires', icon: Wrench, group: 'backoffice' },
  { key: 'documents' as const, href: '/documents', icon: FileText, group: 'backoffice' },
  { key: 'analytics' as const, href: '/analytics', icon: BarChart2, group: 'backoffice' },
] as const;

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const { activeWorkspace, workspaces, setActiveWorkspace, loading } = useWorkspace();
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const go = (href: string) => {
    setCommandOpen(false);
    router.push(href);
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            {workspaces.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="h-auto gap-2 rounded-lg px-2 py-1.5 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent">
                    <WorkspaceIcon />
                    <WorkspaceName name={activeWorkspace?.name} loading={loading} />
                    <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="start" className="w-56">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {t.workspace.switch}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {workspaces.map((ws) => (
                    <DropdownMenuItem
                      key={ws.id}
                      onSelect={() => setActiveWorkspace(ws)}
                      className="gap-2"
                    >
                      <Building2 className="size-4 shrink-0" />
                      <span className="truncate">{ws.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton size="lg" className="h-auto cursor-default gap-2 rounded-lg px-2 py-1.5 hover:bg-transparent active:bg-transparent">
                <WorkspaceIcon />
                <WorkspaceName name={activeWorkspace?.name} loading={loading} />
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="mt-3 flex w-full items-center gap-2 rounded-lg border border-[#3a3a38] bg-sidebar-accent px-2.5 py-1.5 text-left text-xs text-[#8a8a85] transition-colors hover:text-sidebar-foreground"
        >
          <Search className="size-3.5" />
          <span className="flex-1">Rechercher...</span>
          <kbd className="rounded border border-[#3a3a38] bg-[#1c1c1a] px-1.5 py-0.5 text-[10px] text-[#6a6a65]">
            ⌘K
          </kbd>
        </button>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupContent className="space-y-2">
            <NavSection
              items={NAV_ITEMS.filter(item => item.group === 'ops')}
              pathname={pathname}
              labels={t.nav}
              onNavigate={go}
            />
            <NavDivider />
            <NavSection
              items={NAV_ITEMS.filter(item => item.group === 'portfolio')}
              pathname={pathname}
              labels={t.nav}
              onNavigate={go}
            />
            <NavDivider />
            <NavSection
              items={NAV_ITEMS.filter(item => item.group === 'backoffice')}
              pathname={pathname}
              labels={t.nav}
              onNavigate={go}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.startsWith('/settings')}
              onClick={() => go('/settings')}
              className="rounded-lg text-[#8a8a85] hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-brand-muted data-[active=true]:text-sidebar-foreground"
            >
              <Settings className="size-4" />
              <span>{t.nav.settings}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <UserButton onNavigate={go} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNavigate={go}
      />
    </Sidebar>
  );
}

function WorkspaceIcon() {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground">
      <LayoutDashboard className="size-4" />
    </div>
  );
}

function WorkspaceName({ name, loading }: { name?: string; loading: boolean }) {
  return (
    <div className="grid flex-1 text-left leading-tight">
      <span className="font-serif truncate text-[17px] text-sidebar-foreground">
        isimple
      </span>
      <span className="truncate text-[10px] text-[#6a6a65]">
        {loading ? '...' : (name ?? 'Espace immobilier')}
      </span>
    </div>
  );
}

function NavSection({
  items,
  pathname,
  labels,
  onNavigate,
}: {
  items: typeof NAV_ITEMS[number][];
  pathname: string;
  labels: Record<typeof NAV_ITEMS[number]['key'] | 'settings' | 'prospects', string>;
  onNavigate: (href: string) => void;
}) {
  return (
    <SidebarMenu>
      {items.map(({ key, href, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <SidebarMenuItem key={key}>
            <SidebarMenuButton
              isActive={active}
              onClick={() => onNavigate(href)}
              className={cn(
                'rounded-lg px-2.5 text-[13px] text-[#8a8a85] transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
                'data-[active=true]:bg-brand-muted data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-[inset_2px_0_0_var(--brand)]'
              )}
            >
              <Icon className="size-3.5" />
              <span>{labels[key]}</span>
              {key === 'inbox' && (
                <span className="ml-auto rounded-full bg-sidebar-accent px-1.5 py-0.5 text-[10px] text-[#c0bfba]">
                  IA
                </span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

function NavDivider() {
  return <div className="mx-2 h-px bg-sidebar-border" />;
}

function UserButton({ onNavigate }: { onNavigate: (href: string) => void }) {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      const meta = data.user?.user_metadata;
      const full = meta?.first_name && meta?.last_name
        ? `${meta.first_name} ${meta.last_name}`
        : (meta?.full_name ?? null);
      setName(full);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initials = name
    ? name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : (email ? email.slice(0, 2).toUpperCase() : '?');
  const displayName = name ?? email ?? '...';

  return (
    <SidebarMenuButton
      size="lg"
      onClick={() => onNavigate('/profile')}
      className="mt-1 h-auto rounded-lg bg-sidebar-accent px-2 py-2 text-sidebar-foreground hover:bg-[#333330]"
    >
      <Avatar className="size-7 rounded-full">
        <AvatarFallback className="rounded-full bg-brand text-[10px] font-bold text-brand-foreground">{initials}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate text-xs font-medium">{displayName}</span>
        <span className="truncate text-[10px] text-[#6a6a65]">{email ?? '...'}</span>
      </div>
    </SidebarMenuButton>
  );
}

function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (href: string) => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpenChange, open]);

  const results = NAV_ITEMS.filter(item =>
    t.nav[item.key].toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[18%] max-w-xl translate-y-0 overflow-hidden rounded-xl border-border bg-card p-0 shadow-2xl">
        <DialogTitle className="sr-only">Palette de commande</DialogTitle>
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
            placeholder="Rechercher ou naviguer..."
            className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="kbd-hint">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">Aucun résultat</div>
          ) : (
            results.map(({ key, href, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => onNavigate(href)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
              >
                <span className="flex size-7 items-center justify-center rounded-md bg-brand-muted text-brand">
                  <Icon className="size-3.5" />
                </span>
                <span className="flex-1">{t.nav[key]}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </button>
            ))
          )}
          <button
            type="button"
            onClick={() => onNavigate('/profile')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <User className="size-3.5" />
            </span>
            <span className="flex-1">Profil</span>
            <Command className="size-3.5 text-muted-foreground" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
