'use client';

import { useState } from 'react';
import { Settings, User, Bell, Shield, Building2, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useWorkspace } from '@/contexts/workspace-context';
import { useRouter } from 'next/navigation';

const personalItems = [
  { icon: User, label: 'Profil', description: 'Nom, email, photo' },
  { icon: Bell, label: 'Notifications', description: 'Alertes et rappels' },
  { icon: Shield, label: 'Sécurité', description: 'Mot de passe, authentification' },
];

const teamItems = [
  { icon: Building2, label: 'Workspace', description: 'Nom, plan, facturation' },
  { icon: Users, label: 'Membres', description: 'Inviter et gérer les membres' },
];

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
