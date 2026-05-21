'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Inbox,
  Mail,
  MessageSquarePlus,
  Plus,
  Sparkles,
  Ticket as TicketIcon,
  UserRound,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspace } from '@/contexts/workspace-context';
import { createClient } from '@/lib/supabase-browser';
import { cn } from '@/lib/utils';
import type {
  Lot,
  Provider,
  Tenant,
  Ticket,
  TicketEvent,
  TicketEventType,
  TicketPriority,
  TicketStatus,
} from '@/db/types';

const STATUS_VALUES = ['open', 'in_progress', 'waiting_provider', 'resolved', 'closed'] as const;
const PRIORITY_VALUES = ['low', 'normal', 'high', 'urgent'] as const;
const TICKET_PREFILL_STORAGE_PREFIX = 'isimple:ticket-prefill:';
const TICKET_SOURCE_VALUES = ['manual', 'inbox', 'gmail', 'document', 'system'] as const;
const RESPONSIBILITY_VALUES = ['tenant', 'landlord', 'provider', 'unknown'] as const;

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

const SOURCE_LABELS: Record<TicketSourceValue, string> = {
  manual: 'Saisie manuelle',
  inbox: 'Inbox isimple',
  gmail: 'Gmail',
  document: 'Document',
  system: 'Système',
};

const RESPONSIBILITY_LABELS: Record<TicketResponsibilityValue, string> = {
  tenant: 'Locataire',
  landlord: 'Propriétaire',
  provider: 'Prestataire',
  unknown: 'À qualifier',
};

const TICKET_SELECT = `
  *,
  lot:lots(id, address, city, postal_code),
  tenant:tenants(id, first_name, last_name, email),
  provider:providers(id, name, specialty, phone, email)
`;

const optionalUuid = z.string().uuid().or(z.literal(''));

const ticketSchema = z.object({
  title: z.string().trim().min(2, 'Titre requis'),
  description: z.string().trim().optional().or(z.literal('')),
  status: z.enum(STATUS_VALUES),
  priority: z.enum(PRIORITY_VALUES),
  due_at: z.string().optional().or(z.literal('')),
  lot_id: optionalUuid,
  tenant_id: optionalUuid,
  provider_id: optionalUuid,
});

type TicketForm = z.infer<typeof ticketSchema>;
type TicketSourceValue = typeof TICKET_SOURCE_VALUES[number];
type TicketResponsibilityValue = typeof RESPONSIBILITY_VALUES[number];
type TicketLot = Pick<Lot, 'id' | 'address' | 'city' | 'postal_code'>;
type TicketTenant = Pick<Tenant, 'id' | 'first_name' | 'last_name' | 'email'>;
type TicketProvider = Pick<Provider, 'id' | 'name' | 'specialty' | 'phone' | 'email'>;
type OptionalTicketFields = {
  due_at?: string | null;
  source?: TicketSourceValue | string | null;
  source_ref?: string | null;
  ai_summary?: string | null;
  responsibility?: TicketResponsibilityValue | string | null;
};
type TicketWithRelations = Ticket & {
  lot: TicketLot | null;
  tenant: TicketTenant | null;
  provider: TicketProvider | null;
} & OptionalTicketFields;
type JsonRecord = Record<string, string | number | boolean | null | undefined>;
type TicketPrefill = {
  title?: string | null;
  description?: string | null;
  status?: TicketStatus | null;
  priority?: TicketPriority | null;
  due_at?: string | null;
  lot_id?: string | null;
  tenant_id?: string | null;
  provider_id?: string | null;
  source?: TicketSourceValue | 'isimple' | null;
  source_ref?: string | null;
  source_label?: string | null;
  source_subject?: string | null;
  source_sender_name?: string | null;
  source_sender_email?: string | null;
  ai_summary?: string | null;
  ai_category?: string | null;
  ai_confidence?: number | null;
  responsibility?: TicketResponsibilityValue | null;
  gmail_message_id?: string | null;
  received_at?: string | null;
};
type TicketSourceInfo = {
  source: TicketSourceValue;
  label: string;
  detail: string;
  ref: string | null;
  sender: string | null;
  subject: string | null;
  aiSummary: string | null;
  aiCategory: string | null;
  aiConfidence: number | null;
  responsibility: TicketResponsibilityValue | null;
  receivedAt: string | null;
};
type SearchParamReader = Pick<URLSearchParams, 'get'>;

