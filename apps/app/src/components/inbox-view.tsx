'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Send, Sparkles, MessageSquare } from 'lucide-react';
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
import type { Conversation, Message, Tenant } from '@isimple/db';

type ConversationWithTenant = Conversation & { tenants: Pick<Tenant, 'first_name' | 'last_name'> | null };

const CATEGORY_COLORS: Record<Conversation['category'], string> = {
  maintenance: 'bg-orange-100 text-orange-700',
  paiement: 'bg-blue-100 text-blue-700',
  réclamation: 'bg-red-100 text-red-700',
  document: 'bg-purple-100 text-purple-700',
  information: 'bg-gray-100 text-gray-700',
  autre: 'bg-gray-100 text-gray-600',
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

  return (
    <div className="flex h-[calc(100vh-7rem)] border rounded-lg overflow-hidden">
      {/* Conversations list */}
      <div className="w-72 shrink-0 flex flex-col border-r">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-medium">{t.inbox.title}</span>
          <Button size="icon" variant="ghost" className="size-7" onClick={() => setNewConvOpen(true)}>
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-4 text-center">
              <MessageSquare className="size-8 opacity-30" />
              <p className="text-xs">{t.inbox.emptyList}</p>
            </div>
          ) : conversations.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className={cn(
                'w-full text-left px-3 py-3 border-b hover:bg-muted/50 transition-colors',
                selected?.id === c.id && 'bg-muted'
              )}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-sm font-medium truncate">{tenantName(c)}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{fmtTime(c.last_message_at)}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate mb-1.5">{c.subject}</p>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', CATEGORY_COLORS[c.category])}>
                {t.inbox.categories[c.category as keyof typeof t.inbox.categories]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Thread view */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <MessageSquare className="size-8 opacity-30" />
            <p className="text-sm">{t.inbox.emptyThread}</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
              <div>
                <p className="text-sm font-medium">{tenantName(selected)}</p>
                <p className="text-xs text-muted-foreground">{selected.subject}</p>
              </div>
              <Badge className={cn('ml-auto text-[10px]', CATEGORY_COLORS[selected.category])}>
                {t.inbox.categories[selected.category as keyof typeof t.inbox.categories]}
              </Badge>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={cn('flex', msg.role === 'manager' ? 'justify-end' : 'justify-start')}
                >
                  <div className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm',
                    msg.role === 'manager' && 'bg-primary text-primary-foreground rounded-br-sm',
                    msg.role === 'tenant' && 'bg-muted rounded-bl-sm',
                    msg.role === 'ai' && 'bg-violet-50 border border-violet-200 text-violet-900 rounded-bl-sm',
                  )}>
                    {msg.role === 'ai' && (
                      <div className="flex items-center gap-1 text-[10px] text-violet-500 mb-1">
                        <Sparkles className="size-3" />IA
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={cn(
                      'text-[10px] mt-1',
                      msg.role === 'manager' ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground',
                    )}>
                      {fmtTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Compose */}
            <div className="border-t p-3 space-y-2 shrink-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{t.inbox.sendAs} :</span>
                <button
                  onClick={() => setSendRole('manager')}
                  className={cn('px-2 py-0.5 rounded-full', sendRole === 'manager' ? 'bg-primary text-primary-foreground' : 'bg-muted')}
                >
                  {t.inbox.manager}
                </button>
                <button
                  onClick={() => setSendRole('tenant')}
                  className={cn('px-2 py-0.5 rounded-full', sendRole === 'tenant' ? 'bg-primary text-primary-foreground' : 'bg-muted')}
                >
                  {t.inbox.tenant}
                </button>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={compose}
                  onChange={e => setCompose(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Écrire un message... (Entrée pour envoyer)"
                  className="flex-1 min-h-[72px] resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={handleAiDraft} disabled={drafting} className="gap-1.5 h-8">
                    <Sparkles className="size-3.5" />
                    {drafting ? t.inbox.generating : t.inbox.aiDraft}
                  </Button>
                  <Button size="sm" onClick={handleSend} disabled={sending || !compose.trim()} className="gap-1.5 h-8">
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
