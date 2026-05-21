'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  BarChart3,
  Building2,
  CalendarClock,
  Clock3,
  FileText,
  Loader2,
  Ticket as TicketIcon,
  TrendingUp,
  Users,
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
type TicketProvider = Pick<Provider, 'id' | 'name' | 'specialty' | 'active'>;
type TicketWithRelations = Ticket & {
  due_at?: string | null;
  lot: TicketLot | null;
  provider: TicketProvider | null;
};

type AnalyticsData = {
  conversations: Conversation[];
  documents: Document[];
  leases: Lease[];
  lots: Lot[];
  providers: Provider[];
  tenants: Tenant[];
  tickets: TicketWithRelations[];
};

type HealthLevel = 'healthy' | 'watch' | 'critical';

const DAY_MS = 24 * 60 * 60 * 1000;

const TICKET_SELECT = `
  *,
  lot:lots(id, address, city),
  provider:providers(id, name, specialty, active)
`;

const euros = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const DOC_TYPE_LABELS: Record<string, string> = {
  bail: 'Baux',
  caution: 'Cautions',
  quittance: 'Quittances',
  etat_des_lieux: 'États des lieux',
  assurance: 'Assurances',
  rib: 'RIB',
  caf: 'CAF',
  piece_identite: 'Identités',
  mandat: 'Mandats',
  facture: 'Factures',
  autre: 'Autres',
};

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

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeTicket(row: TicketWithRelations): TicketWithRelations {
  return {
    ...row,
    lot: singleRelation(row.lot),
    provider: singleRelation(row.provider),
  };
}

function ticketDueAt(ticket: TicketWithRelations) {
  return typeof ticket.due_at === 'string' && ticket.due_at.trim() ? ticket.due_at : null;
}

function isOpenTicket(ticket: Ticket) {
  return ticket.status !== 'resolved' && ticket.status !== 'closed';
}

function isUrgent(ticket: Ticket) {
  return ticket.priority === 'urgent' || ticket.priority === 'high';
}

