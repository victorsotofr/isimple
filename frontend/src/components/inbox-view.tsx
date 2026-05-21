'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Bot, CheckCircle2, ExternalLink, FileText, Mail, MessageCircle, MessageSquare, Paperclip, Plus, RefreshCw, Send, Sparkles, Upload, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useWorkspace } from '@/contexts/workspace-context';
import { useLanguage } from '@/contexts/language-context';
import { createClient } from '@/lib/supabase-browser';
import { cn } from '@/lib/utils';
import type { Conversation, Document, Message, Tenant } from '@/db';

type ConversationWithTenant = Conversation & { tenants: Pick<Tenant, 'first_name' | 'last_name'> | null };

type GmailConnectionSummary = {
  id: string;
  email: string;
  status: 'connected' | 'revoked' | 'error';
  last_sync_at: string | null;
};

type GmailThreadMessage = {
  id: string;
  message_id: string;
  rfc_message_id: string | null;
  references: string | null;
  from_email: string | null;
  from_name: string | null;
  to_emails: string[];
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  received_at: string | null;
  labels: string[];
  unread: boolean;
  direction: 'incoming' | 'outgoing';
};

type GmailThreadSummary = {
  id: string;
  thread_id: string;
  message_id: string | null;
  from_email: string | null;
  from_name: string | null;
  reply_to_email: string | null;
  reply_to_name: string | null;
  to_emails: string[];
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  received_at: string | null;
  labels: string[];
  unread: boolean;
  messages: GmailThreadMessage[];
};

type GmailSuggestedDocument = Pick<Document, 'id' | 'file_name' | 'doc_type' | 'status' | 'lot_id' | 'tenant_id' | 'created_at' | 'updated_at'>;

type SourceFilter = 'all' | 'isimple' | 'gmail' | 'whatsapp';
type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
type TicketPrefillSource = 'inbox' | 'gmail';
type TicketPrefill = {
  title: string;
  description: string;
  priority?: TicketPriority;
  due_at?: string | null;
  tenant_id?: string | null;
  source: TicketPrefillSource;
  source_ref: string;
  source_label: string;
  source_subject?: string | null;
  source_sender_name?: string | null;
  source_sender_email?: string | null;
  ai_summary?: string | null;
  ai_category?: string | null;
  ai_confidence?: number | null;
  responsibility?: 'tenant' | 'landlord' | 'provider' | 'unknown' | null;
  gmail_message_id?: string | null;
  received_at?: string | null;
};
type AiClassificationPreview = {
  category: string;
  confidence: number;
  summary: string;
  tenant_id?: string | null;
  identity_confidence?: number | null;
  model?: string | null;
  latency_ms?: number | null;
};
type AiDraftPreview = {
  draft: string;
  subject: string;
  tenant_id?: string | null;
  identity_confidence?: number | null;
  model?: string | null;
  latency_ms?: number | null;
};
type AiPreviewState = {
  targetKey: string;
  classification: AiClassificationPreview | null;
  draft: AiDraftPreview | null;
  classifying: boolean;
  drafting: boolean;
  error: string;
};
type AiTarget = {
  key: string;
  channel: 'Gmail' | 'Inbox';
  subject: string;
  message: string;
  context: string;
  tenantId: string | null;
  conversationId?: string | null;
  senderEmail?: string | null;
  recipientName?: string | null;
};

const TICKET_PREFILL_STORAGE_PREFIX = 'isimple:ticket-prefill:';

const CATEGORY_COLORS: Record<Conversation['category'], string> = {
  maintenance: 'bg-orange-100 text-orange-700 border-orange-200',
  paiement: 'bg-blue-100 text-blue-700 border-blue-200',
  réclamation: 'bg-red-100 text-red-700 border-red-200',
  document: 'bg-brand-muted text-brand border-brand/20',
  information: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  autre: 'bg-muted text-muted-foreground border-border',
};

const STATUS_STYLES: Record<Conversation['status'], { label: string; dot: string }> = {
  open: { label: 'À traiter', dot: 'bg-orange-500' },
  pending: { label: 'En attente', dot: 'bg-brand' },
  closed: { label: 'Résolu', dot: 'bg-muted-foreground' },
};

function emptyAiPreview(targetKey = ''): AiPreviewState {
  return {
    targetKey,
    classification: null,
    draft: null,
    classifying: false,
    drafting: false,
    error: '',
  };
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function fmtFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function stripEmailSourceLines(value: string) {
  return value
    .split('\n')
    .filter(line => !/^\s*\(?sources?\s*:/i.test(line.trim()))
    .join('\n')
    .trim();
}

function cleanEmailBody(value: string) {
  return stripEmailSourceLines(value)
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/([^\n])\n(Cordialement,?|Bien à vous,?|Bonne journée,?)/i, '$1\n\n$2')
    .trim();
}

function agentErrorMessage(data: unknown): string {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === 'string') return obj.detail;
    if (typeof obj.error === 'string') return obj.error;
  }
  return 'Agent IA indisponible.';
}

function truncateText(value: string, max = 3000) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function confidenceLabel(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return `${Math.round(value * 100)}%`;
}

function suggestedPriority(category: string | null | undefined, message: string): TicketPriority {
  const normalized = `${category ?? ''} ${message}`.toLowerCase();
  if (/urgence|urgent|inondation|dégât des eaux|degat des eaux|incendie|gaz|électricité|electricite/.test(normalized)) {
    return 'urgent';
  }
  if (/réclamation|reclamation|plainte|fuite|chauffage|panne|moisissure|serrure/.test(normalized)) {
    return 'high';
  }
  if (category === 'maintenance') return 'normal';
  return 'normal';
}

function suggestedDueAt(priority: TicketPriority, category: string | null | undefined) {
  const date = new Date();
  const hours = priority === 'urgent'
    ? 24
    : priority === 'high'
      ? 48
      : category === 'maintenance'
        ? 72
        : 7 * 24;
  date.setHours(date.getHours() + hours);
  date.setMinutes(0, 0, 0);
  return date.toISOString();
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <>
      {lines.map((line, index) => {
        const reviewPrefix = 'À réviser : ';
        if (line.startsWith(reviewPrefix)) {
          const href = line.slice(reviewPrefix.length).trim();
          return (
            <Link key={`${line}-${index}`} href={href} className="mt-1 block font-medium underline underline-offset-4">
              Ouvrir la revue du document
            </Link>
          );
        }
        return <span key={`${line}-${index}`} className="block">{line}</span>;
      })}
    </>
  );
}