const defaultTicketValues: TicketForm = {
  title: '',
  description: '',
  status: 'open',
  priority: 'normal',
  due_at: '',
  lot_id: '',
  tenant_id: '',
  provider_id: '',
};

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

function nullableId(value: string) {
  return value ? value : null;
}

function uuidOrEmpty(value: string | null | undefined) {
  return value && optionalUuid.safeParse(value).success ? value : '';
}

function ticketStatusOrDefault(value: string | null | undefined): TicketStatus {
  return STATUS_VALUES.includes(value as TicketStatus) ? (value as TicketStatus) : 'open';
}

function ticketPriorityOrDefault(value: string | null | undefined): TicketPriority {
  return PRIORITY_VALUES.includes(value as TicketPriority) ? (value as TicketPriority) : 'normal';
}

function normalizeTicketSource(value: string | null | undefined): TicketSourceValue {
  if (value === 'isimple') return 'inbox';
  return TICKET_SOURCE_VALUES.includes(value as TicketSourceValue) ? (value as TicketSourceValue) : 'manual';
}

function normalizeResponsibility(value: string | null | undefined): TicketResponsibilityValue | null {
  return RESPONSIBILITY_VALUES.includes(value as TicketResponsibilityValue) ? (value as TicketResponsibilityValue) : null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatConfidence(value: number | null) {
  if (value === null || Number.isNaN(value)) return null;
  return `${Math.round(value * 100)}%`;
}

function toDatetimeLocalValue(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDatetimeLocalValue(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toJsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function recordString(record: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function recordNumber(record: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  }
  return null;
}

function readTicketPrefill(searchParams: SearchParamReader): TicketPrefill {
  const id = searchParams.get('prefill_id') ?? searchParams.get('prefill');
  if (id && typeof window !== 'undefined') {
    const storageKey = `${TICKET_PREFILL_STORAGE_PREFIX}${id}`;
    try {
      const stored = window.sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as TicketPrefill;
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // Fall back to query params when storage is unavailable or stale.
    }
  }

  return {
    title: searchParams.get('title'),
    description: searchParams.get('description'),
    status: ticketStatusOrDefault(searchParams.get('status')),
    priority: ticketPriorityOrDefault(searchParams.get('priority')),
    due_at: searchParams.get('due_at'),
    tenant_id: searchParams.get('tenant_id'),
    lot_id: searchParams.get('lot_id'),
    provider_id: searchParams.get('provider_id'),
    source: normalizeTicketSource(searchParams.get('source') ?? searchParams.get('source_channel')),
    source_ref: searchParams.get('source_ref') ?? searchParams.get('conversation_id') ?? searchParams.get('gmail_thread_id'),
    source_subject: searchParams.get('source_subject'),
    source_sender_name: searchParams.get('sender_name'),
    source_sender_email: searchParams.get('sender_email'),
    ai_summary: searchParams.get('ai_summary'),
    ai_category: searchParams.get('ai_category'),
    ai_confidence: searchParams.get('ai_confidence') ? Number(searchParams.get('ai_confidence')) : null,
  };
}

function createdEventMetadata(events: TicketEvent[]) {
  return toJsonRecord(events.find(event => event.event_type === 'created')?.metadata);
}

function ticketSourceInfo(ticket: TicketWithRelations, events: TicketEvent[] = []): TicketSourceInfo {
  const metadata = createdEventMetadata(events);
  const source = normalizeTicketSource(
    ticket.source
      ?? recordString(metadata, 'source', 'source_channel')
      ?? (recordString(metadata, 'source_conversation_id') ? 'inbox' : null)
      ?? (recordString(metadata, 'gmail_thread_id') ? 'gmail' : null),
  );
  const ref = ticket.source_ref ?? recordString(metadata, 'source_ref', 'source_conversation_id', 'gmail_thread_id');
  const sender = recordString(metadata, 'source_sender_name', 'sender_name')
    ?? recordString(metadata, 'source_sender_email', 'sender_email');
  const subject = recordString(metadata, 'source_subject', 'subject');
  const aiSummary = ticket.ai_summary ?? recordString(metadata, 'ai_summary');
  const responsibility = normalizeResponsibility(ticket.responsibility ?? recordString(metadata, 'responsibility'));
  const label = recordString(metadata, 'source_label') ?? SOURCE_LABELS[source];
  const detail = source === 'manual'
    ? 'Créé dans Tickets'
    : sender
    ? `${sender}${subject ? ` · ${subject}` : ''}`
    : subject ?? (ref ? `Référence ${ref}` : 'Origine non liée');

  return {
    source,
    label,
    detail,
    ref,
    sender,
    subject,
    aiSummary,
    aiCategory: recordString(metadata, 'ai_category'),
    aiConfidence: recordNumber(metadata, 'ai_confidence'),
    responsibility,
    receivedAt: recordString(metadata, 'received_at'),
  };
}

function dueAt(ticket: TicketWithRelations) {
  return typeof ticket.due_at === 'string' && ticket.due_at ? ticket.due_at : null;
}

function slaState(ticket: TicketWithRelations) {
  const due = dueAt(ticket);
  if (!due) return null;
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return null;
  const closed = ticket.status === 'resolved' || ticket.status === 'closed';
  if (closed) {
    return {
      label: 'SLA clôturé',
      detail: `Échéance ${formatDateTime(due)}`,
      className: 'border-muted-foreground/20 text-muted-foreground',
      icon: CheckCircle2,
    };
  }

  const hours = (date.getTime() - Date.now()) / 36e5;
  if (hours < 0) {
    return {
      label: 'SLA dépassé',
      detail: `Depuis ${formatDateTime(due)}`,
      className: 'border-destructive/40 bg-destructive/10 text-destructive',
      icon: AlertTriangle,
    };
  }
  if (hours <= 24) {
    return {
      label: 'À traiter < 24 h',
      detail: formatDateTime(due),
      className: 'border-amber-500/40 bg-amber-50 text-amber-700',
      icon: Clock3,
    };
  }
  if (hours <= 72) {
    return {
      label: 'À suivre bientôt',
      detail: formatDateTime(due),
      className: 'border-brand/30 bg-brand-muted text-brand',
      icon: CalendarClock,
    };
  }
  return {
    label: 'Échéance planifiée',
    detail: formatDateTime(due),
    className: 'border-border text-muted-foreground',
    icon: CalendarClock,
  };
}

export default function TicketsPage() {
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState('');
  const [createPrefill, setCreatePrefill] = useState<TicketPrefill | null>(null);

  const form = useForm<TicketForm>({
    resolver: zodResolver(ticketSchema),
    defaultValues: defaultTicketValues,
  });

  const requestedTicketId = searchParams.get('ticket');

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    (async () => {
      const [ticketsRes, providersRes, lotsRes, tenantsRes] = await Promise.all([
        supabase
          .from('tickets')
          .select(TICKET_SELECT)
          .eq('workspace_id', activeWorkspace.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('providers')
          .select('*')
          .eq('workspace_id', activeWorkspace.id)
          .order('name', { ascending: true }),
        supabase
          .from('lots')
          .select('*')
          .eq('workspace_id', activeWorkspace.id)
          .order('address', { ascending: true }),
        supabase
          .from('tenants')
          .select('*')
          .eq('workspace_id', activeWorkspace.id)
          .order('last_name', { ascending: true }),
      ]);

      const loadedTickets = ((ticketsRes.data ?? []) as TicketWithRelations[]).map(normalizeTicket);
      setTickets(loadedTickets);
      setProviders((providersRes.data ?? []) as Provider[]);
      setLots((lotsRes.data ?? []) as Lot[]);
      setTenants((tenantsRes.data ?? []) as Tenant[]);

      const nextSelected = requestedTicketId && loadedTickets.some(ticket => ticket.id === requestedTicketId)
        ? requestedTicketId
        : loadedTickets[0]?.id ?? null;
      setSelectedId(nextSelected);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  useEffect(() => {
    if (!requestedTicketId || requestedTicketId === selectedId) return;
    if (tickets.some(ticket => ticket.id === requestedTicketId)) {
      setSelectedId(requestedTicketId);
    }
  }, [requestedTicketId, selectedId, tickets]);

  useEffect(() => {
    if (!activeWorkspace || !selectedId) {
      setEvents([]);
      return;
    }
    setEventsLoading(true);
    supabase
      .from('ticket_events')
      .select('*')
      .eq('workspace_id', activeWorkspace.id)
      .eq('ticket_id', selectedId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setEvents((data ?? []) as TicketEvent[]);
        setEventsLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id, selectedId]);

  const selectedTicket = useMemo(
    () => tickets.find(ticket => ticket.id === selectedId) ?? null,
    [selectedId, tickets],
  );

  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    const prefill = readTicketPrefill(searchParams);
    setCreatePrefill(prefill);
    form.reset({
      ...defaultTicketValues,
      title: prefill.title?.slice(0, 180) ?? '',
      description: prefill.description?.slice(0, 3000) ?? '',
      status: ticketStatusOrDefault(prefill.status),
      priority: ticketPriorityOrDefault(prefill.priority),
      due_at: toDatetimeLocalValue(prefill.due_at),
      lot_id: uuidOrEmpty(prefill.lot_id),
      tenant_id: uuidOrEmpty(prefill.tenant_id),
      provider_id: uuidOrEmpty(prefill.provider_id),
    });
    setOpenCreate(true);
  }, [form, searchParams]);

  const openCount = useMemo(
    () => tickets.filter(ticket => !['resolved', 'closed'].includes(ticket.status)).length,
    [tickets],
  );

  const selectTicket = (ticketId: string) => {
    setSelectedId(ticketId);
    router.replace(`/tickets?ticket=${ticketId}`);
  };

  const insertEvent = async (
    ticketId: string,
    eventType: TicketEventType,
    title: string,
    body?: string | null,
    metadata: Record<string, string | number | null> = {},
  ) => {
    if (!activeWorkspace) return null;
    const { data } = await supabase
      .from('ticket_events')
      .insert({
        workspace_id: activeWorkspace.id,
        ticket_id: ticketId,
        event_type: eventType,
        title,
        body: body || null,
        metadata,
      })
      .select()
      .single();
    const event = data as TicketEvent | null;
    if (event && ticketId === selectedId) {
      setEvents(prev => [event, ...prev]);
    }
    return event;
  };

  const persistOptionalTicketFields = async (
    ticketId: string,
    patch: OptionalTicketFields,
  ): Promise<OptionalTicketFields> => {
    const persisted: OptionalTicketFields = {};
    const entries = Object.entries(patch).filter(([, value]) => value !== undefined);

    for (const [key, value] of entries) {
      const update = { [key]: value } as Partial<Ticket>;
      const { error } = await supabase
        .from('tickets')
        .update(update)
        .eq('id', ticketId);
      if (!error) {
        (persisted as Record<string, string | null>)[key] = value as string | null;
      }
    }

    return persisted;
  };

  const optionalTicketPatch = (values: TicketForm): OptionalTicketFields => {
    const due = fromDatetimeLocalValue(values.due_at);
    const source = normalizeTicketSource(createPrefill?.source ?? null);
    return {
      due_at: due,
      source,
      source_ref: createPrefill?.source_ref ?? null,
      ai_summary: createPrefill?.ai_summary ?? null,
      responsibility: createPrefill?.responsibility ?? null,
    };
  };

  const createEventMetadata = (values: TicketForm) => {
    const due = fromDatetimeLocalValue(values.due_at);
    const source = normalizeTicketSource(createPrefill?.source ?? null);
    const metadata: Record<string, string | number | null> = {};
    if (due) metadata.due_at = due;
    if (source !== 'manual') metadata.source = source;
    if (createPrefill?.source_ref) metadata.source_ref = createPrefill.source_ref;
    if (createPrefill?.source_label) metadata.source_label = createPrefill.source_label;
    if (createPrefill?.source_subject) metadata.source_subject = createPrefill.source_subject;
    if (createPrefill?.source_sender_name) metadata.source_sender_name = createPrefill.source_sender_name;
    if (createPrefill?.source_sender_email) metadata.source_sender_email = createPrefill.source_sender_email;
    if (createPrefill?.ai_summary) metadata.ai_summary = createPrefill.ai_summary;
    if (createPrefill?.ai_category) metadata.ai_category = createPrefill.ai_category;
    if (typeof createPrefill?.ai_confidence === 'number') metadata.ai_confidence = createPrefill.ai_confidence;
    if (createPrefill?.responsibility) metadata.responsibility = createPrefill.responsibility;
    if (createPrefill?.gmail_message_id) metadata.gmail_message_id = createPrefill.gmail_message_id;
    if (createPrefill?.received_at) metadata.received_at = createPrefill.received_at;
    return metadata;
  };

  const createTicket = async (values: TicketForm) => {
    if (!activeWorkspace) return;
    setSaving(true);
    setActionError('');

    const { data, error } = await supabase
      .from('tickets')
      .insert({
        workspace_id: activeWorkspace.id,
        title: values.title,
        description: values.description || null,
        status: values.status,
        priority: values.priority,
        lot_id: nullableId(values.lot_id),
        tenant_id: nullableId(values.tenant_id),
        provider_id: nullableId(values.provider_id),
      })
      .select(TICKET_SELECT)
      .single();

    if (error) {
      setActionError(error.message);
      setSaving(false);
      return;
    }

    const optionalPatch = optionalTicketPatch(values);
    const persistedOptionalFields = await persistOptionalTicketFields((data as Ticket).id, optionalPatch);
    const ticket = normalizeTicket({
      ...(data as TicketWithRelations),
      ...persistedOptionalFields,
    } as TicketWithRelations);
    setTickets(prev => [ticket, ...prev]);
    setSelectedId(ticket.id);
    router.replace(`/tickets?ticket=${ticket.id}`);
    const metadata = createEventMetadata(values);
    const source = ticketSourceInfo({ ...ticket, ...optionalPatch } as TicketWithRelations, []);
    await insertEvent(
      ticket.id,
      'created',
      source.source === 'manual' ? 'Ticket créé' : `Ticket créé depuis ${source.label}`,
      ticket.description,
      metadata,
    );
    setOpenCreate(false);
    setSaving(false);
    setNote('');
    setCreatePrefill(null);
    form.reset(defaultTicketValues);
  };

  const updateTicket = async (
    updates: Partial<Pick<Ticket, 'status' | 'priority' | 'provider_id'>>,
    eventType: TicketEventType,
    title: string,
    body: string,
    metadata: Record<string, string | number | null>,
  ) => {
    if (!selectedTicket) return;
    setActionError('');
    const { data, error } = await supabase
      .from('tickets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', selectedTicket.id)
      .select(TICKET_SELECT)
      .single();

    if (error) {
      setActionError(error.message);
      return;
    }

    const updated = normalizeTicket(data as TicketWithRelations);
    setTickets(prev => prev.map(ticket => ticket.id === updated.id ? updated : ticket));
    await insertEvent(updated.id, eventType, title, body, metadata);
  };

  const handleStatusChange = (status: TicketStatus) => {
    if (!selectedTicket || status === selectedTicket.status) return;
    updateTicket(
      { status },
      'status_changed',
      'Statut mis à jour',
      `${STATUS_LABELS[selectedTicket.status]} -> ${STATUS_LABELS[status]}`,
      { from: selectedTicket.status, to: status },
    );
  };

  const handlePriorityChange = (priority: TicketPriority) => {
    if (!selectedTicket || priority === selectedTicket.priority) return;
    updateTicket(
      { priority },
      'priority_changed',
      'Priorité mise à jour',
      `${PRIORITY_LABELS[selectedTicket.priority]} -> ${PRIORITY_LABELS[priority]}`,
      { from: selectedTicket.priority, to: priority },
    );
  };

  const handleProviderChange = (providerId: string) => {
    if (!selectedTicket || nullableId(providerId) === selectedTicket.provider_id) return;
    const provider = providers.find(item => item.id === providerId);
    updateTicket(
      { provider_id: nullableId(providerId) },
      'provider_changed',
      provider ? 'Prestataire assigné' : 'Prestataire retiré',
      provider ? provider.name : 'Aucun prestataire',
      { from: selectedTicket.provider_id, to: nullableId(providerId) },
    );
  };

  const addNote = async () => {
    if (!selectedTicket || !note.trim()) return;
    setSaving(true);
    await insertEvent(selectedTicket.id, 'note', 'Note ajoutée', note.trim());
    setNote('');
    setSaving(false);
  };

  const resetCreateDialog = (open: boolean) => {
    setOpenCreate(open);
    if (!open) {
      setActionError('');
      setCreatePrefill(null);
      form.reset(defaultTicketValues);
      if (searchParams.get('new') === '1') router.replace('/tickets');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tickets.length} tickets, {openCount} à suivre
          </p>
        </div>
        <Button size="sm" onClick={() => setOpenCreate(true)}>
          <Plus className="size-4" />
          Nouveau ticket
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : tickets.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
            <TicketIcon className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Aucun ticket pour l’instant.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Créez un ticket pour suivre une demande, assigner un prestataire et garder l’historique.
          </p>
          <Button variant="outline" size="sm" onClick={() => setOpenCreate(true)} className="mt-4">
            <Plus className="size-4" />
            Créer un ticket
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.45fr)]">
          <div className="rounded-lg border bg-card divide-y overflow-hidden">
            {tickets.map(ticket => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => selectTicket(ticket.id)}
                className={cn(
                  'flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/40',
                  selectedId === ticket.id && 'bg-muted/60',
                )}
              >
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-background border">
                  {ticket.priority === 'urgent' ? (
                    <CircleAlert className="size-4 text-destructive" />
                  ) : (
                    <TicketIcon className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{ticket.title}</p>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {ticket.lot ? `${ticket.lot.address}, ${ticket.lot.city}` : 'Aucun bien associé'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <PriorityBadge priority={ticket.priority} />
                    <SourceBadge source={ticketSourceInfo(ticket)} compact />
                    <SlaBadge ticket={ticket} compact />
                    {ticket.provider && (
                      <Badge variant="secondary" className="text-xs">
                        {ticket.provider.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <TicketDetail
            ticket={selectedTicket}
            providers={providers}
            events={events}
            eventsLoading={eventsLoading}
            note={note}
            saving={saving}
            actionError={actionError}
            onNoteChange={setNote}
            onAddNote={addNote}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onProviderChange={handleProviderChange}
          />
        </div>
      )}

      <Dialog open={openCreate} onOpenChange={resetCreateDialog}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau ticket</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(createTicket)} className="space-y-4">
            {createPrefill && (
              <CreatePrefillPanel prefill={createPrefill} />
            )}
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input {...form.register('title')} placeholder="Fuite sous évier" />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                {...form.register('description')}
                rows={4}
                className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                placeholder="Contexte, urgence, prochaines actions..."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField label="Statut" registration={form.register('status')}>
                {STATUS_VALUES.map(status => (
                  <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                ))}
              </SelectField>
              <SelectField label="Priorité" registration={form.register('priority')}>
                {PRIORITY_VALUES.map(priority => (
                  <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>
                ))}
              </SelectField>
              <div className="space-y-2">
                <Label>Échéance SLA</Label>
                <Input type="datetime-local" {...form.register('due_at')} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label="Bien" registration={form.register('lot_id')}>
                <option value="">Aucun bien</option>
                {lots.map(lot => (
                  <option key={lot.id} value={lot.id}>{lot.address}, {lot.city}</option>
                ))}
              </SelectField>
              <SelectField label="Locataire" registration={form.register('tenant_id')}>
                <option value="">Aucun locataire</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.first_name} {tenant.last_name}
                  </option>
                ))}
              </SelectField>
            </div>
            <SelectField label="Prestataire" registration={form.register('provider_id')}>
              <option value="">Aucun prestataire</option>
              {providers.map(provider => (
                <option key={provider.id} value={provider.id}>{provider.name}</option>
              ))}
            </SelectField>
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => resetCreateDialog(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreatePrefillPanel({ prefill }: { prefill: TicketPrefill }) {
  const source = normalizeTicketSource(prefill.source ?? null);
  const confidence = formatConfidence(typeof prefill.ai_confidence === 'number' ? prefill.ai_confidence : null);

  return (
    <div className="space-y-2 rounded-md bg-muted/50 p-3 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <SourceIcon source={source} className="size-4 text-brand" />
        Prérempli depuis {prefill.source_label ?? SOURCE_LABELS[source]}
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground">
        {prefill.source_sender_name && <span>Contact : {prefill.source_sender_name}</span>}
        {prefill.source_sender_email && <span>Email : {prefill.source_sender_email}</span>}
        {prefill.source_subject && <span>Sujet : {prefill.source_subject}</span>}
        {prefill.ai_summary && (
          <span>
            IA : {prefill.ai_summary}
            {prefill.ai_category && ` · ${prefill.ai_category}`}
            {confidence && ` · ${confidence}`}
          </span>
        )}
      </div>
    </div>
  );
}

function TicketDetail({
  ticket,
  providers,
  events,
  eventsLoading,
  note,
  saving,
  actionError,
  onNoteChange,
  onAddNote,
  onStatusChange,
  onPriorityChange,
  onProviderChange,
}: {
  ticket: TicketWithRelations | null;
  providers: Provider[];
  events: TicketEvent[];
  eventsLoading: boolean;
  note: string;
  saving: boolean;
  actionError: string;
  onNoteChange: (value: string) => void;
  onAddNote: () => void;
  onStatusChange: (status: TicketStatus) => void;
  onPriorityChange: (priority: TicketPriority) => void;
  onProviderChange: (providerId: string) => void;
}) {
  if (!ticket) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        Sélectionnez un ticket.
      </div>
    );
  }

  const source = ticketSourceInfo(ticket, events);
  const sla = slaState(ticket);
  const confidence = formatConfidence(source.aiConfidence);

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{ticket.title}</h2>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <SourceIcon source={source.source} className="size-3.5" />
                {source.label}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-3.5" />
                {formatDate(ticket.updated_at)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Wrench className="size-3.5" />
                {ticket.provider?.name ?? 'Aucun prestataire'}
              </span>
              <span className="inline-flex items-center gap-1">
                <UserRound className="size-3.5" />
                {ticket.tenant ? `${ticket.tenant.first_name} ${ticket.tenant.last_name}` : 'Aucun locataire'}
              </span>
            </div>
          </div>
        </div>
        {ticket.description && (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {ticket.description}
          </p>
        )}
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div className="border-l-2 border-brand/30 pl-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Source</p>
            <p className="mt-1 font-medium">{source.detail}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {source.ref && <span>Réf. {source.ref}</span>}
              {source.receivedAt && <span>Reçu {formatDateTime(source.receivedAt)}</span>}
              {source.responsibility && <span>Responsabilité {RESPONSIBILITY_LABELS[source.responsibility]}</span>}
            </div>
            {(source.aiSummary || source.aiCategory) && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 size-3.5 text-brand" />
                <span>
                  {source.aiSummary ?? 'Suggestion IA importée'}
                  {source.aiCategory && ` · ${source.aiCategory}`}
                  {confidence && ` · ${confidence}`}
                </span>
              </div>
            )}
          </div>
          {sla && (
            <div className="border-l-2 border-amber-500/40 pl-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">SLA</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <SlaBadge ticket={ticket} />
                <span className="text-xs text-muted-foreground">{sla.detail}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 border-b p-5 md:grid-cols-3">
        <SelectField label="Statut" value={ticket.status} onChange={e => onStatusChange(e.target.value as TicketStatus)}>
          {STATUS_VALUES.map(status => (
            <option key={status} value={status}>{STATUS_LABELS[status]}</option>
          ))}
        </SelectField>
        <SelectField label="Priorité" value={ticket.priority} onChange={e => onPriorityChange(e.target.value as TicketPriority)}>
          {PRIORITY_VALUES.map(priority => (
            <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>
          ))}
        </SelectField>
        <SelectField label="Prestataire" value={ticket.provider_id ?? ''} onChange={e => onProviderChange(e.target.value)}>
          <option value="">Aucun prestataire</option>
          {providers.map(provider => (
            <option key={provider.id} value={provider.id}>{provider.name}</option>
          ))}
        </SelectField>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Historique</h3>
          <Badge variant="secondary" className="text-xs">{events.length}</Badge>
        </div>

        <div className="space-y-2">
          <textarea
            value={note}
            onChange={e => onNoteChange(e.target.value)}
            rows={3}
            className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
            placeholder="Ajouter une note au ticket..."
          />
          <div className="flex justify-end">
            <Button size="sm" type="button" onClick={onAddNote} disabled={saving || !note.trim()}>
              <MessageSquarePlus className="size-4" />
              Ajouter une note
            </Button>
          </div>
        </div>

        {actionError && <p className="text-sm text-destructive">{actionError}</p>}

        {eventsLoading ? (
          <p className="text-sm text-muted-foreground">Chargement de l’historique...</p>
        ) : events.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucun événement pour ce ticket.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="flex gap-3">
                <EventIcon type={event.event_type} />
                <div className="min-w-0 flex-1 rounded-lg border bg-background p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{event.title}</p>
                    <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
                  </div>
                  {event.body && (
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {event.body}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SelectField({
  label,
  children,
  registration,
  value,
  onChange,
}: {
  label: string;
  children: React.ReactNode;
  registration?: UseFormRegisterReturn;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
}) {
  const controlledProps = value !== undefined ? { value } : {};

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        {...registration}
        {...controlledProps}
        onChange={onChange ?? registration?.onChange}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
      >
        {children}
      </select>
    </div>
  );
}

function SourceIcon({
  source,
  className,
}: {
  source: TicketSourceValue;
  className?: string;
}) {
  const Icon = source === 'gmail'
    ? Mail
    : source === 'inbox'
      ? Inbox
      : source === 'document'
        ? MessageSquarePlus
        : TicketIcon;
  return <Icon className={className} />;
}

function SourceBadge({
  source,
  compact = false,
}: {
  source: TicketSourceInfo;
  compact?: boolean;
}) {
  return (
    <Badge variant="outline" className="gap-1 text-xs">
      <SourceIcon source={source.source} className="size-3" />
      {compact ? SOURCE_LABELS[source.source].replace(' isimple', '') : source.label}
    </Badge>
  );
}

function SlaBadge({
  ticket,
  compact = false,
}: {
  ticket: TicketWithRelations;
  compact?: boolean;
}) {
  const state = slaState(ticket);
  if (!state) return null;
  const Icon = state.icon;
  return (
    <Badge variant="outline" className={cn('gap-1 text-xs', state.className)}>
      <Icon className="size-3" />
      {compact ? state.label.replace('SLA ', '') : state.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const closed = status === 'resolved' || status === 'closed';
  return (
    <Badge variant={closed ? 'secondary' : 'default'} className="text-xs">
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs',
        priority === 'urgent' && 'border-destructive/40 text-destructive',
        priority === 'high' && 'border-amber-500/50 text-amber-700',
        priority === 'low' && 'text-muted-foreground',
      )}
    >
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

function EventIcon({ type }: { type: TicketEventType }) {
  const Icon = type === 'created'
    ? TicketIcon
    : type === 'status_changed'
      ? CheckCircle2
      : type === 'note'
        ? MessageSquarePlus
        : type === 'provider_changed'
          ? Wrench
          : Clock3;

  return (
    <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background">
      <Icon className="size-3.5 text-muted-foreground" />
    </div>
  );
}
