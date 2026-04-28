'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useWorkspace } from '@/contexts/workspace-context';
import { useRouter } from 'next/navigation';
import type { Workspace } from '@/db';

const personalItems = [
  { icon: User, label: 'Profil', description: 'Nom, email, photo' },
  { icon: Bell, label: 'Notifications', description: 'Alertes et rappels' },
  { icon: Shield, label: 'Sécurité', description: 'Mot de passe, authentification' },
];

const teamItems = [
  { icon: Building2, label: 'Workspace', description: 'Nom, plan, facturation' },
  { icon: Users, label: 'Membres', description: 'Inviter et gérer les membres' },
];

type AIProvider = 'anthropic' | 'openai' | 'gemini';

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
  {
    value: 'gemini',
    label: 'Gemini',
    description: 'Option Google, utile pour élargir les tests multi-providers.',
    defaultModel: 'gemini-2.5-flash',
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
          {personalItems.map(({ icon: Icon, label, description }) => (
            <div
              key={label}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <Icon className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          ÉQUIPE
        </p>
        <div className="rounded-lg border divide-y">
          {teamItems.map(({ icon: Icon, label, description }) => (
            <div
              key={label}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <Icon className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

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
