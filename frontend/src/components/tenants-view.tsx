'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Users, Sparkles, Pencil, Trash2, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { SmartFillPanel } from '@/components/smart-fill-panel';
import { useWorkspace } from '@/contexts/workspace-context';
import { useLanguage } from '@/contexts/language-context';
import { createClient } from '@/lib/supabase-browser';
import type { Tenant, Lot } from '@/db';

const tenantSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  with_lease: z.boolean().default(false),
  lot_id: z.string().optional(),
  start_date: z.string().optional(),
  rent_amount: z.coerce.number().positive().optional(),
  charges_amount: z.coerce.number().min(0).default(0).optional(),
  deposit_amount: z.coerce.number().min(0).default(0).optional(),
});
type TenantForm = z.infer<typeof tenantSchema>;
type TenantWithLot = Tenant & {
  lot?: Lot | null;
  /** Informative label when the link comes from a document rather than a lease. */
  lotFromDocument?: boolean;
  documentCount?: number;
};

export function TenantsView() {
  const { t } = useLanguage();
  const { activeWorkspace } = useWorkspace();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const editParam = searchParams.get('edit');

  const [tenants, setTenants] = useState<TenantWithLot[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState<Tenant | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const form = useForm<TenantForm>({
    resolver: zodResolver(tenantSchema),
    defaultValues: { with_lease: false, charges_amount: 0, deposit_amount: 0 },
  });
  const withLease = form.watch('with_lease');
  const selectedLotId = form.watch('lot_id');

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    (async () => {
      const [tenantsRes, lotsRes, leasesRes, docLinksRes] = await Promise.all([
        supabase.from('tenants').select('*').eq('workspace_id', activeWorkspace.id).order('created_at', { ascending: false }),
        supabase.from('lots').select('*').eq('workspace_id', activeWorkspace.id),
        supabase.from('leases').select('tenant_id, lot_id, lots(*)').eq('workspace_id', activeWorkspace.id).eq('status', 'active'),
        supabase.from('document_tenants').select('tenant_id, document:documents(id, status, doc_type, lot_id, created_at)').eq('workspace_id', activeWorkspace.id),
      ]);
      const lots = (lotsRes.data ?? []) as Lot[];
      const lotsById = new Map(lots.map(l => [l.id, l]));

      const leaseLotByTenant = new Map<string, Lot | null>();
      for (const l of (leasesRes.data ?? [])) {
        const lot = Array.isArray(l.lots) ? (l.lots[0] as Lot ?? null) : (l.lots as Lot | null);
        leaseLotByTenant.set(l.tenant_id as string, lot);
      }

      const docInfoByTenant = new Map<string, { lot: Lot | null; count: number }>();
      for (const row of (docLinksRes.data ?? [])) {
        const doc = Array.isArray(row.document) ? row.document[0] : row.document;
        if (!doc || doc.status !== 'confirmed') continue;
        const tid = row.tenant_id as string;
        const info = docInfoByTenant.get(tid) ?? { lot: null as Lot | null, count: 0 };
        info.count += 1;
        if (!info.lot && doc.lot_id) info.lot = lotsById.get(doc.lot_id) ?? null;
        docInfoByTenant.set(tid, info);
      }

      setTenants(((tenantsRes.data ?? []) as Tenant[]).map(tenant => {
        const leaseLot = leaseLotByTenant.get(tenant.id) ?? null;
        const docInfo = docInfoByTenant.get(tenant.id);
        if (leaseLot) {
          return { ...tenant, lot: leaseLot, lotFromDocument: false, documentCount: docInfo?.count ?? 0 };
        }
        if (docInfo?.lot) {
          return { ...tenant, lot: docInfo.lot, lotFromDocument: true, documentCount: docInfo.count };
        }
        return { ...tenant, lot: null, documentCount: docInfo?.count ?? 0 };
      }));
      setLots(lots);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  useEffect(() => {
    if (!selectedLotId) return;
    const lot = lots.find(l => l.id === selectedLotId);
    if (lot) {
      form.setValue('rent_amount', lot.rent_amount);
      form.setValue('charges_amount', lot.charges_amount);
      form.setValue('deposit_amount', lot.rent_amount);
    }
  }, [selectedLotId, lots, form]);

  const openEdit = (tenant: Tenant) => {
    setEditing(tenant);
    setShowAI(false);
    form.reset({
      first_name: tenant.first_name,
      last_name: tenant.last_name,
      email: tenant.email,
      phone: tenant.phone ?? '',
      with_lease: false,
      charges_amount: 0,
      deposit_amount: 0,
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!editParam || tenants.length === 0) return;
    const target = tenants.find(tt => tt.id === editParam);
    if (target) openEdit(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, tenants.length]);

  const handleAIFill = (data: Record<string, unknown>) => {
    if (data.first_name) form.setValue('first_name', data.first_name as string);
    if (data.last_name) form.setValue('last_name', data.last_name as string);
    if (data.email) form.setValue('email', data.email as string);
    if (data.phone) form.setValue('phone', data.phone as string);
    setShowAI(false);
  };

  const onSubmit = async (values: TenantForm) => {
    if (!activeWorkspace) return;
    setSaving(true);

    if (editing) {
      const { data: updated } = await supabase
        .from('tenants')
        .update({
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          phone: values.phone || null,
        })
        .eq('id', editing.id)
        .select()
        .single();
      if (updated) {
        setTenants(prev => prev.map(x => x.id === editing.id ? { ...x, ...(updated as Tenant) } : x));
      }
      setSaving(false);
      setOpen(false);
      setEditing(null);
      setShowAI(false);
      form.reset();
      return;
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .insert({
        workspace_id: activeWorkspace.id,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        phone: values.phone || null,
      })
      .select()
      .single();

    if (tenant && values.with_lease && values.lot_id && values.start_date) {
      await supabase.from('leases').insert({
        workspace_id: activeWorkspace.id,
        lot_id: values.lot_id,
        tenant_id: tenant.id,
        start_date: values.start_date,
        rent_amount: values.rent_amount ?? 0,
        charges_amount: values.charges_amount ?? 0,
        deposit_amount: values.deposit_amount ?? 0,
      });
    }

    if (tenant) {
      const lot = values.lot_id ? lots.find(l => l.id === values.lot_id) ?? null : null;
      setTenants(prev => [{ ...(tenant as Tenant), lot }, ...prev]);
    }
    setSaving(false);
    setOpen(false);
    setShowAI(false);
    form.reset();
  };

  const handleOpen = () => {
    setEditing(null);
    setShowAI(false);
    form.reset({ with_lease: false, charges_amount: 0, deposit_amount: 0 });
    setOpen(true);
  };

  const handleDialogChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setShowAI(false);
      setEditing(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    const { error } = await supabase.from('tenants').delete().eq('id', deleting.id);
    if (!error) setTenants(prev => prev.filter(x => x.id !== deleting.id));
    setDeletingBusy(false);
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t.tenants.title}</h1>
        <Button size="sm" onClick={handleOpen}>
          <Plus className="size-4 mr-2" />
          {t.tenants.add}
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">{t.common.loading}</div>
      ) : tenants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
          <Users className="size-10 opacity-30" />
          <p className="text-sm">{t.tenants.empty}</p>
          <Button variant="outline" size="sm" onClick={handleOpen}>
            <Plus className="size-4 mr-2" />{t.tenants.add}
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {tenants.map((tenant) => {
            const placeholder = tenant.email.endsWith('@placeholder.local');
            return (
              <div
                key={tenant.id}
                role="button"
                tabIndex={0}
                onClick={() => openEdit(tenant)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(tenant); } }}
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-accent/40 transition-colors"
              >
                <div className="flex size-9 items-center justify-center rounded-full bg-muted shrink-0 text-sm font-medium">
                  {tenant.first_name[0]}{tenant.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{tenant.first_name} {tenant.last_name}</p>
                  <p className={`text-xs truncate ${placeholder ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {placeholder ? 'Email manquant — cliquer pour compléter' : tenant.email}
                  </p>
                </div>
                {tenant.documentCount != null && tenant.documentCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <FileText className="size-3" />
                    {tenant.documentCount}
                  </span>
                )}
                {tenant.phone && (
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{tenant.phone}</span>
                )}
                {tenant.lot ? (
                  <span
                    className={`text-xs truncate max-w-40 shrink-0 ${tenant.lotFromDocument ? 'text-violet-600' : 'text-muted-foreground'}`}
                    title={tenant.lotFromDocument ? 'Via un document — pas de bail enregistré' : 'Bail actif'}
                  >
                    {tenant.lot.address}, {tenant.lot.city}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground shrink-0">Sans bail</span>
                )}
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => openEdit(tenant)}
                    aria-label="Modifier"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleting(tenant)}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {editing ? `Modifier ${editing.first_name} ${editing.last_name}` : t.tenants.add}
              {!showAI && !editing && (
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
                type="tenant"
                onFill={handleAIFill}
                onClose={() => setShowAI(false)}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.tenants.firstName}</Label>
                <Input placeholder="Jean" {...form.register('first_name')} />
              </div>
              <div className="space-y-2">
                <Label>{t.tenants.lastName}</Label>
                <Input placeholder="Dupont" {...form.register('last_name')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.tenants.email}</Label>
              <Input type="email" placeholder="jean.dupont@email.com" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t.tenants.phone}</Label>
              <Input placeholder="06 12 34 56 78" {...form.register('phone')} />
            </div>

            {!editing && (
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="with_lease"
                  checked={withLease}
                  onCheckedChange={(v: boolean | 'indeterminate') => form.setValue('with_lease', v === true)}
                />
                <Label htmlFor="with_lease" className="cursor-pointer">{t.tenants.withLease}</Label>
              </div>
            )}

            {!editing && withLease && (
              <div className="space-y-3 pt-1 pl-6 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label>{t.tenants.property}</Label>
                  <select
                    {...form.register('lot_id')}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">{t.tenants.selectLot}</option>
                    {lots.map(l => (
                      <option key={l.id} value={l.id}>{l.address}, {l.city}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t.tenants.startDate}</Label>
                  <Input type="date" {...form.register('start_date')} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>{t.tenants.rentAmount}</Label>
                    <Input type="number" step="0.01" {...form.register('rent_amount')} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.tenants.chargesAmount}</Label>
                    <Input type="number" step="0.01" {...form.register('charges_amount')} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.tenants.depositAmount}</Label>
                    <Input type="number" step="0.01" {...form.register('deposit_amount')} />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>{t.common.cancel}</Button>
              <Button type="submit" disabled={saving}>
                {saving ? t.common.loading : (editing ? t.common.save : t.common.create)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={v => { if (!v) setDeleting(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer le locataire</DialogTitle>
            <DialogDescription>
              {deleting && `« ${deleting.first_name} ${deleting.last_name} » sera supprimé. Les baux et documents associés seront conservés mais dissociés.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deletingBusy}>
              {t.common.cancel}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deletingBusy}>
              {deletingBusy ? t.common.loading : t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