function AiSuggestionPanel({
  channel,
  preview,
  onClassify,
  onDraft,
  onUseDraft,
  onCreateTicket,
}: {
  channel: 'Gmail' | 'Inbox';
  preview: AiPreviewState;
  onClassify: () => void;
  onDraft: () => void;
  onUseDraft: () => void;
  onCreateTicket: () => void;
}) {
  const confidence = confidenceLabel(preview.classification?.confidence);

  return (
    <div className="border-b bg-card/70 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg border bg-background text-brand">
              <Bot className="size-3.5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Suggestion IA</p>
              <p className="text-[11px] text-muted-foreground">
                Aperçu uniquement: aucune catégorie, ticket ou réponse n&apos;est enregistré automatiquement.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onClassify} disabled={preview.classifying}>
            <Sparkles className="size-3.5 text-brand" />
            {preview.classifying ? 'Analyse...' : 'Classer'}
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onDraft} disabled={preview.drafting}>
            <MessageSquare className="size-3.5" />
            {preview.drafting ? 'Préparation...' : 'Préparer réponse'}
          </Button>
        </div>
      </div>

      {preview.error && (
        <div className="mt-3 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="size-3.5" />
          {preview.error}
        </div>
      )}

      {(preview.classification || preview.draft) && (
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          {preview.classification && (
            <div className="space-y-2 rounded-md bg-muted/50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn('border text-[10px]', CATEGORY_COLORS[preview.classification.category as Conversation['category']] ?? CATEGORY_COLORS.autre)}>
                  {preview.classification.category}
                </Badge>
                {confidence && <span className="text-xs text-muted-foreground">{confidence} confiance</span>}
                {preview.classification.model && <span className="text-xs text-muted-foreground">{preview.classification.model}</span>}
              </div>
              <p className="text-sm leading-6">{preview.classification.summary || 'Aucun résumé fourni.'}</p>
            </div>
          )}

          {preview.draft && (
            <div className="space-y-2 rounded-md bg-muted/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Brouillon {channel}
                </p>
                {preview.draft.model && <span className="text-xs text-muted-foreground">{preview.draft.model}</span>}
              </div>
              <div className="max-h-36 overflow-y-auto whitespace-pre-wrap rounded-md bg-background p-2 text-sm leading-6">
                {preview.draft.draft}
              </div>
            </div>
          )}
        </div>
      )}

      {(preview.classification || preview.draft) && (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onCreateTicket}>
            <Plus className="size-3.5" />
            Préremplir ticket
          </Button>
          <Button size="sm" className="h-8 gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90" onClick={onUseDraft} disabled={!preview.draft}>
            <CheckCircle2 className="size-3.5" />
            Utiliser le brouillon
          </Button>
        </div>
      )}
    </div>
  );
}

