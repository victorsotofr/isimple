'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Building2, Home, Car, Store, Sparkles, ChevronRight, FileText, Upload, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { SmartFillPanel } from '@/components/smart-fill-panel';
import { useWorkspace } from '@/contexts/workspace-context';
import { useLanguage } from '@/contexts/language-context';
import { createClient } from '@/lib/supabase-browser';
import type { Lot } from '@/db';

const lotSchema = z.object({
  address: z.string().min(2),
  city: z.string().min(1),
  postal_code: z.string().min(4),
  type: z.enum(['apartment', 'house', 'studio', 'parking', 'commercial', 'other']),
  area_m2: z.coerce.number().positive().optional().or(z.literal('')),
  rent_amount: z.coerce.number().positive(),
  charges_amount: z.coerce.number().min(0).default(0),
});
type LotForm = z.infer<typeof lotSchema>;

const TYPE_ICONS: Record<Lot['type'], React.ElementType> = {
  apartment: Building2,
  house: Home,
  studio: Building2,
  parking: Car,
  commercial: Store,
  other: Building2,
};

export function LotsView() {
  const { t } = useLanguage();
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const onboarding = searchParams.get('onboarding') === '1';

  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [intakeFiles, setIntakeFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [intakeError, setIntakeError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const form = useForm<LotForm>({
    resolver: zodResolver(lotSchema),
    defaultValues: { type: 'apartment', charges_amount: 0 },
  });

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    supabase
      .from('lots')
      .select('*')
      .eq('workspace_id', activeWorkspace.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setLots((data ?? []) as Lot[]);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  const handleAIFill = (data: Record<string, unknown>) => {
    if (data.address) form.setValue('address', data.address as string);
    if (data.city) form.setValue('city', data.city as string);
    if (data.postal_code) form.setValue('postal_code', data.postal_code as string);
    if (data.type && ['apartment','house','studio','parking','commercial','other'].includes(data.type as string)) {
      form.setValue('type', data.type as LotForm['type']);
    }
    if (data.area_m2) form.setValue('area_m2', data.area_m2 as number);
    if (data.rent_amount) form.setValue('rent_amount', data.rent_amount as number);
    if (data.charges_amount != null) form.setValue('charges_amount', data.charges_amount as number);
    setShowAI(false);
  };

  const addIntakeFiles = (incoming: File[]) => {
    const accepted = incoming.filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'));
    setIntakeFiles(prev => [...prev, ...accepted]);
    setIntakeError('');
  };

  const removeIntakeFile = (idx: number) => {
    setIntakeFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadIntakeDocuments = async (lotId?: string): Promise<string[]> => {
    if (!activeWorkspace || intakeFiles.length === 0) return [];
    const docIds: string[] = [];
    for (const file of intakeFiles) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('workspace_id', activeWorkspace.id);
      fd.append('source', lotId ? 'property_create' : 'property_ai_intake');
      if (lotId) fd.append('lot_id', lotId);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Impossible d'importer ${file.name}`);
      }
      const data = await res.json();
      if (data.id) docIds.push(data.id as string);
    }
    return docIds;
  };

  const handleAnalyzeDocumentsOnly = async () => {
    if (!activeWorkspace || intakeFiles.length === 0) return;
    setUploadingDocs(true);
    setIntakeError('');
    try {
      const docIds = await uploadIntakeDocuments();
      setOpen(false);
      setShowAI(false);
      setIntakeFiles([]);
      router.push(docIds[0] ? `/documents/upload?review=${docIds[0]}` : '/documents');
    } catch (e) {
      setIntakeError(e instanceof Error ? e.message : 'Erreur lors de l’import');
    } finally {
      setUploadingDocs(false);
    }
  };

  const onSubmit = async (values: LotForm) => {
    if (!activeWorkspace) return;
    setSaving(true);
    setIntakeError('');
    const { data } = await supabase
      .from('lots')
      .insert({
        workspace_id: activeWorkspace.id,
        address: values.address,
        city: values.city,
        postal_code: values.postal_code,
        type: values.type,
        area_m2: values.area_m2 || null,
        rent_amount: values.rent_amount,
        charges_amount: values.charges_amount ?? 0,
      })
      .select()
      .single();

    if (data) {
      setLots(prev => [data as Lot, ...prev]);
      if (intakeFiles.length > 0) {
        try {
          setUploadingDocs(true);
          const docIds = await uploadIntakeDocuments((data as Lot).id);
          setOpen(false);
          setShowAI(false);
          setIntakeFiles([]);
          form.reset();
          router.push(docIds[0] ? `/documents/upload?review=${docIds[0]}` : `/lots/${(data as Lot).id}`);
          return;
        } catch (e) {
          setIntakeError(e instanceof Error ? e.message : 'Erreur lors de l’import');
          setSaving(false);
          setUploadingDocs(false);
          return;
        }
      }
    }
    setSaving(false);
    setUploadingDocs(false);
    setOpen(false);
    setShowAI(false);
    setIntakeFiles([]);
    form.reset();
  };

  const handleOpen = () => {
    setShowAI(true);
    setIntakeFiles([]);
    setIntakeError('');
    form.reset();
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      {onboarding && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-brand">
                <Building2 className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">
                  Étape 2 sur 3
                </p>
                <h2 className="mt-1 text-lg font-semibold">Ajoutez votre premier bien</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                  Un bien devient le point d’ancrage pour les locataires, documents, messages et tickets.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button size="sm" onClick={handleOpen}>
                <Plus className="size-4 mr-1" />
                Ajouter un bien
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/documents/upload?onboarding=1">
                  <Upload className="size-4 mr-1" />
                  Passer à l’import
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t.lots.title}</h1>
        <Button size="sm" onClick={handleOpen}>
          <Plus className="size-4 mr-2" />
          {t.lots.add}
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">{t.common.loading}</div>
      ) : lots.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">{t.lots.empty}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Ajoutez une adresse, un loyer et quelques détails. Les documents importés pourront ensuite
            être rattachés automatiquement.
          </p>
          <Button variant="outline" size="sm" onClick={handleOpen} className="mt-4">
            <Plus className="size-4 mr-2" />
            {t.lots.add}
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {lots.map((lot) => {
            const Icon = TYPE_ICONS[lot.type];
            return (
              <Link
                key={lot.id}
                href={`/lots/${lot.id}`}
                className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{lot.address}</p>
                  <p className="text-xs text-muted-foreground">{lot.postal_code} {lot.city}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {t.lots.types[lot.type as keyof typeof t.lots.types]}
                </Badge>
                {lot.area_m2 && (
                  <span className="text-xs text-muted-foreground shrink-0">{lot.area_m2} m²</span>
                )}
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium">{lot.rent_amount} €</p>
                  {lot.charges_amount > 0 && (
                    <p className="text-xs text-muted-foreground">+ {lot.charges_amount} € charges</p>
                  )}
                </div>
                <ChevronRight className="size-4 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setShowAI(false); }}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden p-0">
          <div className="grid max-h-[92vh] lg:grid-cols-[0.95fr_1.05fr]">
            <div className="border-b bg-muted/25 p-6 lg:border-b-0 lg:border-r">
              <DialogHeader>
                <DialogTitle className="text-2xl">Créer ou enrichir un bien</DialogTitle>
              </DialogHeader>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Déposez un bail, un état des lieux ou des justificatifs. isimple extrait les champs,
                crée ou retrouve le bien, puis prépare les locataires et documents à réviser.
              </p>

              <div
                className={`mt-6 rounded-2xl border-2 border-dashed bg-background p-6 text-center transition-colors ${
                  dragging ? 'border-brand bg-brand-muted' : 'border-border hover:border-brand/50'
                }`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragging(false);
                  addIntakeFiles(Array.from(e.dataTransfer.files));
                }}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  className="hidden"
                  onChange={e => {
                    addIntakeFiles(Array.from(e.target.files ?? []));
                    if (inputRef.current) inputRef.current.value = '';
                  }}
                />
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-foreground text-background">
                  <Upload className="size-5" />
                </div>
                <p className="mt-4 text-sm font-semibold">
                  Glissez plusieurs documents ici
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF ou images. Création du bien, rattachement locataires et catégorisation en une seule passe.
                </p>
              </div>

              {intakeFiles.length > 0 && (
                <div className="mt-4 rounded-xl border bg-background">
                  {intakeFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} Mo</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeIntakeFile(index); }}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Retirer"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <div className="rounded-xl border bg-background p-3">
                  <CheckCircle2 className="mb-2 size-4 text-emerald-600" />
                  Détecte le type de document
                </div>
                <div className="rounded-xl border bg-background p-3">
                  <CheckCircle2 className="mb-2 size-4 text-emerald-600" />
                  Crée ou rapproche le bien
                </div>
                <div className="rounded-xl border bg-background p-3">
                  <CheckCircle2 className="mb-2 size-4 text-emerald-600" />
                  Prépare la revue humaine
                </div>
              </div>

              {intakeError && <p className="mt-3 text-xs text-destructive">{intakeError}</p>}

              <Button
                type="button"
                variant="outline"
                className="mt-5 w-full"
                disabled={intakeFiles.length === 0 || uploadingDocs}
                onClick={handleAnalyzeDocumentsOnly}
              >
                {uploadingDocs ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
                Analyser les documents sans saisie manuelle
              </Button>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="max-h-[92vh] space-y-5 overflow-y-auto p-6">
              <div>
                <h3 className="text-sm font-semibold">Informations du bien</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Optionnel si vous partez des documents. Utile pour verrouiller le bien avant l’analyse.
                </p>
              </div>

              {showAI ? (
                <SmartFillPanel
                  type="lot"
                  onFill={handleAIFill}
                  onClose={() => setShowAI(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAI(true)}
                  className="flex w-full items-center justify-between rounded-xl border bg-brand-muted px-4 py-3 text-left text-sm font-medium text-brand transition-colors hover:border-brand/40"
                >
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="size-4" />
                    Décrire le bien à l&apos;IA
                  </span>
                  <ChevronRight className="size-4" />
                </button>
              )}

              <div className="space-y-2">
                <Label>{t.lots.address}</Label>
                <Input placeholder="12 rue de la Paix" {...form.register('address')} />
                {form.formState.errors.address && (
                  <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t.lots.city}</Label>
                  <Input placeholder="Paris" {...form.register('city')} />
                </div>
                <div className="space-y-2">
                  <Label>{t.lots.postalCode}</Label>
                  <Input placeholder="75001" {...form.register('postal_code')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t.lots.type}</Label>
                  <select
                    {...form.register('type')}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {(['apartment','house','studio','parking','commercial','other'] as const).map(v => (
                      <option key={v} value={v}>{t.lots.types[v]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t.lots.area}</Label>
                  <Input type="number" step="0.01" placeholder="45" {...form.register('area_m2')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t.lots.rent} (€)</Label>
                  <Input type="number" step="0.01" placeholder="800" {...form.register('rent_amount')} />
                  {form.formState.errors.rent_amount && (
                    <p className="text-xs text-destructive">{form.formState.errors.rent_amount.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t.lots.charges} (€)</Label>
                  <Input type="number" step="0.01" placeholder="80" {...form.register('charges_amount')} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
                <Button type="submit" disabled={saving || uploadingDocs}>
                  {saving || uploadingDocs ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  {saving || uploadingDocs ? 'Création en cours…' : intakeFiles.length > 0 ? 'Créer et analyser' : t.common.create}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
