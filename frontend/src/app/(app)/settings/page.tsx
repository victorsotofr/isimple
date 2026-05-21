'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Settings,
  User,
  Bell,
  Shield,
  Building2,
  Users,
  Trash2,
  Bot,
  Loader2,
  Save,
  Copy,
  MailPlus,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useWorkspace } from '@/contexts/workspace-context';
import { useRouter } from 'next/navigation';
import { createClient, getAuthenticatedUser } from '@/lib/supabase-browser';
import type { Workspace, WorkspaceInvitation, WorkspaceMember } from '@/db';

type SettingsItem = {
  icon: LucideIcon;
  label: string;
  description: string;
  href?: string;
};

const personalItems: SettingsItem[] = [
  { icon: User, label: 'Profil', description: 'Nom, email, photo', href: '/profile' },
  { icon: Bell, label: 'Notifications', description: 'Alertes et rappels' },
  { icon: Shield, label: 'Sécurité', description: 'Mot de passe, authentification' },
];

type AIProvider = 'anthropic' | 'openai';

const AI_PROVIDERS: Array<{
  value: AIProvider;
  label: string;
  description: string;
  defaultModel: string;
}> = [
  {
    value: 'anthropic',
    label: 'Anthropic',
    description: 'Claude pour la rédaction longue et les workflows agentiques.',
    defaultModel: 'claude-sonnet-4-20250514',
  },
  {
    value: 'openai',
    label: 'OpenAI',
    description: 'Bon choix généraliste pour classification, brouillons et coûts maîtrisés.',
    defaultModel: 'gpt-4.1-mini',
  },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readAISettings(workspace: Workspace | null): { provider: AIProvider; model: string } {
  const settings = asRecord(workspace?.settings);
  const ai = asRecord(settings.ai);
  const provider = AI_PROVIDERS.some(p => p.value === ai.provider)
    ? ai.provider as AIProvider
    : 'anthropic';
  const model = typeof ai.model === 'string'
    ? ai.model
    : AI_PROVIDERS.find(p => p.value === provider)?.defaultModel ?? '';
  return { provider, model };
}

type PendingInvite = Pick<
  WorkspaceInvitation,
  'id' | 'email' | 'role' | 'status' | 'token' | 'expires_at' | 'created_at'
>;

function inviteUrl(token: string) {
  if (typeof window === 'undefined') return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}

export default function SettingsPage() {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const canDelete = workspaces.length > 1;

  const handleDelete = async () => {
    if (!activeWorkspace) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Erreur');
        setDeleting(false);
        return;
      }
      const remaining = workspaces.filter(w => w.id !== activeWorkspace.id);
      setActiveWorkspace(remaining[0]);
      setConfirmOpen(false);
      router.refresh();
    } catch {
      setError('Erreur serveur');
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Settings className="size-5" />
        <h1 className="text-2xl font-semibold">Paramètres</h1>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          PERSONNEL
        </p>
        <div className="rounded-lg border divide-y">
          {personalItems.map(({ icon: Icon, label, description, href }) => (
            href ? (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <Icon className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </Link>
            ) : (
              <div
                key={label}
                className="flex items-center gap-4 px-4 py-3 text-muted-foreground"
                aria-disabled="true"
              >
                <Icon className="size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Bientôt
                </span>
              </div>
            )
          ))}
        </div>
      </div>

      {activeWorkspace && <TeamSettingsPanel workspace={activeWorkspace} />}

      {activeWorkspace && (
        <AISettingsPanel
          key={activeWorkspace.id}
          workspace={activeWorkspace}
          onWorkspaceUpdate={setActiveWorkspace}
        />
      )}

      {canDelete && activeWorkspace && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            ZONE DANGEREUSE
          </p>
          <div className="rounded-lg border border-destructive/30 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">Supprimer le workspace</p>
              <p className="text-xs text-muted-foreground">
                Supprimer définitivement «&nbsp;{activeWorkspace.name}&nbsp;» et toutes ses données
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-4 mr-2" />
              Supprimer
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le workspace</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. Toutes les données de&nbsp;
            <strong>{activeWorkspace?.name}</strong>&nbsp;seront supprimées.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Suppression…' : 'Confirmer la suppression'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamSettingsPanel({ workspace }: { workspace: Workspace }) {
  const supabase = createClient();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const [message, setMessage] = useState('');

  const currentMember = useMemo(
    () => members.find(member => member.user_id === currentUserId) ?? null,
    [currentUserId, members],
  );
  const isAdmin = currentMember?.role === 'admin';

  const loadTeam = async () => {
    setLoading(true);
    setMessage('');
    const user = await getAuthenticatedUser(supabase);
    setCurrentUserId(user?.id ?? '');
    const [membersRes, invitesRes] = await Promise.all([
      supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: true }),
      fetch(`/api/workspaces/${workspace.id}/invitations`),
    ]);
    setMembers((membersRes.data ?? []) as WorkspaceMember[]);
    if (invitesRes.ok) {
      const data = await invitesRes.json();
      setInvites(((data.invitations ?? []) as PendingInvite[]).filter(invite => invite.status === 'pending'));
    } else {
      setInvites([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTeam();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace.id]);

  const createInvite = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Impossible de créer l'invitation.");
        return;
      }

      const invitation = data.invitation as PendingInvite;
      setInvites(prev => [
        invitation,
        ...prev.filter(item => item.id !== invitation.id),
      ]);
      setEmail('');
      setRole('member');
      setMessage(data.reused
        ? 'Une invitation active existe déjà. Copiez le lien pour le renvoyer.'
        : 'Invitation créée. Copiez le lien pour l’envoyer.');
    } catch {
      setMessage("Erreur réseau pendant la création de l'invitation.");
    } finally {
      setSaving(false);
    }
  };

  const copyInvite = async (invite: PendingInvite) => {
    await navigator.clipboard.writeText(inviteUrl(invite.token));
    setCopiedId(invite.id);
    window.setTimeout(() => setCopiedId(''), 1600);
  };

  const expireInvite = async (invite: PendingInvite) => {
    const res = await fetch(`/api/workspaces/${workspace.id}/invitations`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitation_id: invite.id, status: 'expired' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Impossible d'expirer l'invitation.");
      return;
    }
    setInvites(prev => prev.filter(item => item.id !== invite.id));
  };

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        ÉQUIPE
      </p>
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Building2 className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{workspace.name}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {members.length} membre{members.length > 1 ? 's' : ''}, {invites.length} invitation{invites.length > 1 ? 's' : ''} en attente
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Chargement de l’équipe...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border divide-y">
              {members.map(member => (
                <div key={member.user_id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {member.user_id === currentUserId ? 'VO' : member.role.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.user_id === currentUserId ? 'Vous' : member.user_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Membre depuis {new Date(member.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className="rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {member.role === 'admin' ? 'Admin' : 'Membre'}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Invitations</p>
              </div>
              {isAdmin ? (
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
                  <Input
                    type="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="nouveau@exemple.fr"
                  />
                  <select
                    value={role}
                    onChange={event => setRole(event.target.value as 'admin' | 'member')}
                    className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="member">Membre</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Button type="button" onClick={createInvite} disabled={saving || !email.trim()}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <MailPlus className="size-4" />}
                    Inviter
                  </Button>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  Seuls les administrateurs peuvent créer de nouvelles invitations.
                </p>
              )}

              {invites.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Aucune invitation en attente.
                </p>
              ) : (
                <div className="rounded-lg border divide-y">
                  {invites.map(invite => (
                    <div key={invite.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {invite.role === 'admin' ? 'Admin' : 'Membre'} · expire le {new Date(invite.expires_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyInvite(invite)}>
                          {copiedId === invite.id ? <CheckCircle2 className="size-3.5" /> : <Copy className="size-3.5" />}
                          {copiedId === invite.id ? 'Copié' : 'Copier'}
                        </Button>
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => expireInvite(invite)}>
                            Expirer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {message && (
                <p className={`text-xs ${
                  message.includes('créée') || message.includes('active')
                    ? 'text-emerald-700'
                    : 'text-destructive'
                }`}>
                  {message}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AISettingsPanel({
  workspace,
  onWorkspaceUpdate,
}: {
  workspace: Workspace;
  onWorkspaceUpdate: (workspace: Workspace) => void;
}) {
  const initial = readAISettings(workspace);
  const [provider, setProvider] = useState<AIProvider>(initial.provider);
  const [model, setModel] = useState(initial.model);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const selectedProvider = AI_PROVIDERS.find(p => p.value === provider) ?? AI_PROVIDERS[0];

  const handleProviderChange = (next: AIProvider) => {
    const previousDefault = selectedProvider.defaultModel;
    const nextProvider = AI_PROVIDERS.find(p => p.value === next) ?? AI_PROVIDERS[0];
    setProvider(next);
    setModel(current => current.trim() && current !== previousDefault ? current : nextProvider.defaultModel);
    setStatus('idle');
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    setMessage('');
    const currentSettings = asRecord(workspace.settings);
    const nextSettings = {
      ...currentSettings,
      ai: {
        provider,
        model: model.trim() || selectedProvider.defaultModel,
      },
    };

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: nextSettings }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error ?? 'Impossible de sauvegarder la configuration IA.');
        return;
      }
      onWorkspaceUpdate(data.workspace as Workspace);
      setStatus('saved');
      setMessage('Configuration IA sauvegardée.');
    } catch {
      setStatus('error');
      setMessage('Erreur réseau pendant la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        INTELLIGENCE ARTIFICIELLE
      </p>
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
            <Bot className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Provider et modèle du workspace</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Ces réglages pilotent les brouillons et classifications. Les clés restent côté backend.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {AI_PROVIDERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => handleProviderChange(item.value)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                provider === item.value
                  ? 'border-brand bg-brand-muted text-foreground'
                  : 'border-border bg-background hover:bg-muted/60'
              }`}
            >
              <span className="text-sm font-semibold">{item.label}</span>
              <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
                {item.description}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="ai-model">Modèle</Label>
          <Input
            id="ai-model"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setStatus('idle');
            }}
            placeholder={selectedProvider.defaultModel}
          />
          <p className="text-xs text-muted-foreground">
            Laissez le modèle par défaut si vous n&apos;avez pas de préférence. Vous pourrez ajouter
            d&apos;autres providers plus tard sans changer le reste du produit.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className={`text-xs ${
            status === 'error' ? 'text-destructive' : status === 'saved' ? 'text-emerald-700' : 'text-muted-foreground'
          }`}>
            {message || `Actif : ${selectedProvider.label} · ${model || selectedProvider.defaultModel}`}
          </p>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Save className="mr-2 size-3.5" />}
            Sauvegarder
          </Button>
        </div>
      </div>
    </div>
  );
}
