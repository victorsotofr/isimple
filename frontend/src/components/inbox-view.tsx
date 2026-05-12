'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bot, CheckCircle2, ExternalLink, Mail, MessageCircle, MessageSquare, Paperclip, Plus, RefreshCw, Send, Sparkles, Upload, UserRound, X } from 'lucide-react';
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
import type { Conversation, Message, Tenant } from '@/db';

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

type SourceFilter = 'all' | 'isimple' | 'gmail' | 'whatsapp';

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

function agentErrorMessage(data: unknown): string {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === 'string') return obj.detail;
    if (typeof obj.error === 'string') return obj.error;
  }
  return 'Agent IA indisponible.';
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

export function InboxView() {
  const { t } = useLanguage();
  const { activeWorkspace } = useWorkspace();
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
  const [gmailDraftStatus, setGmailDraftStatus] = useState('');

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
      if (connections.length > 0) await loadGmailThreads(connections[0].id);
    } catch (e) {
      setGmailError(e instanceof Error ? e.message : 'Connexion Gmail indisponible');
    }
  }

  async function loadGmailThreads(connectionId?: string) {
    if (!activeWorkspace) return;
    const id = connectionId ?? gmailConnections[0]?.id;
    if (!id) return;
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
    const draft = value.replace(/\[Votre Nom\]/gi, activeWorkspace?.name ?? 'Votre agence').trim();
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
    const accountEmail = gmailConnections[0]?.email?.toLowerCase();
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
    };
  }

  function buildGmailComposerData() {
    const target = gmailReplyTarget();
    if (!activeWorkspace || !selectedGmailThread || !gmailConnections[0] || !target?.email) {
      return null;
    }

    const form = new FormData();
    form.append('workspace_id', activeWorkspace.id);
    form.append('connection_id', gmailConnections[0].id);
    form.append('to', target.email);
    form.append('subject', gmailReplySubject());
    form.append('body', gmailDraft.trim());
    form.append('thread_id', selectedGmailThread.thread_id);
    gmailAttachments.forEach(file => form.append('attachments', file));
    return form;
  }

  async function handleGmailAiDraft() {
    if (!activeWorkspace || !selectedGmailThread) return;
    const target = gmailReplyTarget();
    if (!target?.email) {
      setGmailDraftStatus('Destinataire Gmail introuvable.');
      return;
    }
    setGmailAiDrafting(true);
    setGmailDraftStatus('');

    const context = [
      'Canal: Gmail',
      `Répondre à: ${target.name} <${target.email}>`,
      `Sujet: ${selectedGmailThread.subject || '(Sans objet)'}`,
      '',
      'Thread Gmail:',
      selectedGmailBody,
    ].join('\n');

    try {
      const res = await fetch('/api/agent/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          sender_email: target.email,
          subject: gmailReplySubject(),
          context,
          recipient_name: target.name,
          tone: 'formal',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGmailDraft(withGmailSignature(data.draft ?? ''));
      } else {
        setGmailDraftStatus(agentErrorMessage(data));
      }
    } catch {
      setGmailDraftStatus('Agent IA indisponible.');
    } finally {
      setGmailAiDrafting(false);
    }
  }

  function handleAddGmailAttachments(files: FileList | null) {
    if (!files || files.length === 0) return;
    setGmailAttachments(prev => [...prev, ...Array.from(files)]);
    if (gmailAttachmentInputRef.current) gmailAttachmentInputRef.current.value = '';
  }

  function removeGmailAttachment(index: number) {
    setGmailAttachments(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmitGmailMessage(action: 'draft' | 'send') {
    if (!activeWorkspace || !selectedGmailThread || !gmailConnections[0]) return;
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
        const refreshed = await loadGmailThreads(gmailConnections[0].id);
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
    if (!selected || !activeWorkspace) return;
    setDrafting(true);
    const tenant = selected.tenants;
    const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}` : undefined;
    const context = messages
      .slice(-6)
      .map(m => `${m.role === 'tenant' ? (tenantName ?? 'Locataire') : 'Gestionnaire'}: ${m.content}`)
      .join('\n');

    try {
      const res = await fetch('/api/agent/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          conversation_id: selected.id,
          tenant_id: selected.tenant_id ?? null,
          subject: selected.subject,
          context: context || selected.subject,
          recipient_name: tenantName,
          tone: 'formal',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const { draft } = data;
        setCompose(draft ?? '');
        setAiError('');
      } else {
        setAiError(agentErrorMessage(data));
      }
    } catch {
      setAiError('Agent IA indisponible.');
    }
    setDrafting(false);
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

  const tenantName = (c: ConversationWithTenant) =>
    c.tenants ? `${c.tenants.first_name} ${c.tenants.last_name}` : 'Inconnu';

  const groupedConversations = (['open', 'pending', 'closed'] as Conversation['status'][]).map(status => ({
    status,
    items: conversations.filter(c => c.status === status),
  })).filter(group => group.items.length > 0);
  const showGmail = sourceFilter === 'all' || sourceFilter === 'gmail';
  const showIsimple = sourceFilter === 'all' || sourceFilter === 'isimple';
  const hasVisibleItems = (showGmail && gmailThreads.length > 0) || (showIsimple && conversations.length > 0);
  const sourceOptions: Array<{ id: SourceFilter; label: string; count: number; disabled?: boolean }> = [
    { id: 'all', label: 'Tous', count: conversations.length + gmailThreads.length },
    { id: 'isimple', label: 'isimple', count: conversations.length },
    { id: 'gmail', label: 'Gmail', count: gmailThreads.length },
    { id: 'whatsapp', label: 'WhatsApp', count: 0, disabled: true },
  ];
  const selectedGmailSender = selectedGmailThread
    ? selectedGmailThread.reply_to_name || selectedGmailThread.from_name || selectedGmailThread.reply_to_email || selectedGmailThread.from_email || 'Expéditeur Gmail'
    : '';
  const selectedGmailMessages = selectedGmailThread?.messages?.length
    ? selectedGmailThread.messages
    : selectedGmailThread ? [{
      id: selectedGmailThread.message_id ?? selectedGmailThread.thread_id,
      message_id: selectedGmailThread.message_id ?? selectedGmailThread.thread_id,
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
                disabled={option.disabled}
                onClick={() => handleSourceFilter(option.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                  sourceFilter === option.id
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:text-foreground',
                  option.disabled && 'cursor-not-allowed opacity-40 hover:text-muted-foreground'
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
          {gmailConnections.length === 0 ? (
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
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3 text-emerald-500" />
                    <p className="truncate text-xs font-semibold">{gmailConnections[0].email}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Emails Gmail</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 rounded-lg"
                  onClick={() => loadGmailThreads(gmailConnections[0].id)}
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
              <MessageSquare className="size-8 opacity-30" />
              <p className="text-xs">
                {sourceFilter === 'gmail'
                  ? gmailConnections.length === 0 ? 'Connectez Gmail pour voir les emails.' : 'Aucun email récent.'
                  : sourceFilter === 'whatsapp' ? 'WhatsApp sera ajouté comme canal connecté.'
                    : t.inbox.emptyList}
              </p>
              {sourceFilter === 'gmail' && gmailConnections.length === 0 && (
                <Button size="sm" variant="outline" className="h-8" onClick={handleConnectGmail}>
                  Connecter Gmail
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

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {selectedGmailMessages.map((message, index) => {
                const isOutgoing = message.direction === 'outgoing';
                const sender = isOutgoing
                  ? 'Gestionnaire'
                  : message.from_name || message.from_email || selectedGmailSender;
                return (
                  <div
                    key={message.message_id || message.id}
                    className={cn('flex animate-isimple-slide-in', isOutgoing ? 'justify-end' : 'justify-start')}
                  >
                    <div className={cn('flex max-w-[78%] flex-col', isOutgoing ? 'items-end' : 'items-start')}>
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
                        'rounded-2xl border px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
                        isOutgoing
                          ? 'rounded-br-sm border-brand/30 bg-brand text-brand-foreground'
                          : 'rounded-bl-sm border-border bg-card'
                      )}>
                        {index === 0 && (
                          <div className={cn('mb-2 border-b pb-2 text-xs font-semibold', isOutgoing ? 'border-white/20 text-brand-foreground' : 'text-foreground')}>
                            {message.subject || selectedGmailThread.subject || '(Sans objet)'}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">
                          {message.body_text || message.snippet || 'Aucun contenu lisible dans cet email.'}
                        </div>
                        <div className={cn('mt-3 grid gap-1 border-t pt-2 text-[11px]', isOutgoing ? 'border-white/20 text-brand-foreground/75' : 'text-muted-foreground')}>
                          <span>De : {message.from_name || message.from_email || 'inconnu'} {message.from_email ? `<${message.from_email}>` : ''}</span>
                          <span>Vers : {message.to_emails.join(', ') || gmailConnections[0]?.email || 'Gmail'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={gmailBottomRef} />
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
                {gmailAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
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
                      onClick={() => gmailAttachmentInputRef.current?.click()}
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
