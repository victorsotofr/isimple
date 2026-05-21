'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  FileText,
  Home,
  Loader2,
  MessageSquare,
  Ticket as TicketIcon,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/contexts/workspace-context';
import { createClient } from '@/lib/supabase-browser';
import { cn } from '@/lib/utils';
import type { Conversation, Document, Lease, Lot, Tenant } from '@/db';
import type { Provider, Ticket, TicketPriority, TicketStatus } from '@/db/types';

type TicketLot = Pick<Lot, 'id' | 'address' | 'city'>;
type TicketTenant = Pick<Tenant, 'id' | 'first_name' | 'last_name'>;
type TicketProvider = Pick<Provider, 'id' | 'name' | 'specialty' | 'active'>;
type TicketWithRelations = Ticket & {
  due_at?: string | null;
  lot: TicketLot | null;
  tenant: TicketTenant | null;
  provider: TicketProvider | null;
};

type AgendaData = {
  conversations: Conversation[];
  documents: Document[];
  leases: Lease[];
  lots: Lot[];
  providers: Provider[];
  tenants: Tenant[];
  tickets: TicketWithRelations[];
};

type AgendaItemTone = 'default' | 'overdue' | 'today' | 'urgent' | 'stale';

type AgendaItem = {
  id: string;
  date: string;
  title: string;
  detail: string;
  href: string;
  kind: 'document' | 'conversation' | 'lease_start' | 'lease_end' | 'ticket';
  tone: AgendaItemTone;
  badge?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const TICKET_SELECT = `
  *,
  lot:lots(id, address, city),
  tenant:tenants(id, first_name, last_name),
  provider:providers(id, name, specialty, active)
`;

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  waiting_provider: 'Prestataire',
  resolved: 'Résolu',
  closed: 'Clôturé',
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente',
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function validDate(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysFromToday(iso: string) {
  const date = validDate(iso);
  if (!date) return 0;
  return Math.round((startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / DAY_MS);
}

function daysSince(iso: string) {
  return Math.max(0, -daysFromToday(iso));
}

function formatDate(iso: string) {
  const date = validDate(iso);
  if (!date) return 'À planifier';
  const delta = daysFromToday(iso);
  if (delta === 0) return "Aujourd'hui";
  if (delta === 1) return 'Demain';
  if (delta === -1) return 'Hier';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeTicket(row: TicketWithRelations): TicketWithRelations {
  return {
    ...row,
    lot: singleRelation(row.lot),
    tenant: singleRelation(row.tenant),
    provider: singleRelation(row.provider),
  };
}

function ticketDueAt(ticket: TicketWithRelations) {
  return typeof ticket.due_at === 'string' && ticket.due_at.trim() ? ticket.due_at : null;
}

function isOpenTicket(ticket: Ticket) {
  return ticket.status !== 'resolved' && ticket.status !== 'closed';
}

function itemToneClass(tone: AgendaItemTone) {
  if (tone === 'overdue') return 'border-red-200 bg-red-50 text-red-700';
  if (tone === 'urgent') return 'border-orange-200 bg-orange-50 text-orange-700';
  if (tone === 'stale') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (tone === 'today') return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-border bg-background text-muted-foreground';
}

function ticketTone(ticket: TicketWithRelations) {
  const dueAt = ticketDueAt(ticket);
  if (dueAt && daysFromToday(dueAt) < 0) return 'overdue';
  if (ticket.priority === 'urgent' || ticket.priority === 'high') return 'urgent';
  if (dueAt && daysFromToday(dueAt) === 0) return 'today';
  if (daysSince(ticket.updated_at) >= 7) return 'stale';
  return 'default';
}

export default function AgendaPage() {
  const { activeWorkspace } = useWorkspace();
  const supabase = createClient();
  const [data, setData] = useState<AgendaData>({
    conversations: [],
    documents: [],
    leases: [],
    lots: [],
    providers: [],
    tenants: [],
    tickets: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeWorkspace) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');

    Promise.all([
      supabase.from('conversations').select('*').eq('workspace_id', activeWorkspace.id),
      supabase.from('documents').select('*').eq('workspace_id', activeWorkspace.id),
      supabase.from('leases').select('*').eq('workspace_id', activeWorkspace.id),
      supabase.from('lots').select('*').eq('workspace_id', activeWorkspace.id),
      supabase.from('providers').select('*').eq('workspace_id', activeWorkspace.id).order('name', { ascending: true }),
      supabase.from('tenants').select('*').eq('workspace_id', activeWorkspace.id),
      supabase.from('tickets').select(TICKET_SELECT).eq('workspace_id', activeWorkspace.id).order('updated_at', { ascending: false }),
    ]).then(([conversationsRes, documentsRes, leasesRes, lotsRes, providersRes, tenantsRes, ticketsRes]) => {
      if (!active) return;
      const requestError = conversationsRes.error
        ?? documentsRes.error
        ?? leasesRes.error
        ?? lotsRes.error
        ?? providersRes.error
        ?? tenantsRes.error
        ?? ticketsRes.error;
      if (requestError) setError(requestError.message);
      setData({
        conversations: (conversationsRes.data ?? []) as Conversation[],
        documents: (documentsRes.data ?? []) as Document[],
        leases: (leasesRes.data ?? []) as Lease[],
        lots: (lotsRes.data ?? []) as Lot[],
        providers: (providersRes.data ?? []) as Provider[],
        tenants: (tenantsRes.data ?? []) as Tenant[],
        tickets: ((ticketsRes.data ?? []) as TicketWithRelations[]).map(normalizeTicket),
      });
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setError("Impossible de charger l'agenda.");
      setLoading(false);
    });

    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  const agenda = useMemo(() => {
    const lotsById = new Map(data.lots.map(lot => [lot.id, lot]));
    const tenantsById = new Map(data.tenants.map(tenant => [tenant.id, tenant]));
    const openTickets = data.tickets.filter(isOpenTicket);
    const items: AgendaItem[] = [];

    data.documents
      .filter(document => document.status === 'pending')
      .forEach(document => {
        const date = document.updated_at ?? document.created_at;
        const age = daysSince(date);
        items.push({
          id: `document-${document.id}`,
          date,
          title: 'Document à confirmer',
          detail: document.file_name,
          href: `/documents/upload?review=${document.id}`,
          kind: 'document',
          tone: age >= 2 ? 'stale' : daysFromToday(date) === 0 ? 'today' : 'default',
          badge: age > 0 ? `${age} j` : formatDate(date),
        });
      });

    data.conversations
      .filter(conversation => conversation.status !== 'closed')
      .forEach(conversation => {
        const tenant = conversation.tenant_id ? tenantsById.get(conversation.tenant_id) : null;
        const age = daysSince(conversation.last_message_at);
        items.push({
          id: `conversation-${conversation.id}`,
          date: conversation.last_message_at,
          title: conversation.status === 'pending' ? 'Réponse en attente' : 'Demande ouverte',
          detail: tenant ? `${tenant.first_name} ${tenant.last_name} · ${conversation.subject}` : conversation.subject,
          href: '/inbox',
          kind: 'conversation',
          tone: age >= 2 ? 'stale' : daysFromToday(conversation.last_message_at) === 0 ? 'today' : 'default',
          badge: age > 0 ? `${age} j` : formatDate(conversation.last_message_at),
        });
      });

    openTickets.forEach(ticket => {
      const dueAt = ticketDueAt(ticket);
      const age = daysSince(ticket.created_at);
      const stale = daysSince(ticket.updated_at);
      const tone = ticketTone(ticket);
      const lotLabel = ticket.lot ? `${ticket.lot.address}, ${ticket.lot.city}` : 'Aucun bien';
      const providerLabel = ticket.provider?.name ?? 'Non assigné';
      const title = tone === 'overdue'
        ? 'Ticket en retard'
        : ticket.status === 'waiting_provider'
          ? 'Relance prestataire'
          : ticket.priority === 'urgent'
            ? 'Ticket urgent'
            : 'Ticket ouvert';

      items.push({
        id: `ticket-${ticket.id}`,
        date: dueAt ?? ticket.updated_at,
        title,
        detail: `${ticket.title} · ${lotLabel} · ${providerLabel}`,
        href: `/tickets?ticket=${ticket.id}`,
        kind: 'ticket',
        tone,
        badge: dueAt ? formatDate(dueAt) : stale > 0 ? `${stale} j sans MAJ` : `${age} j ouvert`,
        status: ticket.status,
        priority: ticket.priority,
      });
    });

    data.leases
      .filter(lease => lease.status !== 'ended')
      .forEach(lease => {
        const lot = lotsById.get(lease.lot_id);
        const tenant = tenantsById.get(lease.tenant_id);
        const detail = [
          tenant ? `${tenant.first_name} ${tenant.last_name}` : null,
          lot ? `${lot.address}, ${lot.city}` : null,
        ].filter(Boolean).join(' · ');

        if (daysFromToday(lease.start_date) >= 0) {
          items.push({
            id: `lease-start-${lease.id}`,
            date: lease.start_date,
            title: 'Début de bail',
            detail: detail || 'Bail à suivre',
            href: lot ? `/lots/${lot.id}` : '/lots',
            kind: 'lease_start',
            tone: daysFromToday(lease.start_date) === 0 ? 'today' : 'default',
            badge: formatDate(lease.start_date),
          });
        }

        if (lease.end_date && daysFromToday(lease.end_date) >= 0) {
          items.push({
            id: `lease-end-${lease.id}`,
            date: lease.end_date,
            title: 'Fin de bail',
            detail: detail || 'Bail à suivre',
            href: lot ? `/lots/${lot.id}` : '/lots',
            kind: 'lease_end',
            tone: daysFromToday(lease.end_date) === 0 ? 'today' : 'default',
            badge: formatDate(lease.end_date),
          });
        }
      });

    const providerWorkload = data.providers
      .map(provider => {
        const providerTickets = openTickets.filter(ticket => ticket.provider_id === provider.id);
        return {
          provider,
          openCount: providerTickets.length,
          urgentCount: providerTickets.filter(ticket => ticket.priority === 'urgent' || ticket.priority === 'high').length,
          waitingCount: providerTickets.filter(ticket => ticket.status === 'waiting_provider').length,
        };
      })
      .filter(item => item.openCount > 0)
      .sort((a, b) => b.urgentCount - a.urgentCount || b.openCount - a.openCount || a.provider.name.localeCompare(b.provider.name))
      .slice(0, 5);

    return {
      items: items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      openTickets,
      providerWorkload,
      unassignedTickets: openTickets.filter(ticket => !ticket.provider_id),
      waitingProviderTickets: openTickets.filter(ticket => ticket.status === 'waiting_provider'),
    };
  }, [data]);

  const attentionItems = agenda.items
    .filter(item => item.tone === 'overdue' || item.tone === 'urgent' || item.tone === 'stale')
    .slice(0, 6);
  const overdue = agenda.items.filter(item => item.tone === 'overdue').length;
  const today = agenda.items.filter(item => daysFromToday(item.date) === 0).length;
  const urgentTickets = agenda.openTickets.filter(ticket => ticket.priority === 'urgent' || ticket.priority === 'high').length;
  const nextWeek = agenda.items.filter(item => {
    const delta = daysFromToday(item.date);
    return delta > 0 && delta <= 7;
  }).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5" />
            <h1 className="text-2xl font-semibold">Agenda</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Échéances, tickets, documents en revue et relances prestataires.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/tickets?new=1">
              <TicketIcon className="size-4" />
              Nouveau ticket
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/documents/upload">
              <FileText className="size-4" />
              Importer
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AgendaStat label="En retard" value={overdue} tone="text-red-700" />
        <AgendaStat label="Urgents" value={urgentTickets} tone="text-orange-700" />
        <AgendaStat label="Aujourd'hui" value={today} tone="text-sky-700" />
        <AgendaStat label="7 prochains jours" value={nextWeek} tone="text-brand" />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Chargement...
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-lg border bg-card">
              <SectionHeader
                title="Urgent et en retard"
                detail={`${attentionItems.length} signal${attentionItems.length > 1 ? 'aux' : ''}`}
              />
              {attentionItems.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Aucun point critique dans la file active.</p>
              ) : (
                <div className="divide-y">
                  {attentionItems.map(item => (
                    <AgendaRow key={item.id} item={item} compact />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border bg-card">
              <SectionHeader
                title="Prestataires"
                detail={`${agenda.waitingProviderTickets.length} ticket${agenda.waitingProviderTickets.length > 1 ? 's' : ''} en attente`}
              />
              <div className="divide-y">
                {agenda.unassignedTickets.length > 0 && (
                  <Link href="/tickets" className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Sans prestataire</p>
                      <p className="text-xs text-muted-foreground">Tickets à assigner</p>
                    </div>
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                      {agenda.unassignedTickets.length}
                    </Badge>
                  </Link>
                )}
                {agenda.providerWorkload.length === 0 && agenda.unassignedTickets.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Aucune charge prestataire ouverte.</p>
                ) : agenda.providerWorkload.map(({ provider, openCount, urgentCount, waitingCount }) => (
                  <Link key={provider.id} href="/prestataires" className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Wrench className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{provider.name}</p>
                        {!provider.active && (
                          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Inactif</Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{provider.specialty}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {urgentCount > 0 && (
                        <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">{urgentCount} urg.</Badge>
                      )}
                      {waitingCount > 0 && (
                        <Badge variant="secondary">{waitingCount} rel.</Badge>
                      )}
                      <Badge variant="outline">{openCount}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-lg border bg-card">
            <SectionHeader
              title="File opérationnelle"
              detail={`${agenda.items.length} échéance${agenda.items.length > 1 ? 's' : ''}`}
            />

            {agenda.items.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Aucun document, message, ticket ou bail ne demande une action immédiate.
              </div>
            ) : (
              <div className="divide-y">
                {agenda.items.map(item => (
                  <AgendaRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SourceCard icon={TicketIcon} label="Tickets ouverts" value={agenda.openTickets.length} />
            <SourceCard icon={Wrench} label="Prestataires actifs" value={data.providers.filter(provider => provider.active).length} />
            <SourceCard icon={FileText} label="Documents à confirmer" value={data.documents.filter(document => document.status === 'pending').length} />
            <SourceCard icon={MessageSquare} label="Conversations ouvertes" value={data.conversations.filter(conversation => conversation.status !== 'closed').length} />
          </div>
        </>
      )}
    </div>
  );
}

function SectionHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function AgendaRow({ item, compact = false }: { item: AgendaItem; compact?: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-4 transition-colors hover:bg-muted/50',
        compact ? 'py-3' : 'py-4',
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
        <AgendaItemIcon kind={item.kind} tone={item.tone} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{item.title}</p>
          {item.status && <TicketStatusChip status={item.status} />}
          {item.priority && <TicketPriorityChip priority={item.priority} />}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{item.detail}</p>
      </div>
      <Badge variant="outline" className={itemToneClass(item.tone)}>
        {item.badge ?? formatDate(item.date)}
      </Badge>
    </Link>
  );
}

function AgendaItemIcon({ kind, tone }: { kind: AgendaItem['kind']; tone: AgendaItemTone }) {
  if (tone === 'overdue' || tone === 'urgent') {
    return <AlertTriangle className={cn('size-4', tone === 'overdue' ? 'text-red-600' : 'text-orange-600')} />;
  }
  if (kind === 'document') return <FileText className="size-4 text-muted-foreground" />;
  if (kind === 'conversation') return <MessageSquare className="size-4 text-muted-foreground" />;
  if (kind === 'ticket') return <TicketIcon className="size-4 text-muted-foreground" />;
  return <Home className="size-4 text-muted-foreground" />;
}

function AgendaStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function SourceCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-lg font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function TicketStatusChip({ status }: { status: TicketStatus }) {
  const closed = status === 'resolved' || status === 'closed';
  return (
    <Badge variant={closed ? 'secondary' : 'outline'} className={cn('text-xs', status === 'waiting_provider' && 'border-sky-200 bg-sky-50 text-sky-700')}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function TicketPriorityChip({ priority }: { priority: TicketPriority }) {
  if (priority === 'normal') return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs',
        priority === 'urgent' && 'border-red-200 bg-red-50 text-red-700',
        priority === 'high' && 'border-orange-200 bg-orange-50 text-orange-700',
        priority === 'low' && 'text-muted-foreground',
      )}
    >
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
