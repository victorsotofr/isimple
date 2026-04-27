'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, CircleDot, Mail, MessageCircle, MessageSquare, Plus, Send, Sparkles, UserRound } from 'lucide-react';
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

export function InboxView() {
  const { t } = useLanguage();
  const { activeWorkspace } = useWorkspace();
  const supabase = createClient();

  const [conversations, setConversations] = useState<ConversationWithTenant[]>([]);
  const [selected, setSelected] = useState<ConversationWithTenant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [compose, setCompose] = useState('');
  const [sendRole, setSendRole] = useState<'manager' | 'tenant'>('manager');
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConv, setNewConv] = useState({ tenant_id: '', subject: '', first_message: '' });
  const [creating, setCreating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    loadConversations();
    supabase.from('tenants').select('*').eq('workspace_id', activeWorkspace.id)
      .then(({ data }) => setTenants((data ?? []) as Tenant[]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

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

  async function handleSend() {
    if (!compose.trim() || !selected || !activeWorkspace) return;
    setSending(true);
    await supabase.from('messages').insert({
      conversation_id: selected.id,
      workspace_id: activeWorkspace.id,
      content: compose.trim(),
      role: sendRole,
    });

    // Auto-classify if tenant message
    if (sendRole === 'tenant') {
      classifyAndUpdate(selected.id, compose.trim());
    }

    setCompose('');
    setSending(false);
  }

  async function classifyAndUpdate(convId: string, message: string) {
    if (!activeWorkspace) return;
    try {
      const res = await fetch('/api/agent/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: activeWorkspace.id, message }),
      });
      if (res.ok) {
        const { category } = await res.json();
        if (category) {
          await supabase.from('conversations').update({ category }).eq('id', convId);
          setConversations(prev =>
            prev.map(c => c.id === convId ? { ...c, category } : c)
          );
          if (selected?.id === convId) {
            setSelected(prev => prev ? { ...prev, category } : prev);
          }
        }
      }
    } catch { /* agent offline — skip */ }
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
          tenant_id: selected.tenant_id ?? null,
          subject: selected.subject,
          context: context || selected.subject,
          recipient_name: tenantName,
          tone: 'formal',
        }),
      });
      if (res.ok) {
        const { draft } = await res.json();
        setCompose(draft ?? '');
        setSendRole('manager');
      }
    } catch { /* agent offline */ }
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
        role: 'tenant',
      });
      // Auto-classify first message
      classifyAndUpdate(conv.id, newConv.first_message.trim());
    }

    if (conv) {
      const c = conv as ConversationWithTenant;
      setConversations(prev => [c, ...prev]);
      setSelected(c);
    }

    setNewConvOpen(false);
    setNewConv({ tenant_id: '', subject: '', first_message: '' });
    setCreating(false);
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
                    onClick={() => setSelected(c)}
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
        {!selected ? (
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
                        <span>{isAi ? 'Agent IA' : isManager ? t.inbox.manager : t.inbox.tenant}</span>
                        <span>·</span>
                        <span>{fmtTime(msg.created_at)}</span>
                      </div>
                      <div className={cn(
                        'rounded-2xl border px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
                        isManager && 'rounded-br-sm border-brand/30 bg-brand text-brand-foreground',
                        msg.role === 'tenant' && 'rounded-bl-sm border-border bg-card',
                        isAi && 'rounded-br-sm border-brand/20 bg-brand-muted text-foreground',
                      )}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="shrink-0 border-t bg-card p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{t.inbox.sendAs} :</span>
                <button
                  type="button"
                  onClick={() => setSendRole('manager')}
                  className={cn('rounded-full px-2 py-1 transition-colors', sendRole === 'manager' ? 'bg-foreground text-background' : 'bg-muted hover:text-foreground')}
                >
                  {t.inbox.manager}
                </button>
                <button
                  type="button"
                  onClick={() => setSendRole('tenant')}
                  className={cn('rounded-full px-2 py-1 transition-colors', sendRole === 'tenant' ? 'bg-foreground text-background' : 'bg-muted hover:text-foreground')}
                >
                  {t.inbox.tenant}
                </button>
                <span className="ml-auto hidden items-center gap-1 text-[11px] sm:flex">
                  <CircleDot className="size-3 text-emerald-500" />
                  Entrée pour envoyer
                </span>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={compose}
                  onChange={e => setCompose(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Répondre ou demander un brouillon IA..."
                  className="min-h-[72px] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none"
                />
                <div className="flex flex-col gap-2">
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
                placeholder="Ex : Fuite d'eau dans la salle de bain"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.inbox.firstMessage}</Label>
              <textarea
                value={newConv.first_message}
                onChange={e => setNewConv(p => ({ ...p, first_message: e.target.value }))}
                placeholder="Bonjour, j'ai constaté une fuite d'eau..."
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
