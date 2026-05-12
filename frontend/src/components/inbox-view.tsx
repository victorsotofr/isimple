'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bot, CheckCircle2, ExternalLink, Mail, MessageCircle, MessageSquare, Paperclip, Plus, RefreshCw, Send, Sparkles, Upload, UserRound } from 'lucide-react';
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

type GmailThreadSummary = {
  id: string;
  thread_id: string;
  message_id: string | null;
  from_email: string | null;
  from_name: string | null;
  to_emails: string[];
  subject: string | null;
  snippet: string | null;
  received_at: string | null;
  labels: string[];
  unread: boolean;
};

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
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [gmailConnections, setGmailConnections] = useState<GmailConnectionSummary[]>([]);
  const [gmailThreads, setGmailThreads] = useState<GmailThreadSummary[]>([]);
  const [selectedGmailThread, setSelectedGmailThread] = useState<GmailThreadSummary | null>(null);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState('');
  const [gmailNotice, setGmailNotice] = useState('');
  const [gmailDraft, setGmailDraft] = useState('');
  const [gmailDrafting, setGmailDrafting] = useState(false);
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
      setGmailThreads((data.threads ?? []) as GmailThreadSummary[]);
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

  function selectGmailThread(thread: GmailThreadSummary) {
    setSelected(null);
    setSelectedGmailThread(thread);
    setGmailDraftStatus('');
    setGmailDraft(`Bonjour,\n\n`);
  }

  async function handleCreateGmailDraft() {
    if (!activeWorkspace || !selectedGmailThread || !gmailConnections[0]) return;
    const to = selectedGmailThread.from_email;
    if (!to) {
      setGmailDraftStatus('Adresse expéditeur introuvable.');
      return;
    }

    setGmailDrafting(true);
    setGmailDraftStatus('');
    try {
      const subject = selectedGmailThread.subject?.startsWith('Re:')
        ? selectedGmailThread.subject
        : `Re: ${selectedGmailThread.subject || '(Sans objet)'}`;
      const res = await fetch('/api/gmail/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          connection_id: gmailConnections[0].id,
          to,
          subject,
          body: gmailDraft.trim(),
          thread_id: selectedGmailThread.thread_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Brouillon Gmail impossible');
      setGmailDraftStatus('Brouillon créé dans Gmail.');
    } catch (e) {
      setGmailDraftStatus(e instanceof Error ? e.message : 'Brouillon Gmail impossible');
    } finally {
      setGmailDrafting(false);
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

        <div className="flex gap-1 border-b px-3 py-2">
          {['Tous', 'Email', 'Chat'].map((filter, idx) => (
            <button
              key={filter}
              type="button"
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                idx === 0 ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {filter}
            </button>
          ))}
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
            <div className="space-y-2">
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
              <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                {gmailThreads.length === 0 ? (
                  <p className="rounded-lg border bg-card px-2 py-2 text-[11px] text-muted-foreground">
                    {gmailLoading ? 'Synchronisation Gmail...' : 'Aucun email récent.'}
                  </p>
                ) : gmailThreads.map(thread => {
                  const active = selectedGmailThread?.thread_id === thread.thread_id;
                  return (
                    <button
                      key={thread.thread_id}
                      type="button"
                      onClick={() => selectGmailThread(thread)}
                      className={cn(
                        'w-full rounded-lg border px-2 py-2 text-left transition-colors hover:bg-card',
                        active ? 'border-brand bg-brand-muted' : 'border-transparent bg-transparent'
                      )}
                    >
                      <div className="mb-0.5 flex items-center gap-2">
                        <Mail className={cn('size-3 shrink-0', thread.unread ? 'text-brand' : 'text-muted-foreground')} />
                        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">
                          {thread.subject || '(Sans objet)'}
                        </span>
                        <span className="shrink-0 text-[9px] text-muted-foreground">
                          {thread.received_at ? fmtTime(thread.received_at) : ''}
                        </span>
                      </div>
                      <p className="truncate pl-5 text-[10px] text-muted-foreground">
                        {thread.from_name || thread.from_email || 'Expéditeur inconnu'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
              <MessageSquare className="size-8 opacity-30" />
              <p className="text-xs">{t.inbox.emptyList}</p>
            </div>
          ) : groupedConversations.map(group => (
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
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {selectedGmailThread ? (
          <>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-card px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-brand" />
                  <p className="truncate text-sm font-semibold">{selectedGmailThread.subject || '(Sans objet)'}</p>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {selectedGmailThread.from_name || selectedGmailThread.from_email || 'Expéditeur inconnu'}
                  {selectedGmailThread.received_at ? ` · ${fmtTime(selectedGmailThread.received_at)}` : ''}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px]">Gmail</Badge>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,0.45fr)_minmax(420px,1fr)] overflow-hidden">
              <div className="flex min-w-0 flex-col border-r bg-card">
                <div className="space-y-3 border-b p-4">
                  <p className="text-xs font-semibold text-muted-foreground">Message reçu</p>
                  <div className="rounded-xl border bg-background p-3 text-sm leading-6">
                    {selectedGmailThread.snippet || 'Aucun aperçu disponible.'}
                  </div>
                  <div className="grid gap-1 text-xs text-muted-foreground">
                    <span>De : {selectedGmailThread.from_email || 'inconnu'}</span>
                    <span>Vers : {selectedGmailThread.to_emails.join(', ') || gmailConnections[0]?.email || 'Gmail'}</span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <p className="text-sm font-semibold">Brouillon Gmail</p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Préparez une réponse. isimple crée un brouillon dans Gmail, sans envoi automatique.
                    </p>
                  </div>
                  <textarea
                    value={gmailDraft}
                    onChange={e => setGmailDraft(e.target.value)}
                    className="min-h-[220px] flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm leading-6 shadow-sm focus:outline-none"
                    placeholder="Rédigez ou collez le brouillon à créer dans Gmail..."
                  />
                  {gmailDraftStatus && (
                    <p className={cn(
                      'text-xs',
                      gmailDraftStatus.includes('créé') ? 'text-emerald-600' : 'text-destructive'
                    )}>
                      {gmailDraftStatus}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateGmailDraft}
                      disabled={gmailDrafting || !gmailDraft.trim()}
                      className="flex-1 gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                    >
                      <Mail className="size-4" />
                      {gmailDrafting ? 'Création...' : 'Créer le brouillon'}
                    </Button>
                    <Button asChild variant="outline" className="gap-2">
                      <a href="https://mail.google.com/" target="_blank" rel="noreferrer">
                        Gmail
                        <ExternalLink className="size-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center bg-muted/30 p-8 text-center text-muted-foreground">
                <div className="max-w-md">
                  <Mail className="mx-auto mb-3 size-8 opacity-40" />
                  <p className="text-sm font-medium text-foreground">Aperçu Gmail natif non embarqué</p>
                  <p className="mt-2 text-xs leading-5">
                    L&apos;API Gmail fournit le contenu et les métadonnées pour l&apos;agent. Pour le rendu complet du fil, ouvrez Gmail ou transformez l&apos;email en conversation isimple.
                  </p>
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
