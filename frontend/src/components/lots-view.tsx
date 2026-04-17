'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Building2, Home, Car, Store, Sparkles, ChevronRight } from 'lucide-react';
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
  const supabase = createClient();

  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAI, setShowAI] = useState(false);

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

  const onSubmit = async (values: LotForm) => {
    if (!activeWorkspace) return;
    setSaving(true);
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

    if (data) setLots(prev => [data as Lot, ...prev]);
    setSaving(false);
    setOpen(false);
    setShowAI(false);
    form.reset();
  };

  const handleOpen = () => { setShowAI(false); form.reset(); setOpen(true); };

  return (
    <div className="space-y-6">
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
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
          <Building2 className="size-10 opacity-30" />
          <p className="text-sm">{t.lots.empty}</p>
          <Button variant="outline" size="sm" onClick={handleOpen}>
            <Plus className="size-4 mr-2" />{t.lots.add}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {t.lots.add}
              {!showAI && (
                <button
                  type="button"
                  onClick={() => setShowAI(true)}
                  className="flex items-center gap-1 text-xs font-normal text-violet-600 hover:text-violet-700 transition-colors"
                >
                  <Sparkles className="size-3" />
                  Remplir avec l&apos;IA
                </button>
              )}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {showAI && (
              <SmartFillPanel
                type="lot"
                onFill={handleAIFill}
                onClose={() => setShowAI(false)}
              />
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
              <Button type="submit" disabled={saving}>
                {saving ? t.common.loading : t.common.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
