'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Trash2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspace } from '@/contexts/workspace-context';
import { createClient } from '@/lib/supabase-browser';
import type { Provider } from '@/db/types';

const providerSchema = z.object({
  name: z.string().trim().min(2, 'Nom requis'),
  specialty: z.string().trim().min(2, 'Spécialité requise'),
  company: z.string().trim().optional().or(z.literal('')),
  email: z.string().trim().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
  active: z.boolean().default(true),
});

type ProviderForm = z.infer<typeof providerSchema>;

const defaultValues: ProviderForm = {
  name: '',
  specialty: '',
  company: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
  active: true,
};

function nullable(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export default function PrestatairesPage() {
  const { activeWorkspace } = useWorkspace();
  const supabase = createClient();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const form = useForm<ProviderForm>({
    resolver: zodResolver(providerSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    supabase
      .from('providers')
      .select('*')
      .eq('workspace_id', activeWorkspace.id)
      .order('name', { ascending: true })
      .then(({ data }) => {
        setProviders((data ?? []) as Provider[]);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  const activeCount = useMemo(() => providers.filter(provider => provider.active).length, [providers]);

  const openCreate = () => {
    setEditing(null);
    setSubmitError('');
    form.reset(defaultValues);
    setOpen(true);
  };

  const openEdit = (provider: Provider) => {
    setEditing(provider);
    setSubmitError('');
    form.reset({
      name: provider.name,
      specialty: provider.specialty,
      company: provider.company ?? '',
      email: provider.email ?? '',
      phone: provider.phone ?? '',
      address: provider.address ?? '',
      notes: provider.notes ?? '',
      active: provider.active,
    });
    setOpen(true);
  };

  const onSubmit = async (values: ProviderForm) => {
    if (!activeWorkspace) return;
    setSaving(true);
    setSubmitError('');

    const payload = {
      workspace_id: activeWorkspace.id,
      name: values.name,
      specialty: values.specialty,
      company: nullable(values.company),
      email: nullable(values.email),
      phone: nullable(values.phone),
      address: nullable(values.address),
      notes: nullable(values.notes),
      active: values.active,
      updated_at: new Date().toISOString(),
    };

    const query = editing
      ? supabase.from('providers').update(payload).eq('id', editing.id).select().single()
      : supabase.from('providers').insert(payload).select().single();

    const { data, error } = await query;
    if (error) {
      setSubmitError(error.message);
      setSaving(false);
      return;
    }

    const saved = data as Provider;
    setProviders(prev => {
      if (editing) {
        return prev.map(provider => provider.id === saved.id ? saved : provider);
      }
      return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
    });
    setSaving(false);
    setOpen(false);
    setEditing(null);
    form.reset(defaultValues);
  };

  const deleteProvider = async (provider: Provider) => {
    if (!confirm(`Supprimer ${provider.name} ? Les tickets existants garderont leur historique.`)) return;
    const { error } = await supabase.from('providers').delete().eq('id', provider.id);
    if (error) {
      alert(error.message);
      return;
    }
    setProviders(prev => prev.filter(item => item.id !== provider.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Prestataires</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {providers.length} contacts, {activeCount} actifs
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Ajouter
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : providers.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
            <Wrench className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Aucun prestataire pour l’instant.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Ajoutez vos artisans et entreprises pour les assigner aux tickets de maintenance.
          </p>
          <Button variant="outline" size="sm" onClick={openCreate} className="mt-4">
            <Plus className="size-4" />
            Ajouter un prestataire
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border divide-y bg-card">
          {providers.map(provider => (
            <div key={provider.id} className="flex items-center gap-4 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Wrench className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-sm">{provider.name}</p>
                  <Badge variant={provider.active ? 'default' : 'secondary'} className="text-xs">
                    {provider.active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="size-3.5" />
                    {provider.company || provider.specialty}
                  </span>
                  {provider.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3.5" />
                      {provider.email}
                    </span>
                  )}
                  {provider.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="size-3.5" />
                      {provider.phone}
                    </span>
                  )}
                </div>
                {provider.notes && (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {provider.notes}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Actions prestataire">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(provider)}>
                    <Pencil className="size-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => deleteProvider(provider)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le prestataire' : 'Ajouter un prestataire'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input {...form.register('name')} placeholder="Dupont Plomberie" />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Spécialité</Label>
                <Input {...form.register('specialty')} placeholder="Plomberie" />
                {form.formState.errors.specialty && (
                  <p className="text-xs text-destructive">{form.formState.errors.specialty.message}</p>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Société</Label>
                <Input {...form.register('company')} placeholder="SAS Dupont" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" {...form.register('email')} placeholder="contact@example.com" />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input {...form.register('phone')} placeholder="06 12 34 56 78" />
              </div>
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input {...form.register('address')} placeholder="12 rue des Artisans" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                {...form.register('notes')}
                rows={4}
                className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                placeholder="Disponibilités, tarifs, zones couvertes..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 rounded border-input" {...form.register('active')} />
              Prestataire actif
            </label>
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