export function InboxView() {
  const { t } = useLanguage();
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();
  const supabase = createClient();

  const [conversations, setConversations] = useState<ConversationWithTenant[]>([]);
  const [selected, setSelected] = useState<ConversationWithTenant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [compose, setCompose] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConv, setNewConv] = useState({ tenant_id: '', subject: '', first_message: '' });
  const [creating, setCreating] = useState(false);
  const [aiError, setAiError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const gmailBottomRef = useRef<HTMLDivElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const gmailAttachmentInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [gmailConnections, setGmailConnections] = useState<GmailConnectionSummary[]>([]);
  const [gmailThreads, setGmailThreads] = useState<GmailThreadSummary[]>([]);
  const [selectedGmailThread, setSelectedGmailThread] = useState<GmailThreadSummary | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState('');
  const [gmailNotice, setGmailNotice] = useState('');
  const [gmailDraft, setGmailDraft] = useState('');
  const [gmailDrafting, setGmailDrafting] = useState(false);
  const [gmailSending, setGmailSending] = useState(false);
  const [gmailAiDrafting, setGmailAiDrafting] = useState(false);
  const [gmailAttachments, setGmailAttachments] = useState<File[]>([]);
  const [gmailSuggestedDocs, setGmailSuggestedDocs] = useState<GmailSuggestedDocument[]>([]);
  const [gmailSelectedDocumentIds, setGmailSelectedDocumentIds] = useState<string[]>([]);
  const [gmailDocPickerOpen, setGmailDocPickerOpen] = useState(false);
  const [gmailDocLoading, setGmailDocLoading] = useState(false);
  const [gmailDraftStatus, setGmailDraftStatus] = useState('');
  const connectedGmailConnection = gmailConnections.find(connection => connection.status === 'connected') ?? null;
  const gmailConnectionIssue = gmailConnections.find(connection => connection.status !== 'connected') ?? null;
  const activeAiTargetKey = selectedGmailThread
    ? `gmail:${selectedGmailThread.thread_id}`
    : selected
      ? `conversation:${selected.id}`
      : '';
  const [aiPreview, setAiPreview] = useState<AiPreviewState>(() => emptyAiPreview());

  useEffect(() => {
    if (!activeWorkspace) return;
    loadConversations();
    loadGmailConnections();
    supabase.from('tenants').select('*').eq('workspace_id', activeWorkspace.id)
      .then(({ data }) => setTenants((data ?? []) as Tenant[]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('gmail');
    if (!status) return;

    if (status === 'connected') setGmailNotice('Gmail connecté.');
    if (status === 'error') setGmailError(params.get('message') || 'Connexion Gmail impossible.');

    params.delete('gmail');
    params.delete('message');
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    window.history.replaceState(null, '', nextUrl);
  }, []);

  // Realtime: subscribe to new messages for selected conversation
  useEffect(() => {
    if (!selected || !activeWorkspace) return;

    loadMessages(selected.id);

    const channel = supabase
      .channel(`messages:${selected.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${selected.id}`,
      }, (payload) => {
        setMessages((prev: Message[]) => {
          if (prev.find(m => m.id === (payload.new as Message).id)) return prev;
          return [...prev, payload.new as Message];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    gmailBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedGmailThread?.thread_id, selectedGmailThread?.messages.length]);

  useEffect(() => {
    loadGmailSuggestedDocuments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGmailThread?.thread_id, activeWorkspace?.id, connectedGmailConnection?.email]);

  useEffect(() => {
    setAiPreview(emptyAiPreview(activeAiTargetKey));
  }, [activeAiTargetKey]);

  async function loadConversations() {
    if (!activeWorkspace) return;
    const { data } = await supabase
      .from('conversations')
      .select('*, tenants(first_name, last_name)')
      .eq('workspace_id', activeWorkspace.id)
      .order('last_message_at', { ascending: false });
    setConversations((data ?? []) as ConversationWithTenant[]);
  }

  async function loadMessages(convId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages((data ?? []) as Message[]);
  }

  async function loadGmailConnections() {
    if (!activeWorkspace) return;
    setGmailError('');
    try {
      const res = await fetch(`/api/gmail/connections?workspace_id=${activeWorkspace.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Connexion Gmail indisponible');
      const connections = (data.connections ?? []) as GmailConnectionSummary[];
      setGmailConnections(connections);
      const connected = connections.find(connection => connection.status === 'connected');
      if (connected) {
        await loadGmailThreads(connected.id);
      } else {
        setGmailThreads([]);
        setSelectedGmailThread(null);
      }
    } catch (e) {
      setGmailError(e instanceof Error ? e.message : 'Connexion Gmail indisponible');
    }
  }

  async function loadGmailThreads(connectionId?: string) {
    if (!activeWorkspace) return;
    const id = connectionId ?? connectedGmailConnection?.id;
    if (!id) {
      setGmailThreads([]);
      return;
    }
    setGmailLoading(true);
    setGmailError('');
    try {
      const params = new URLSearchParams({
        workspace_id: activeWorkspace.id,
        connection_id: id,
      });
      const res = await fetch(`/api/gmail/threads?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Lecture Gmail impossible');
      const threads = (data.threads ?? []) as GmailThreadSummary[];
      setGmailThreads(threads);
      return threads;
    } catch (e) {
      setGmailError(e instanceof Error ? e.message : 'Lecture Gmail impossible');
    } finally {
      setGmailLoading(false);
    }
  }

  function handleConnectGmail() {
    if (!activeWorkspace) return;
    window.location.href = `/api/gmail/connect?workspace_id=${activeWorkspace.id}`;
  }

  function selectConversation(conversation: ConversationWithTenant) {
    setSelectedGmailThread(null);
    setGmailDraftStatus('');
    setSelected(conversation);
  }

  function gmailSignature() {
    return `Cordialement,\n\n${activeWorkspace?.name ?? 'Votre agence'}`;
  }

  function withGmailSignature(value: string) {
    const draft = cleanEmailBody(value.replace(/\[Votre Nom\]/gi, activeWorkspace?.name ?? 'Votre agence'));
    if (/cordialement|bien à vous|bonne journée/i.test(draft)) return draft;
    return `${draft}\n\n${gmailSignature()}`.trim();
  }

  function selectGmailThread(thread: GmailThreadSummary) {
    const readThread: GmailThreadSummary = {
      ...thread,
      unread: false,
      messages: (thread.messages ?? []).map(message => ({
        ...message,
        unread: false,
        labels: message.labels.filter(label => label !== 'UNREAD'),
      })),
    };
    setSelected(null);
    setSelectedGmailThread(readThread);
    setGmailThreads(prev => prev.map(item => item.thread_id === thread.thread_id ? readThread : item));
    setGmailDraftStatus('');
    setGmailDraft('');
    setGmailAttachments([]);
    setGmailSelectedDocumentIds([]);
    setGmailSuggestedDocs([]);
  }

  function handleSourceFilter(next: SourceFilter) {
    setSourceFilter(next);
    if (next === 'gmail' && selected) {
      setSelected(null);
      if (gmailThreads[0]) selectGmailThread(gmailThreads[0]);
    }
    if (next === 'isimple' && selectedGmailThread) {
      setSelectedGmailThread(null);
      if (conversations[0]) selectConversation(conversations[0]);
    }
    if (next === 'whatsapp') {
      setSelected(null);
      setSelectedGmailThread(null);
    }
  }

  function gmailReplySubject() {
    if (!selectedGmailThread) return '(Sans objet)';
    return selectedGmailThread.subject?.startsWith('Re:')
      ? selectedGmailThread.subject
      : `Re: ${selectedGmailThread.subject || '(Sans objet)'}`;
  }

  function gmailReplyTarget(thread = selectedGmailThread) {
    if (!thread) return null;
    const accountEmail = connectedGmailConnection?.email?.toLowerCase();
    const latestIncoming = [...(thread.messages ?? [])]
      .reverse()
      .find(message =>
        message.direction === 'incoming'
        && message.from_email
        && (!accountEmail || message.from_email.toLowerCase() !== accountEmail)
      );
    const fallbackEmail = thread.reply_to_email || thread.from_email;
    if (!fallbackEmail || (accountEmail && fallbackEmail.toLowerCase() === accountEmail)) return null;
    return {
      email: latestIncoming?.from_email ?? fallbackEmail,
      name: latestIncoming?.from_name || thread.reply_to_name || thread.from_name || fallbackEmail,
      messageId: latestIncoming?.rfc_message_id ?? null,
      references: latestIncoming?.references ?? null,
    };
  }

  function buildGmailComposerData() {
    const target = gmailReplyTarget();
    if (!activeWorkspace || !selectedGmailThread || !connectedGmailConnection || !target?.email) {
      return null;
    }

    const form = new FormData();
    form.append('workspace_id', activeWorkspace.id);
    form.append('connection_id', connectedGmailConnection.id);
    form.append('to', target.email);
    form.append('subject', gmailReplySubject());
    form.append('body', cleanEmailBody(gmailDraft));
    form.append('thread_id', selectedGmailThread.thread_id);
    if (target.messageId) form.append('reply_message_id', target.messageId);
    if (target.references) form.append('references', target.references);
    gmailSelectedDocumentIds.forEach(id => form.append('document_ids', id));
    gmailAttachments.forEach(file => form.append('attachments', file));
    return form;
  }

  function findTenantByEmail(email: string | null | undefined) {
    const normalized = email?.toLowerCase().trim();
    if (!normalized) return null;
    return tenants.find(tenant => tenant.email?.toLowerCase() === normalized) ?? null;
  }

  function buildCurrentAiTarget(): AiTarget | null {
    if (selectedGmailThread) {
      const target = gmailReplyTarget();
      const senderEmail = target?.email ?? selectedGmailThread.reply_to_email ?? selectedGmailThread.from_email;
      const matchedTenant = findTenantByEmail(senderEmail);
      const subject = selectedGmailThread.subject || 'Demande Gmail';
      const message = selectedGmailBody || selectedGmailThread.snippet || subject;
      const context = [
        'Canal: Gmail',
        senderEmail ? `Expéditeur: ${target?.name ?? senderEmail} <${senderEmail}>` : null,
        `Sujet: ${subject}`,
        '',
        'Thread Gmail:',
        selectedGmailBody || selectedGmailThread.snippet || '',
      ].filter(Boolean).join('\n');

      return {
        key: `gmail:${selectedGmailThread.thread_id}`,
        channel: 'Gmail',
        subject,
        message,
        context,
        tenantId: matchedTenant?.id ?? null,
        senderEmail: senderEmail ?? null,
        recipientName: target?.name ?? selectedGmailSender,
      };
    }

    if (selected) {
      const tenant = selected.tenants;
      const displayName = tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Locataire';
      const latestTenantMessage = [...messages].reverse().find(message => message.role === 'tenant');
      const timeline = messages
        .slice(-8)
        .map(message => `${message.role === 'tenant' ? displayName : 'Gestionnaire'}: ${message.content}`)
        .join('\n');

      return {
        key: `conversation:${selected.id}`,
        channel: 'Inbox',
        subject: selected.subject,
        message: (latestTenantMessage?.content ?? timeline) || selected.subject,
        context: timeline || selected.subject,
        tenantId: selected.tenant_id ?? null,
        conversationId: selected.id,
        recipientName: displayName,
      };
    }

    return null;
  }

  async function handlePreviewAiClassification() {
    if (!activeWorkspace) return;
    const target = buildCurrentAiTarget();
    if (!target) return;

    setAiPreview(prev => ({
      ...prev,
      targetKey: target.key,
      classifying: true,
      error: '',
    }));

    try {
      const res = await fetch('/api/agent/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          message: target.message,
          tenant_id: target.tenantId,
          conversation_id: target.conversationId,
          sender_email: target.senderEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(agentErrorMessage(data));
      const classification: AiClassificationPreview = {
        category: String(data.category ?? 'autre'),
        confidence: typeof data.confidence === 'number' ? data.confidence : Number(data.confidence ?? 0),
        summary: String(data.summary ?? ''),
        tenant_id: typeof data.tenant_id === 'string' ? data.tenant_id : null,
        identity_confidence: typeof data.identity_confidence === 'number' ? data.identity_confidence : null,
        model: typeof data.model === 'string' ? data.model : null,
        latency_ms: typeof data.latency_ms === 'number' ? data.latency_ms : null,
      };
      setAiPreview(prev => prev.targetKey === target.key
        ? { ...prev, classification, classifying: false, error: '' }
        : prev);
    } catch (e) {
      setAiPreview(prev => prev.targetKey === target.key
        ? { ...prev, classifying: false, error: e instanceof Error ? e.message : 'Agent IA indisponible.' }
        : prev);
    }
  }

  async function handlePreviewAiDraft() {
    if (!activeWorkspace) return;
    const target = buildCurrentAiTarget();
    if (!target) return;

    if (target.channel === 'Gmail') setGmailAiDrafting(true);
    if (target.channel === 'Inbox') setDrafting(true);
    setAiPreview(prev => ({
      ...prev,
      targetKey: target.key,
      drafting: true,
      error: '',
    }));

    try {
      const res = await fetch('/api/agent/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          conversation_id: target.conversationId,
          tenant_id: target.tenantId,
          sender_email: target.senderEmail,
          subject: target.subject,
          context: target.context,
          recipient_name: target.recipientName,
          tone: 'formal',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(agentErrorMessage(data));
      const draft: AiDraftPreview = {
        draft: String(data.draft ?? ''),
        subject: String(data.subject ?? target.subject),
        tenant_id: typeof data.tenant_id === 'string' ? data.tenant_id : null,
        identity_confidence: typeof data.identity_confidence === 'number' ? data.identity_confidence : null,
        model: typeof data.model === 'string' ? data.model : null,
        latency_ms: typeof data.latency_ms === 'number' ? data.latency_ms : null,
      };
      setAiPreview(prev => prev.targetKey === target.key
        ? { ...prev, draft, drafting: false, error: '' }
        : prev);
    } catch (e) {
      setAiPreview(prev => prev.targetKey === target.key
        ? { ...prev, drafting: false, error: e instanceof Error ? e.message : 'Agent IA indisponible.' }
        : prev);
    } finally {
      setGmailAiDrafting(false);
      setDrafting(false);
    }
  }

  function handleUseAiDraftPreview() {
    if (!aiPreview.draft || aiPreview.targetKey !== activeAiTargetKey) return;
    if (selectedGmailThread) {
      setGmailDraft(withGmailSignature(aiPreview.draft.draft));
      setGmailDraftStatus('Brouillon IA appliqué localement. Relisez avant brouillon Gmail ou envoi.');
      return;
    }
    if (selected) {
      setCompose(aiPreview.draft.draft);
      setAiError('');
    }
  }

  async function handleGmailAiDraft() {
    await handlePreviewAiDraft();
  }

  function handleAddGmailAttachments(files: FileList | null) {
    if (!files || files.length === 0) return;
    setGmailAttachments(prev => [...prev, ...Array.from(files)]);
    setGmailDocPickerOpen(false);
    if (gmailAttachmentInputRef.current) gmailAttachmentInputRef.current.value = '';
  }

  function removeGmailAttachment(index: number) {
    setGmailAttachments(prev => prev.filter((_, i) => i !== index));
  }

  function toggleGmailSuggestedDocument(id: string) {
    setGmailSelectedDocumentIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  }

  function removeGmailSelectedDocument(id: string) {
    setGmailSelectedDocumentIds(prev => prev.filter(item => item !== id));
  }

  async function loadGmailSuggestedDocuments() {
    if (!activeWorkspace || !selectedGmailThread) {
      setGmailSuggestedDocs([]);
      return;
    }

    const target = gmailReplyTarget();
    if (!target?.email) {
      setGmailSuggestedDocs([]);
      return;
    }

    setGmailDocLoading(true);
    try {
      const normalizedEmail = target.email.toLowerCase();
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, email')
        .eq('workspace_id', activeWorkspace.id)
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (!tenant?.id) {
        setGmailSuggestedDocs([]);
        return;
      }

      const [directDocs, tenantLinks, leases] = await Promise.all([
        supabase
          .from('documents')
          .select('id, file_name, doc_type, status, lot_id, tenant_id, created_at, updated_at')
          .eq('workspace_id', activeWorkspace.id)
          .eq('status', 'confirmed')
          .eq('tenant_id', tenant.id)
          .order('updated_at', { ascending: false })
          .limit(10),
        supabase
          .from('document_tenants')
          .select('document_id')
          .eq('workspace_id', activeWorkspace.id)
          .eq('tenant_id', tenant.id),
        supabase
          .from('leases')
          .select('lot_id')
          .eq('workspace_id', activeWorkspace.id)
          .eq('tenant_id', tenant.id)
          .eq('status', 'active'),
      ]);

      const documentIds = Array.from(new Set((tenantLinks.data ?? []).map(link => link.document_id).filter(Boolean)));
      const lotIds = Array.from(new Set((leases.data ?? []).map(lease => lease.lot_id).filter(Boolean)));
      const [linkedDocs, lotDocs] = await Promise.all([
        documentIds.length > 0
          ? supabase
            .from('documents')
            .select('id, file_name, doc_type, status, lot_id, tenant_id, created_at, updated_at')
            .eq('workspace_id', activeWorkspace.id)
            .eq('status', 'confirmed')
            .in('id', documentIds)
            .order('updated_at', { ascending: false })
            .limit(10)
          : Promise.resolve({ data: [] as GmailSuggestedDocument[] }),
        lotIds.length > 0
          ? supabase
            .from('documents')
            .select('id, file_name, doc_type, status, lot_id, tenant_id, created_at, updated_at')
            .eq('workspace_id', activeWorkspace.id)
            .eq('status', 'confirmed')
            .in('lot_id', lotIds)
            .order('updated_at', { ascending: false })
            .limit(10)
          : Promise.resolve({ data: [] as GmailSuggestedDocument[] }),
      ]);

      const docs = new Map<string, GmailSuggestedDocument>();
      [...(directDocs.data ?? []), ...(linkedDocs.data ?? []), ...(lotDocs.data ?? [])]
        .forEach(doc => docs.set(doc.id, doc as GmailSuggestedDocument));
      setGmailSuggestedDocs(Array.from(docs.values()).slice(0, 8));
    } finally {
      setGmailDocLoading(false);
    }
  }

  async function handleSubmitGmailMessage(action: 'draft' | 'send') {
    if (!activeWorkspace || !selectedGmailThread || !connectedGmailConnection) return;
    const target = gmailReplyTarget();
    if (!target?.email) {
      setGmailDraftStatus('Destinataire Gmail introuvable.');
      return;
    }
    if (!gmailDraft.trim()) {
      setGmailDraftStatus('Rédigez une réponse avant de continuer.');
      return;
    }
    if (action === 'send' && !window.confirm('Envoyer cet email maintenant depuis Gmail ?')) return;

    const form = buildGmailComposerData();
    if (!form) return;

    if (action === 'draft') setGmailDrafting(true);
    if (action === 'send') setGmailSending(true);
    setGmailDraftStatus('');
    try {
      const res = await fetch(action === 'draft' ? '/api/gmail/drafts' : '/api/gmail/send', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? (action === 'draft' ? 'Brouillon Gmail impossible' : 'Envoi Gmail impossible'));
      setGmailDraftStatus(action === 'draft' ? 'Brouillon créé dans Gmail.' : 'Email envoyé depuis Gmail.');
      if (action === 'send') {
        setGmailDraft('');
        setGmailAttachments([]);
        setGmailSelectedDocumentIds([]);
        const refreshed = await loadGmailThreads(connectedGmailConnection.id);
        const refreshedThread = refreshed?.find(thread => thread.thread_id === selectedGmailThread.thread_id);
        if (refreshedThread) selectGmailThread(refreshedThread);
        setGmailDraftStatus('Email envoyé depuis Gmail.');
      }
    } catch (e) {
      setGmailDraftStatus(e instanceof Error ? e.message : action === 'draft' ? 'Brouillon Gmail impossible' : 'Envoi Gmail impossible');
    } finally {
      setGmailDrafting(false);
      setGmailSending(false);
    }
  }

  async function handleSend() {
    if (!compose.trim() || !selected || !activeWorkspace) return;
    setSending(true);
    await supabase.from('messages').insert({
      conversation_id: selected.id,
      workspace_id: activeWorkspace.id,
      content: compose.trim(),
      role: 'manager',
    });

    setCompose('');
    setSending(false);
  }

  async function handleAiDraft() {
    await handlePreviewAiDraft();
  }

  async function handleCreateConversation() {
    if (!activeWorkspace || !newConv.subject.trim() || !newConv.tenant_id) return;
    setCreating(true);

    const { data: conv } = await supabase
      .from('conversations')
      .insert({
        workspace_id: activeWorkspace.id,
        tenant_id: newConv.tenant_id || null,
        subject: newConv.subject.trim(),
      })
      .select('*, tenants(first_name, last_name)')
      .single();

    if (conv && newConv.first_message.trim()) {
      await supabase.from('messages').insert({
        conversation_id: conv.id,
        workspace_id: activeWorkspace.id,
        content: newConv.first_message.trim(),
        role: 'manager',
      });
    }

    if (conv) {
      const c = conv as ConversationWithTenant;
      setConversations(prev => [c, ...prev]);
      setSelectedGmailThread(null);
      setSelected(c);
    }

    setNewConvOpen(false);
    setNewConv({ tenant_id: '', subject: '', first_message: '' });
    setCreating(false);
  }

  async function handleConversationDocument(file: File | undefined) {
    if (!file || !selected || !activeWorkspace) return;
    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      setAiError('Format non supporté. Utilisez un PDF ou une image.');
      return;
    }

    setUploadingDocument(true);
    setAiError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('workspace_id', activeWorkspace.id);
      fd.append('source', 'inbox');
      fd.append('conversation_id', selected.id);
      if (selected.tenant_id) fd.append('tenant_id', selected.tenant_id);

      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import impossible');

      const reviewPath = `/documents/upload?review=${data.id}`;
      await supabase.from('messages').insert({
        conversation_id: selected.id,
        workspace_id: activeWorkspace.id,
        content: `Document ajouté : ${file.name}\nÀ réviser : ${reviewPath}`,
        role: 'manager',
      });
      await supabase
        .from('conversations')
        .update({ category: 'document', status: 'pending' })
        .eq('id', selected.id);
      setSelected(prev => prev ? { ...prev, category: 'document', status: 'pending' } : prev);
      setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, category: 'document', status: 'pending' } : c));
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Import impossible');
    } finally {
      setUploadingDocument(false);
      if (documentInputRef.current) documentInputRef.current.value = '';
    }
  }

  function currentAiClassification() {
    return aiPreview.targetKey === activeAiTargetKey ? aiPreview.classification : null;
  }

  function openTicketPrefill(prefill: TicketPrefill) {
    const fallbackParams = new URLSearchParams({
      new: '1',
      title: prefill.title,
      description: prefill.description,
      source: prefill.source,
      source_ref: prefill.source_ref,
    });
    if (prefill.tenant_id) fallbackParams.set('tenant_id', prefill.tenant_id);
    if (prefill.priority) fallbackParams.set('priority', prefill.priority);
    if (prefill.due_at) fallbackParams.set('due_at', prefill.due_at);
    if (prefill.ai_summary) fallbackParams.set('ai_summary', prefill.ai_summary);
    if (prefill.ai_category) fallbackParams.set('ai_category', prefill.ai_category);
    if (typeof prefill.ai_confidence === 'number') fallbackParams.set('ai_confidence', String(prefill.ai_confidence));

    try {
      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(`${TICKET_PREFILL_STORAGE_PREFIX}${id}`, JSON.stringify(prefill));
      router.push(`/tickets?new=1&prefill_id=${encodeURIComponent(id)}`);
    } catch {
      router.push(`/tickets?${fallbackParams.toString()}`);
    }
  }

  function handleCreateTicketFromConversation() {
    if (!selected) return;
    const latestTenantMessage = [...messages]
      .reverse()
      .find(message => message.role === 'tenant');
    const classification = currentAiClassification();
    const category = classification?.category ?? selected.category;
    const sourceText = messages
      .slice(-8)
      .map(message => `${message.role === 'tenant' ? 'Locataire' : message.role === 'ai' ? 'Agent IA' : 'Gestionnaire'}: ${message.content}`)
      .join('\n\n');
    const priority = suggestedPriority(category, `${latestTenantMessage?.content ?? ''} ${classification?.summary ?? ''}`);
    const description = [
      `Source: Inbox isimple`,
      `Conversation: ${selected.subject}`,
      classification?.summary ? `Suggestion IA: ${classification.summary}` : null,
      '',
      'Derniers messages:',
      sourceText || latestTenantMessage?.content || selected.subject,
    ].filter(Boolean).join('\n');

    openTicketPrefill({
      title: truncateText(classification?.summary || selected.subject, 180),
      description: truncateText(description),
      priority,
      due_at: suggestedDueAt(priority, category),
      tenant_id: selected.tenant_id ?? classification?.tenant_id ?? null,
      source: 'inbox',
      source_ref: selected.id,
      source_label: 'Inbox isimple',
      source_subject: selected.subject,
      source_sender_name: tenantName(selected),
      ai_summary: classification?.summary ?? null,
      ai_category: classification?.category ?? null,
      ai_confidence: classification?.confidence ?? null,
      responsibility: category === 'maintenance' ? 'provider' : 'unknown',
    });
  }

  function handleCreateTicketFromGmail() {
    if (!selectedGmailThread) return;
    const target = gmailReplyTarget();
    const senderEmail = target?.email ?? selectedGmailThread.reply_to_email ?? selectedGmailThread.from_email;
    const matchedTenant = findTenantByEmail(senderEmail);
    const classification = currentAiClassification();
    const category = classification?.category ?? null;
    const priority = suggestedPriority(category, `${selectedGmailBody} ${classification?.summary ?? ''}`);
    const description = [
      'Source: Gmail',
      senderEmail ? `Contact: ${target?.name ?? senderEmail} <${senderEmail}>` : null,
      `Sujet: ${selectedGmailThread.subject || '(Sans objet)'}`,
      selectedGmailThread.received_at ? `Reçu: ${fmtTime(selectedGmailThread.received_at)}` : null,
      classification?.summary ? `Suggestion IA: ${classification.summary}` : null,
      '',
      'Thread:',
      selectedGmailBody || selectedGmailThread.snippet || '',
    ].filter(Boolean).join('\n');

    openTicketPrefill({
      title: truncateText(classification?.summary || selectedGmailThread.subject || 'Demande Gmail', 180),
      description: truncateText(description),
      priority,
      due_at: suggestedDueAt(priority, category),
      tenant_id: matchedTenant?.id ?? classification?.tenant_id ?? null,
      source: 'gmail',
      source_ref: selectedGmailThread.thread_id,
      source_label: 'Gmail',
      source_subject: selectedGmailThread.subject,
      source_sender_name: target?.name ?? selectedGmailSender,
      source_sender_email: senderEmail ?? null,
      ai_summary: classification?.summary ?? null,
      ai_category: classification?.category ?? null,
      ai_confidence: classification?.confidence ?? null,
      responsibility: category === 'maintenance' ? 'provider' : 'unknown',
      gmail_message_id: selectedGmailThread.message_id,
      received_at: selectedGmailThread.received_at,
    });
  }

  const tenantName = (c: ConversationWithTenant) =>
    c.tenants ? `${c.tenants.first_name} ${c.tenants.last_name}` : 'Inconnu';

  const groupedConversations = (['open', 'pending', 'closed'] as Conversation['status'][]).map(status => ({
    status,
    items: conversations.filter(c => c.status === status),
  })).filter(group => group.items.length > 0);
  const showGmail = sourceFilter === 'all' || sourceFilter === 'gmail';
  const showIsimple = sourceFilter === 'all' || sourceFilter === 'isimple';
  const hasVisibleItems = (showGmail && gmailThreads.length > 0) || (showIsimple && conversations.length > 0);
  const gmailStatusText = gmailConnectionIssue?.status === 'revoked'
    ? 'Accès Gmail à reconnecter.'
    : gmailConnectionIssue?.status === 'error'
      ? 'Connexion Gmail en erreur.'
      : '';
  const sourceOptions: Array<{ id: SourceFilter; label: string; count: number; unavailable?: boolean }> = [
    { id: 'all', label: 'Tous', count: conversations.length + gmailThreads.length },
    { id: 'isimple', label: 'isimple', count: conversations.length },
    { id: 'gmail', label: 'Gmail', count: gmailThreads.length },
    { id: 'whatsapp', label: 'WhatsApp', count: 0, unavailable: true },
  ];
  const selectedGmailSender = selectedGmailThread
    ? selectedGmailThread.reply_to_name || selectedGmailThread.from_name || selectedGmailThread.reply_to_email || selectedGmailThread.from_email || 'Expéditeur Gmail'
    : '';
  const selectedGmailMessages = selectedGmailThread?.messages?.length
    ? selectedGmailThread.messages
    : selectedGmailThread ? [{
      id: selectedGmailThread.message_id ?? selectedGmailThread.thread_id,
      message_id: selectedGmailThread.message_id ?? selectedGmailThread.thread_id,
      rfc_message_id: null,
      references: null,
      from_email: selectedGmailThread.from_email,
      from_name: selectedGmailThread.from_name,
      to_emails: selectedGmailThread.to_emails,
      subject: selectedGmailThread.subject,
      snippet: selectedGmailThread.snippet,
      body_text: selectedGmailThread.body_text,
      received_at: selectedGmailThread.received_at,
      labels: selectedGmailThread.labels,
      unread: selectedGmailThread.unread,
      direction: 'incoming' as const,
    }] : [];
  const selectedGmailBody = selectedGmailMessages
    .map(message => {
      const author = message.direction === 'outgoing'
        ? 'Gestionnaire'
        : message.from_name || message.from_email || selectedGmailSender;
      return `${author}: ${message.body_text || message.snippet || ''}`;
    })
    .join('\n\n');
  const selectedGmailDocs = gmailSelectedDocumentIds
    .map(id => gmailSuggestedDocs.find(doc => doc.id === id))
    .filter((doc): doc is GmailSuggestedDocument => Boolean(doc));
  const visibleAiPreview = aiPreview.targetKey === activeAiTargetKey
    ? aiPreview
    : emptyAiPreview(activeAiTargetKey);

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[560px] overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex w-[310px] shrink-0 flex-col border-r bg-card">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold">{t.inbox.title}</p>
            <p className="text-[11px] text-muted-foreground">Tri IA et suivi locataire</p>
          </div>
          <Button size="icon" variant="ghost" className="size-8 rounded-lg" onClick={() => setNewConvOpen(true)}>
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="border-b px-3 py-2">
          <div className="flex gap-1 overflow-x-auto">
            {sourceOptions.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSourceFilter(option.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                  sourceFilter === option.id
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:text-foreground',
                  option.unavailable && sourceFilter !== option.id && 'border-dashed'
                )}
              >
                <span>{option.label}</span>
                <span className={cn(
                  'rounded-full px-1 text-[10px]',
                  sourceFilter === option.id ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
                )}>
                  {option.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-b bg-background/60 px-3 py-2.5">
          {!connectedGmailConnection && gmailConnections.length === 0 ? (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold">Gmail</p>
                  <p className="text-[11px] leading-4 text-muted-foreground">Connectez la boîte du gestionnaire.</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={handleConnectGmail}>
                  Connecter
                </Button>
              </div>
              {gmailNotice && <p className="text-[11px] text-emerald-600">{gmailNotice}</p>}
              {gmailError && <p className="text-[11px] text-destructive">{gmailError}</p>}
            </div>
          ) : !connectedGmailConnection && gmailConnectionIssue ? (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="size-3 text-amber-600" />
                    <p className="truncate text-xs font-semibold">{gmailConnectionIssue.email}</p>
                  </div>
                  <p className="text-[11px] leading-4 text-muted-foreground">
                    {gmailStatusText}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={handleConnectGmail}>
                  Reconnecter
                </Button>
              </div>
              {gmailNotice && <p className="text-[11px] text-emerald-600">{gmailNotice}</p>}
              {gmailError && <p className="text-[11px] text-destructive">{gmailError}</p>}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3 text-emerald-500" />
                    <p className="truncate text-xs font-semibold">{connectedGmailConnection?.email}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {connectedGmailConnection?.last_sync_at
                      ? `Synchronisé ${fmtTime(connectedGmailConnection.last_sync_at)}`
                      : 'Emails Gmail'}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 rounded-lg"
                  onClick={() => connectedGmailConnection && loadGmailThreads(connectedGmailConnection.id)}
                  disabled={gmailLoading}
                  title="Rafraîchir Gmail"
                >
                  <RefreshCw className={cn('size-3.5', gmailLoading && 'animate-spin')} />
                </Button>
              </div>
              {gmailNotice && <p className="text-[11px] text-emerald-600">{gmailNotice}</p>}
              {gmailError && <p className="text-[11px] text-destructive">{gmailError}</p>}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {!hasVisibleItems ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
              {sourceFilter === 'whatsapp' ? (
                <>
                  <MessageCircle className="size-8 opacity-30" />
                  <p className="text-xs font-medium text-foreground">WhatsApp indisponible</p>
                  <p className="max-w-[220px] text-xs leading-5">
                    Le canal WhatsApp n&apos;est pas encore connecté. Les messages isimple et Gmail restent disponibles.
                  </p>
                  <Button size="sm" variant="outline" className="h-8" disabled>
                    Connexion à venir
                  </Button>
                </>
              ) : (
                <>
                  <MessageSquare className="size-8 opacity-30" />
                  <p className="text-xs">
                    {sourceFilter === 'gmail'
                      ? !connectedGmailConnection ? 'Reconnectez Gmail pour voir les emails.' : 'Aucun email récent.'
                      : t.inbox.emptyList}
                  </p>
                </>
              )}
              {sourceFilter === 'gmail' && !connectedGmailConnection && (
                <Button size="sm" variant="outline" className="h-8" onClick={handleConnectGmail}>
                  {gmailConnections.length > 0 ? 'Reconnecter Gmail' : 'Connecter Gmail'}
                </Button>
              )}
            </div>
          ) : (
            <>
              {showGmail && gmailThreads.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 pb-1 pt-3">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Gmail
                    </span>
                    <span className="text-[10px] text-muted-foreground">{gmailThreads.length}</span>
                  </div>
                  {gmailThreads.map(thread => {
                    const active = selectedGmailThread?.thread_id === thread.thread_id;
                    const sender = thread.reply_to_name || thread.from_name || thread.reply_to_email || thread.from_email || 'Expéditeur Gmail';
                    return (
                      <button
                        key={thread.thread_id}
                        type="button"
                        onClick={() => selectGmailThread(thread)}
                        className={cn(
                          'w-full border-l-2 border-transparent px-4 py-3 text-left transition-colors hover:bg-background',
                          active && 'border-brand bg-brand-muted'
                        )}
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-brand">
                              <Mail className="size-3.5" />
                            </span>
                            <span className="truncate text-[13px] font-semibold">{sender}</span>
                          </div>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {thread.received_at ? fmtTime(thread.received_at) : ''}
                          </span>
                        </div>
                        <div className="ml-9 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-muted-foreground">{thread.subject || '(Sans objet)'}</p>
                          <MessageCircle className="size-3 shrink-0 text-brand" />
                        </div>
                        <div className="ml-9 mt-2 flex items-center gap-1.5">
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                            Gmail
                          </span>
                          {thread.unread && (
                            <span className="rounded-full border border-brand/20 bg-brand-muted px-1.5 py-0.5 text-[10px] font-medium text-brand">
                              Non lu
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {showIsimple && groupedConversations.map(group => (
                <div key={group.status}>
                  <div className="flex items-center gap-2 px-4 pb-1 pt-3">
                    <span className={cn('size-1.5 rounded-full', STATUS_STYLES[group.status].dot)} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {STATUS_STYLES[group.status].label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{group.items.length}</span>
                  </div>
                  {group.items.map(c => {
                    const active = selected?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => selectConversation(c)}
                        className={cn(
                          'w-full border-l-2 border-transparent px-4 py-3 text-left transition-colors hover:bg-background',
                          active && 'border-brand bg-brand-muted'
                        )}
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-[11px] font-semibold">
                              {tenantName(c).slice(0, 1)}
                            </span>
                            <span className="truncate text-[13px] font-semibold">{tenantName(c)}</span>
                          </div>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{fmtTime(c.last_message_at)}</span>
                        </div>
                        <div className="ml-9 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-muted-foreground">{c.subject}</p>
                          <MessageCircle className="size-3 shrink-0 text-brand" />
                        </div>
                        <div className="ml-9 mt-2 flex items-center gap-1.5">
                          <span className={cn('rounded-full border px-1.5 py-0.5 text-[10px] font-medium', CATEGORY_COLORS[c.category])}>
                            {t.inbox.categories[c.category as keyof typeof t.inbox.categories]}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {selectedGmailThread ? (
          <>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-card px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-background text-brand">
                  <Mail className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{selectedGmailSender}</p>
                  <div className="flex min-w-0 items-center gap-2">
                    <Mail className="size-3 text-muted-foreground" />
                    <p className="truncate text-xs text-muted-foreground">{selectedGmailThread.subject || '(Sans objet)'}</p>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={handleCreateTicketFromGmail}>
                  <Plus className="size-3.5" />
                  Ticket
                </Button>
                <Badge variant="outline" className="text-[10px]">Gmail</Badge>
                <div className="hidden items-center gap-1.5 rounded-full border bg-brand-muted px-2 py-1 text-[11px] font-medium text-brand sm:flex">
                  <Bot className="size-3" />
                  Brouillon Gmail
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-b bg-brand-muted px-4 py-2 text-xs text-muted-foreground">
              <Bot className="size-3.5 text-brand" />
              Email reçu depuis Gmail. Vous pouvez générer une réponse, créer un brouillon ou envoyer depuis la plateforme.
            </div>

            <AiSuggestionPanel
              channel="Gmail"
              preview={visibleAiPreview}
              onClassify={handlePreviewAiClassification}
              onDraft={handlePreviewAiDraft}
              onUseDraft={handleUseAiDraftPreview}
              onCreateTicket={handleCreateTicketFromGmail}
            />

            {gmailDraftStatus && (
              <div className={cn(
                'flex items-center gap-2 border-b px-4 py-2 text-xs',
                gmailDraftStatus.includes('créé') || gmailDraftStatus.includes('envoyé')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-destructive/10 text-destructive'
              )}>
                <CheckCircle2 className="size-3.5" />
                {gmailDraftStatus}
              </div>
            )}

            <div className="flex-1 overflow-y-auto bg-background px-5 py-4">
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
              {selectedGmailMessages.map((message, index) => {
                const isOutgoing = message.direction === 'outgoing';
                const sender = isOutgoing
                  ? 'Gestionnaire'
                  : message.from_name || message.from_email || selectedGmailSender;
                return (
                  <div
                    key={message.message_id || message.id}
                    className="flex animate-isimple-slide-in justify-start"
                  >
                    <div className="flex w-full max-w-4xl flex-col items-start">
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {isOutgoing ? <UserRound className="size-3" /> : <Mail className="size-3 text-brand" />}
                        <span>{sender}</span>
                        <span>·</span>
                        <span>{message.received_at ? fmtTime(message.received_at) : 'Gmail'}</span>
                        {!isOutgoing && (
                          <>
                            <span>·</span>
                            <span>{message.unread ? 'Non lu' : 'Lu'}</span>
                          </>
                        )}
                      </div>
                      <div className={cn(
                        'w-full rounded-xl border px-5 py-4 text-sm leading-7 shadow-sm',
                        isOutgoing
                          ? 'border-brand/20 bg-brand-muted text-foreground'
                          : 'rounded-bl-sm border-border bg-card'
                      )}>
                        {index === 0 && (
                          <div className="mb-2 border-b pb-2 text-xs font-semibold text-foreground">
                            {message.subject || selectedGmailThread.subject || '(Sans objet)'}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          {message.body_text || message.snippet || 'Aucun contenu lisible dans cet email.'}
                        </div>
                        <div className="mt-3 grid gap-1 border-t pt-2 text-[11px] text-muted-foreground">
                          <span>De : {message.from_name || message.from_email || 'inconnu'} {message.from_email ? `<${message.from_email}>` : ''}</span>
                          <span>Vers : {message.to_emails.join(', ') || connectedGmailConnection?.email || 'Gmail'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={gmailBottomRef} />
              </div>
            </div>

            <div className="shrink-0 border-t bg-card p-3">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Réponse Gmail</span>
                <span className="hidden sm:block">Brouillon ou envoi direct</span>
              </div>
              <input
                ref={gmailAttachmentInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => handleAddGmailAttachments(e.target.files)}
              />
              <div className="space-y-2">
                <textarea
                  value={gmailDraft}
                  onChange={e => setGmailDraft(e.target.value)}
                  className="min-h-[92px] w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none"
                  placeholder="Rédiger la réponse à envoyer depuis Gmail..."
                />
                {(gmailAttachments.length > 0 || selectedGmailDocs.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedGmailDocs.map(doc => (
                      <span
                        key={doc.id}
                        className="inline-flex max-w-[280px] items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700"
                      >
                        <FileText className="size-3" />
                        <span className="truncate">{doc.file_name}</span>
                        <button
                          type="button"
                          className="rounded-full p-0.5 hover:bg-emerald-100"
                          onClick={() => removeGmailSelectedDocument(doc.id)}
                          aria-label="Retirer le document"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                    {gmailAttachments.map((file, index) => (
                      <span
                        key={`${file.name}-${file.size}-${index}`}
                        className="inline-flex max-w-[240px] items-center gap-1.5 rounded-full border bg-background px-2 py-1 text-[11px] text-muted-foreground"
                      >
                        <Paperclip className="size-3" />
                        <span className="truncate">{file.name}</span>
                        <span className="shrink-0">{fmtFileSize(file.size)}</span>
                        <button
                          type="button"
                          className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => removeGmailAttachment(index)}
                          aria-label="Retirer la pièce jointe"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setGmailDocPickerOpen(true)}
                      className="h-8 gap-1.5"
                    >
                      <Paperclip className="size-3.5" />
                      Fichier
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGmailAiDraft}
                      disabled={gmailAiDrafting}
                      className="h-8 gap-1.5"
                    >
                      <Sparkles className="size-3.5 text-brand" />
                      {gmailAiDrafting ? 'Génération...' : 'Brouillon IA'}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="ghost" className="h-8 gap-1.5 text-muted-foreground">
                      <a href="https://mail.google.com/" target="_blank" rel="noreferrer">
                        Gmail
                        <ExternalLink className="size-3.5" />
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSubmitGmailMessage('draft')}
                      disabled={gmailDrafting || !gmailDraft.trim()}
                      className="h-8 gap-1.5"
                    >
                      <Mail className="size-4" />
                      {gmailDrafting ? 'Création...' : 'Créer brouillon'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSubmitGmailMessage('send')}
                      disabled={gmailSending || !gmailDraft.trim()}
                      className="h-8 gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"
                    >
                      <Send className="size-3.5" />
                      {gmailSending ? 'Envoi...' : 'Envoyer'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : !selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="flex size-12 items-center justify-center rounded-2xl border bg-card">
              <MessageSquare className="size-6 opacity-40" />
            </div>
            <p className="text-sm">{t.inbox.emptyThread}</p>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-card px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-background text-sm font-semibold">
                  {tenantName(selected).slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{tenantName(selected)}</p>
                  <div className="flex min-w-0 items-center gap-2">
                    <Mail className="size-3 text-muted-foreground" />
                    <p className="truncate text-xs text-muted-foreground">{selected.subject}</p>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={handleCreateTicketFromConversation}>
                  <Plus className="size-3.5" />
                  Ticket
                </Button>
                <Badge className={cn('border text-[10px]', CATEGORY_COLORS[selected.category])}>
                  {t.inbox.categories[selected.category as keyof typeof t.inbox.categories]}
                </Badge>
                <div className="hidden items-center gap-1.5 rounded-full border bg-brand-muted px-2 py-1 text-[11px] font-medium text-brand sm:flex">
                  <Bot className="size-3" />
                  IA prête
                </div>
              </div>
            </div>

            {selected.status === 'pending' && (
              <div className="flex items-center gap-2 border-b bg-brand-muted px-4 py-2 text-xs text-muted-foreground">
                <Bot className="size-3.5 text-brand" />
                L&apos;IA suit cette conversation. Générez un brouillon ou répondez manuellement.
              </div>
            )}

            {aiError && (
              <div className="flex items-center gap-2 border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
                <Bot className="size-3.5" />
                {aiError}
              </div>
            )}

            <AiSuggestionPanel
              channel="Inbox"
              preview={visibleAiPreview}
              onClassify={handlePreviewAiClassification}
              onDraft={handlePreviewAiDraft}
              onUseDraft={handleUseAiDraftPreview}
              onCreateTicket={handleCreateTicketFromConversation}
            />

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map(msg => {
                const isManager = msg.role === 'manager';
                const isAi = msg.role === 'ai';
                return (
                  <div
                    key={msg.id}
                    className={cn('flex animate-isimple-slide-in', isManager || isAi ? 'justify-end' : 'justify-start')}
                  >
                    <div className={cn('flex max-w-[78%] flex-col', isManager || isAi ? 'items-end' : 'items-start')}>
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {isAi ? <Bot className="size-3 text-brand" /> : isManager ? <UserRound className="size-3" /> : <MessageCircle className="size-3" />}
                        <span>{isAi ? 'Agent IA' : isManager ? 'Gestionnaire' : 'Locataire'}</span>
                        <span>·</span>
                        <span>{fmtTime(msg.created_at)}</span>
                      </div>
                      <div className={cn(
                        'rounded-2xl border px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
                        isManager && 'rounded-br-sm border-brand/30 bg-brand text-brand-foreground',
                        msg.role === 'tenant' && 'rounded-bl-sm border-border bg-card',
                        isAi && 'rounded-br-sm border-brand/20 bg-brand-muted text-foreground',
                      )}>
                        <div className="whitespace-pre-wrap">
                          <MessageContent content={msg.content} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="shrink-0 border-t bg-card p-3">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Réponse gestionnaire</span>
                <span className="hidden sm:block">Entrée pour envoyer</span>
              </div>
              <div className="flex gap-2">
                <input
                  ref={documentInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={e => handleConversationDocument(e.target.files?.[0])}
                />
                <textarea
                  value={compose}
                  onChange={e => setCompose(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Répondre ou demander un brouillon IA..."
                  className="min-h-[72px] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none"
                />
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => documentInputRef.current?.click()}
                    disabled={uploadingDocument}
                    className="h-8 gap-1.5"
                  >
                    {uploadingDocument ? <Upload className="size-3.5 animate-pulse" /> : <Paperclip className="size-3.5" />}
                    Document
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleAiDraft} disabled={drafting} className="h-8 gap-1.5">
                    <Sparkles className="size-3.5 text-brand" />
                    {drafting ? t.inbox.generating : t.inbox.aiDraft}
                  </Button>
                  <Button size="sm" onClick={handleSend} disabled={sending || !compose.trim()} className="h-8 gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90">
                    <Send className="size-3.5" />
                    {t.common.send}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={gmailDocPickerOpen} onOpenChange={setGmailDocPickerOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Ajouter des fichiers à l&apos;email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Documents suggérés</p>
                  <p className="text-xs text-muted-foreground">Basés sur le locataire identifié et ses documents confirmés.</p>
                </div>
                <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={loadGmailSuggestedDocuments} disabled={gmailDocLoading}>
                  <RefreshCw className={cn('size-3.5', gmailDocLoading && 'animate-spin')} />
                  Actualiser
                </Button>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border">
                {gmailDocLoading ? (
                  <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                    <RefreshCw className="size-4 animate-spin" />
                    Recherche des documents liés...
                  </div>
                ) : gmailSuggestedDocs.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground">
                    Aucun document confirmé lié à ce locataire. Vous pouvez parcourir votre ordinateur.
                  </div>
                ) : (
                  gmailSuggestedDocs.map(doc => {
                    const selectedDoc = gmailSelectedDocumentIds.includes(doc.id);
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => toggleGmailSuggestedDocument(doc.id)}
                        className={cn(
                          'flex w-full items-center gap-3 border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-muted/50',
                          selectedDoc && 'bg-emerald-50'
                        )}
                      >
                        <span className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-lg border',
                          selectedDoc ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'bg-background text-muted-foreground'
                        )}>
                          {selectedDoc ? <CheckCircle2 className="size-4" /> : <FileText className="size-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{doc.file_name}</span>
                          <span className="text-xs text-muted-foreground">{doc.doc_type} · {doc.status === 'confirmed' ? 'confirmé' : 'à confirmer'}</span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => gmailAttachmentInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Parcourir l&apos;ordinateur
            </Button>
            <Button onClick={() => setGmailDocPickerOpen(false)}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New conversation dialog */}
      <Dialog open={newConvOpen} onOpenChange={setNewConvOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.inbox.newConversation}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.inbox.selectTenant}</Label>
              <select
                value={newConv.tenant_id}
                onChange={e => setNewConv(p => ({ ...p, tenant_id: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{t.inbox.selectTenant}</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t.inbox.subject}</Label>
              <Input
                value={newConv.subject}
                onChange={e => setNewConv(p => ({ ...p, subject: e.target.value }))}
                placeholder="Ex : Suivi du bail"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.inbox.firstMessage}</Label>
              <textarea
                value={newConv.first_message}
                onChange={e => setNewConv(p => ({ ...p, first_message: e.target.value }))}
                placeholder="Bonjour, je vous contacte au sujet de..."
                className="flex w-full min-h-[80px] resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewConvOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleCreateConversation} disabled={creating || !newConv.subject || !newConv.tenant_id}>
              {creating ? t.common.loading : t.common.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
