'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Building2,
  MessageSquare,
  Home,
  Users,
  Calendar,
  Wrench,
  BarChart2,
  Settings,
  LogOut,
  ChevronsUpDown,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useWorkspace } from '@/contexts/workspace-context';
import { useLanguage } from '@/contexts/language-context';
import { createClient } from '@/lib/supabase-browser';

const NAV_ITEMS = [
  { key: 'inbox' as const, href: '/inbox', icon: MessageSquare },
  { key: 'lots' as const, href: '/lots', icon: Home },
  { key: 'tenants' as const, href: '/tenants', icon: Users },
  { key: 'agenda' as const, href: '/agenda', icon: Calendar },
  { key: 'contractors' as const, href: '/prestataires', icon: Wrench },
  { key: 'analytics' as const, href: '/analytics', icon: BarChart2 },
] as const;

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const { activeWorkspace, workspaces, setActiveWorkspace, loading } = useWorkspace();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {workspaces.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
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
              <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent active:bg-transparent">
                <WorkspaceIcon />
                <WorkspaceName name={activeWorkspace?.name} loading={loading} />
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ key, href, icon: Icon }) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(href)}
                    onClick={() => router.push(href)}
                  >
                    <Icon className="size-4" />
                    <span>{t.nav[key]}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.startsWith('/settings')}
              onClick={() => router.push('/settings')}
            >
              <Settings className="size-4" />
              <span>{t.nav.settings}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <UserMenu onLogout={handleLogout} onSettings={() => router.push('/settings')} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function WorkspaceIcon() {
  return (
    <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
      <Building2 className="size-4" />
    </div>
  );
}

function WorkspaceName({ name, loading }: { name?: string; loading: boolean }) {
  return (
    <div className="grid flex-1 text-left text-sm leading-tight">
      <span className="truncate font-semibold">
        {loading ? '...' : (name ?? 'ImmoSimple')}
      </span>
    </div>
  );
}

function UserMenu({ onLogout, onSettings }: { onLogout: () => void; onSettings: () => void }) {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setName(data.user?.user_metadata?.full_name ?? null);
    });
  }, [supabase]);

  const initials = email ? email.slice(0, 2).toUpperCase() : '?';
  const displayName = name ?? email ?? '...';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
          <Avatar className="size-8 rounded-lg">
            <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{displayName}</span>
            <span className="truncate text-xs text-muted-foreground">{email ?? '...'}</span>
          </div>
          <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="font-medium">{displayName}</span>
          <span className="text-xs font-normal text-muted-foreground truncate">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSettings} className="gap-2">
          <Settings className="size-4" />
          Paramètres
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onLogout} className="gap-2 text-destructive focus:text-destructive">
          <LogOut className="size-4" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