function isOverdue(ticket: TicketWithRelations) {
  const dueAt = ticketDueAt(ticket);
  return !!dueAt && daysFromToday(dueAt) < 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function AnalyticsPage() {
  const { activeWorkspace } = useWorkspace();
  const supabase = createClient();
  const [data, setData] = useState<AnalyticsData>({
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
      setError('Impossible de charger les analytiques.');
      setLoading(false);
    });

    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  const metrics = useMemo(() => {
    const activeLeases = data.leases.filter(lease => lease.status === 'active');
    const occupiedLotIds = new Set(activeLeases.map(lease => lease.lot_id));
    const monthlyRevenue = activeLeases.reduce((sum, lease) => sum + lease.rent_amount + lease.charges_amount, 0);
    const occupancy = data.lots.length > 0 ? Math.round((occupiedLotIds.size / data.lots.length) * 100) : 0;
    const pendingDocs = data.documents.filter(document => document.status === 'pending').length;
    const confirmedDocs = data.documents.filter(document => document.status === 'confirmed').length;
    const openTickets = data.tickets.filter(isOpenTicket);
    const urgentTickets = openTickets.filter(isUrgent);
    const overdueTickets = openTickets.filter(isOverdue);
    const waitingProviderTickets = openTickets.filter(ticket => ticket.status === 'waiting_provider');
    const unassignedTickets = openTickets.filter(ticket => !ticket.provider_id);
    const activeProviders = data.providers.filter(provider => provider.active);
    const averageOpenAge = openTickets.length > 0
      ? Math.round(openTickets.reduce((sum, ticket) => sum + daysSince(ticket.created_at), 0) / openTickets.length)
      : 0;

    const docsByType = Object.entries(data.documents.reduce<Record<string, number>>((acc, document) => {
      acc[document.doc_type] = (acc[document.doc_type] ?? 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]);

    const agingBuckets = [
      { label: '0-2 j', count: openTickets.filter(ticket => daysSince(ticket.created_at) <= 2).length },
      { label: '3-7 j', count: openTickets.filter(ticket => {
        const age = daysSince(ticket.created_at);
        return age >= 3 && age <= 7;
      }).length },
      { label: '8-14 j', count: openTickets.filter(ticket => {
        const age = daysSince(ticket.created_at);
        return age >= 8 && age <= 14;
      }).length },
      { label: '15 j+', count: openTickets.filter(ticket => daysSince(ticket.created_at) >= 15).length },
    ];

    const providerWorkload = data.providers
      .map(provider => {
        const providerTickets = openTickets.filter(ticket => ticket.provider_id === provider.id);
        return {
          id: provider.id,
          name: provider.name,
          specialty: provider.specialty,
          active: provider.active,
          openCount: providerTickets.length,
          urgentCount: providerTickets.filter(isUrgent).length,
          waitingCount: providerTickets.filter(ticket => ticket.status === 'waiting_provider').length,
          oldestAge: providerTickets.reduce((max, ticket) => Math.max(max, daysSince(ticket.created_at)), 0),
        };
      })
      .filter(provider => provider.openCount > 0)
      .sort((a, b) => b.urgentCount - a.urgentCount || b.openCount - a.openCount || b.oldestAge - a.oldestAge)
      .slice(0, 6);

    const ticketsByLot = openTickets.reduce<Map<string, TicketWithRelations[]>>((acc, ticket) => {
      if (!ticket.lot_id) return acc;
      const next = acc.get(ticket.lot_id) ?? [];
      next.push(ticket);
      acc.set(ticket.lot_id, next);
      return acc;
    }, new Map());

    const docsByLot = data.documents.reduce<Map<string, Document[]>>((acc, document) => {
      if (!document.lot_id) return acc;
      const next = acc.get(document.lot_id) ?? [];
      next.push(document);
      acc.set(document.lot_id, next);
      return acc;
    }, new Map());

    const propertyHealth = data.lots
      .map(lot => {
        const lotTickets = ticketsByLot.get(lot.id) ?? [];
        const lotDocs = docsByLot.get(lot.id) ?? [];
        const hasActiveLease = occupiedLotIds.has(lot.id);
        const pendingLotDocs = lotDocs.filter(document => document.status === 'pending').length;
        const urgentLotTickets = lotTickets.filter(isUrgent).length;
        const overdueLotTickets = lotTickets.filter(isOverdue).length;
        const score = clampScore(
          100
          - (hasActiveLease ? 0 : 35)
          - Math.min(36, lotTickets.length * 8)
          - Math.min(24, urgentLotTickets * 12)
          - Math.min(24, overdueLotTickets * 16)
          - Math.min(24, pendingLotDocs * 8),
        );
        const level: HealthLevel = score < 55 ? 'critical' : score < 80 ? 'watch' : 'healthy';
        const issues = [
          !hasActiveLease ? 'Sans bail actif' : null,
          lotTickets.length > 0 ? `${lotTickets.length} ticket${lotTickets.length > 1 ? 's' : ''} ouvert${lotTickets.length > 1 ? 's' : ''}` : null,
          overdueLotTickets > 0 ? `${overdueLotTickets} en retard` : null,
          pendingLotDocs > 0 ? `${pendingLotDocs} document${pendingLotDocs > 1 ? 's' : ''} à revoir` : null,
        ].filter(Boolean) as string[];
        return { lot, score, level, issues, openTickets: lotTickets.length, urgentTickets: urgentLotTickets };
      })
      .sort((a, b) => a.score - b.score || b.openTickets - a.openTickets)
      .slice(0, 6);

    return {
      activeLeases,
      activeProviders,
      agingBuckets,
      averageOpenAge,
      confirmedDocs,
      docsByType,
      monthlyRevenue,
      occupancy,
      openTickets,
      overdueTickets,
      pendingDocs,
      propertyHealth,
      providerWorkload,
      unassignedTickets,
      urgentTickets,
      waitingProviderTickets,
    };
  }, [data]);

  const maxAgingBucket = Math.max(1, ...metrics.agingBuckets.map(bucket => bucket.count));
  const maxProviderLoad = Math.max(1, ...metrics.providerWorkload.map(provider => provider.openCount), metrics.unassignedTickets.length);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5" />
            <h1 className="text-2xl font-semibold">Pilotage</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Santé du portefeuille, tickets ouverts et charge prestataire.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/tickets">
              <TicketIcon className="size-4" />
              Voir les tickets
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/prestataires">
              <Wrench className="size-4" />
              Prestataires
            </Link>
          </Button>
        </div>
      </header>

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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={TrendingUp} label="Loyers mensuels actifs" value={euros.format(metrics.monthlyRevenue)} />
            <MetricCard icon={Building2} label="Occupation" value={`${metrics.occupancy} %`} detail={`${metrics.activeLeases.length} bail${metrics.activeLeases.length > 1 ? 's' : ''} actif${metrics.activeLeases.length > 1 ? 's' : ''}`} />
            <MetricCard icon={TicketIcon} label="Tickets ouverts" value={metrics.openTickets.length} detail={`${metrics.urgentTickets.length} urgent${metrics.urgentTickets.length > 1 ? 's' : ''}, ${metrics.overdueTickets.length} en retard`} />
            <MetricCard icon={Wrench} label="Prestataires actifs" value={metrics.activeProviders.length} detail={`${metrics.waitingProviderTickets.length} relance${metrics.waitingProviderTickets.length > 1 ? 's' : ''} prestataire`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-lg border bg-card">
              <SectionHeader
                title="Santé des biens"
                detail={`${data.lots.length} bien${data.lots.length > 1 ? 's' : ''}, signaux triés par risque`}
              />
              <div className="divide-y">
                {metrics.propertyHealth.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Aucun bien à analyser.</p>
                ) : metrics.propertyHealth.map(item => (
                  <Link
                    key={item.lot.id}
                    href={`/lots/${item.lot.id}`}
                    className="block px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.lot.address}, {item.lot.city}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {item.issues.length > 0 ? item.issues.join(' · ') : 'Aucun signal actif'}
                        </p>
                      </div>
                      <HealthBadge level={item.level} />
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div className={cn('h-full rounded-full', healthBarClass(item.level))} style={{ width: `${item.score}%` }} />
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-lg border bg-card">
              <SectionHeader
                title="Âge tickets ouverts"
                detail={`${metrics.averageOpenAge} j en moyenne`}
              />
              <div className="space-y-4 p-4">
                {metrics.openTickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun ticket ouvert.</p>
                ) : metrics.agingBuckets.map(bucket => {
                  const pct = Math.round((bucket.count / maxAgingBucket) * 100);
                  return (
                    <div key={bucket.label} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span>{bucket.label}</span>
                        <span className="text-muted-foreground">{bucket.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-full rounded-full', bucket.label === '15 j+' ? 'bg-red-500' : bucket.label === '8-14 j' ? 'bg-amber-500' : 'bg-brand')}
                          style={{ width: `${bucket.count > 0 ? Math.max(8, pct) : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-lg border bg-card">
              <SectionHeader
                title="Charge prestataires"
                detail={`${metrics.openTickets.length} ticket${metrics.openTickets.length > 1 ? 's' : ''} ouvert${metrics.openTickets.length > 1 ? 's' : ''}`}
              />
              <div className="divide-y">
                {metrics.unassignedTickets.length > 0 && (
                  <ProviderLoadRow
                    href="/tickets"
                    name="Sans prestataire"
                    detail="À assigner"
                    openCount={metrics.unassignedTickets.length}
                    urgentCount={metrics.unassignedTickets.filter(isUrgent).length}
                    waitingCount={0}
                    max={maxProviderLoad}
                    active
                  />
                )}
                {metrics.providerWorkload.length === 0 && metrics.unassignedTickets.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Aucune charge prestataire ouverte.</p>
                ) : metrics.providerWorkload.map(provider => (
                  <ProviderLoadRow
                    key={provider.id}
                    href="/prestataires"
                    name={provider.name}
                    detail={`${provider.specialty} · plus ancien ${provider.oldestAge} j`}
                    openCount={provider.openCount}
                    urgentCount={provider.urgentCount}
                    waitingCount={provider.waitingCount}
                    max={maxProviderLoad}
                    active={provider.active}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-lg border bg-card">
              <SectionHeader
                title="File d'attention"
                detail="Tickets, documents, messages"
              />
              <div className="divide-y">
                <AttentionRow icon={TicketIcon} label="Tickets urgents" value={metrics.urgentTickets.length} tone="orange" href="/tickets" />
                <AttentionRow icon={CalendarClock} label="Tickets en retard" value={metrics.overdueTickets.length} tone="red" href="/tickets" />
                <AttentionRow icon={Wrench} label="En attente prestataire" value={metrics.waitingProviderTickets.length} tone="sky" href="/tickets" />
                <AttentionRow icon={FileText} label="Documents à confirmer" value={metrics.pendingDocs} tone="amber" href="/documents/upload" />
                <AttentionRow icon={Clock3} label="Conversations ouvertes" value={data.conversations.filter(conversation => conversation.status !== 'closed').length} tone="default" href="/inbox" />
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-lg border bg-card">
              <SectionHeader
                title="Répartition documentaire"
                detail={`${data.documents.length} document${data.documents.length > 1 ? 's' : ''}`}
              />
              <div className="space-y-3 p-4">
                {metrics.docsByType.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun document importé.</p>
                ) : metrics.docsByType.slice(0, 8).map(([type, count]) => {
                  const pct = data.documents.length > 0 ? Math.round((count / data.documents.length) * 100) : 0;
                  return (
                    <div key={type} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span>{DOC_TYPE_LABELS[type] ?? type}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <SmallFact icon={Building2} label="Biens" value={data.lots.length} />
              <SmallFact icon={Users} label="Locataires" value={data.tenants.length} />
              <SmallFact icon={FileText} label="Documents confirmés" value={metrics.confirmedDocs} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SectionHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border-b px-4 py-3">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex size-9 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

function ProviderLoadRow({
  href,
  name,
  detail,
  openCount,
  urgentCount,
  waitingCount,
  max,
  active,
}: {
  href: string;
  name: string;
  detail: string;
  openCount: number;
  urgentCount: number;
  waitingCount: number;
  max: number;
  active: boolean;
}) {
  const pct = Math.round((openCount / max) * 100);
  return (
    <Link href={href} className="block px-4 py-3 transition-colors hover:bg-muted/50">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{name}</p>
            {!active && (
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Inactif</Badge>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {urgentCount > 0 && <PriorityBadge priority="urgent" count={urgentCount} />}
          {waitingCount > 0 && <StatusBadge status="waiting_provider" count={waitingCount} />}
          <Badge variant="outline">{openCount}</Badge>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(8, pct)}%` }} />
      </div>
    </Link>
  );
}

function AttentionRow({
  icon: Icon,
  label,
  value,
  tone,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: 'red' | 'orange' | 'amber' | 'sky' | 'default';
  href: string;
}) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <Badge variant="outline" className={attentionToneClass(tone)}>{value}</Badge>
    </Link>
  );
}

function SmallFact({
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

function HealthBadge({ level }: { level: HealthLevel }) {
  if (level === 'critical') {
    return <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Critique</Badge>;
  }
  if (level === 'watch') {
    return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">À surveiller</Badge>;
  }
  return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Sain</Badge>;
}

function healthBarClass(level: HealthLevel) {
  if (level === 'critical') return 'bg-red-500';
  if (level === 'watch') return 'bg-amber-500';
  return 'bg-emerald-500';
}

function attentionToneClass(tone: 'red' | 'orange' | 'amber' | 'sky' | 'default') {
  if (tone === 'red') return 'border-red-200 bg-red-50 text-red-700';
  if (tone === 'orange') return 'border-orange-200 bg-orange-50 text-orange-700';
  if (tone === 'amber') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (tone === 'sky') return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-border bg-background text-muted-foreground';
}

function StatusBadge({ status, count }: { status: TicketStatus; count: number }) {
  return (
    <Badge variant="outline" className={cn('border-sky-200 bg-sky-50 text-sky-700')}>
      {count} {STATUS_LABELS[status]}
    </Badge>
  );
}

function PriorityBadge({ priority, count }: { priority: TicketPriority; count: number }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        priority === 'urgent' && 'border-red-200 bg-red-50 text-red-700',
        priority === 'high' && 'border-orange-200 bg-orange-50 text-orange-700',
        priority === 'low' && 'text-muted-foreground',
      )}
    >
      {count} {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
