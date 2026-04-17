'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2, Home, Car, Store, ChevronRight, MoreHorizontal, Pencil, Trash2,
  FileText, Plus, Ticket, Wrench, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useWorkspace } from '@/contexts/workspace-context';
import { useLanguage } from '@/contexts/language-context';
import { createClient } from '@/lib/supabase-browser';
import { cn } from '@/lib/utils';
import type { Lot, Tenant, Lease, Document } from '@/db';

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

type TabId = 'info' | 'tenants' | 'documents' | 'tickets' | 'prestataires';
type LeaseWithTenant = Lease & { tenant: Tenant | null };
type DocTenantRow = { tenant: Tenant | null; document: Document };

type Occupant =
  | {
      tenant: Tenant;
      source: 'lease';
      startDate: string;
      endDate: string | null;
      rentAmount: number;
      status: Lease['status'];
    }
  | {
      tenant: Tenant;
      source: 'document';
      documentId: string;
      documentName: string;
      documentType: Document['doc_type'];
      createdAt: string;
    };

export function LotDetailView({ id }: { id: string }) {
  const { t } = useLanguage();
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();
  const supabase = createClient();

  const [lot, setLot] = useState<Lot | null>(null);
  const [leases, setLeases] = useState<LeaseWithTenant[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docTenants, setDocTenants] = useState<DocTenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('info');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<LotForm>({ resolver: zodResolver(lotSchema) });

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    (async () => {
      const [lotRes, leasesRes, docsRes] = await Promise.all([
        supabase.from('lots').select('*').eq('id', id).eq('workspace_id', activeWorkspace.id).maybeSingle(),
        supabase.from('leases').select('*, tenant:tenants(*)').eq('lot_id', id).eq('workspace_id', activeWorkspace.id).order('start_date', { ascending: false }),
        supabase.from('documents').select('*').eq('lot_id', id).eq('workspace_id', activeWorkspace.id).order('created_at', { ascending: false }),
      ]);
      const docs = (docsRes.data ?? []) as Document[];
      setLot((lotRes.data ?? null) as Lot | null);
      setLeases((leasesRes.data ?? []) as LeaseWithTenant[]);
      setDocuments(docs);

      const confirmedDocs = docs.filter(d => d.status === 'confirmed');
      if (confirmedDocs.length > 0) {
        const { data: links } = await supabase
          .from('document_tenants')
          .select('document_id, tenant:tenants(*)')
          .in('document_id', confirmedDocs.map(d => d.id));
        const docsById = new Map(confirmedDocs.map(d => [d.id, d]));
        setDocTenants(
          (links ?? []).map(row => {
            const tenant = (Array.isArray(row.tenant) ? row.tenant[0] : row.tenant) as Tenant | null;
            return { tenant, document: docsById.get(row.document_id as string)! };
          }).filter(r => r.document)
        );
      } else {
        setDocTenants([]);
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id, id]);

  const openEdit = () => {
    if (!lot) return;
    form.reset({
      address: lot.address,
      city: lot.city,
      postal_code: lot.postal_code,
      type: lot.type,
      area_m2: lot.area_m2 ?? '',
      rent_amount: lot.rent_amount,
      charges_amount: lot.charges_amount,
    });
    setEditOpen(true);
  };

  const onSubmit = async (values: LotForm) => {
    if (!lot) return;
    setSaving(true);
    const { data } = await supabase
      .from('lots')
      .update({
        address: values.address,
        city: values.city,
        postal_code: values.postal_code,
        type: values.type,
        area_m2: values.area_m2 || null,
        rent_amount: values.rent_amount,
        charges_amount: values.charges_amount ?? 0,
      })
      .eq('id', lot.id)
      .select()
      .single();
    if (data) setLot(data as Lot);
    setSaving(false);
    setEditOpen(false);
  };

  const onDelete = async () => {
    if (!lot) return;
    setDeleting(true);
    await supabase.from('lots').delete().eq('id', lot.id);
    router.push('/lots');
  };

  const activeLease = useMemo(() => leases.find(l => l.status === 'active'), [leases]);

  const occupants = useMemo<Occupant[]>(() => {
    const byId = new Map<string, Occupant>();
    for (const lease of leases) {
      if (!lease.tenant) continue;
      byId.set(lease.tenant.id, {
        tenant: lease.tenant,
        source: 'lease',
        startDate: lease.start_date,
        endDate: lease.end_date,
        rentAmount: lease.rent_amount,
        status: lease.status,
      });
    }
    for (const row of docTenants) {
      if (!row.tenant || byId.has(row.tenant.id)) continue;
      const d = row.document;
      byId.set(row.tenant.id, {
        tenant: row.tenant,
        source: 'document',
        documentId: d.id,
        documentName: d.file_name,
        documentType: d.doc_type,
        createdAt: d.created_at,
      });
    }
    return Array.from(byId.values());
  }, [leases, docTenants]);

  const isOccupied = !!activeLease || docTenants.some(r => r.document.doc_type === 'bail' && r.tenant);

  if (loading) {
    return <div className="text-sm text-muted-foreground">{t.common.loading}</div>;
  }

  if (!lot) {
    return (
      <div className="space-y-4">
        <Breadcrumb t={t} />
        <p className="text-sm text-muted-foreground">{t.lots.detail.notFound}</p>
      </div>
    );
  }

  const Icon = TYPE_ICONS[lot.type];

  return (
    <div className="space-y-6">
      <Breadcrumb t={t} current={lot.address} />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted shrink-0">
            <Icon className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold truncate">{lot.address}</h1>
            <p className="text-sm text-muted-foreground">{lot.postal_code} {lot.city}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={openEdit}>
              <Pencil className="size-4 mr-2" />
              {t.common.edit}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4 mr-2" />
              {t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label={t.lots.type} value={t.lots.types[lot.type]} />
        <Kpi label={t.lots.area} value={lot.area_m2 ? `${lot.area_m2} m²` : '—'} />
        <Kpi label={t.lots.rent} value={`${lot.rent_amount} €`} />
        <Kpi
          label={t.lots.status.rented}
          value={isOccupied ? t.lots.status.rented : t.lots.status.vacant}
          tone={isOccupied ? 'success' : 'muted'}
        />
      </div>

      <div className="border-b">
        <div className="flex gap-1">
          <TabButton active={tab === 'info'} onClick={() => setTab('info')}>
            {t.lots.detail.tabs.info}
          </TabButton>
          <TabButton active={tab === 'tenants'} onClick={() => setTab('tenants')} count={occupants.length}>
            {t.lots.detail.tabs.tenants}
          </TabButton>
          <TabButton active={tab === 'documents'} onClick={() => setTab('documents')} count={documents.length}>
            {t.lots.detail.tabs.documents}
          </TabButton>
          <TabButton active={tab === 'tickets'} onClick={() => setTab('tickets')} count={0}>
            {t.lots.detail.tabs.tickets}
          </TabButton>
          <TabButton active={tab === 'prestataires'} onClick={() => setTab('prestataires')} count={0}>
            {t.lots.detail.tabs.prestataires}
          </TabButton>
        </div>
      </div>

      {tab === 'info' && <InfoTab lot={lot} t={t} />}
      {tab === 'tenants' && <TenantsTab occupants={occupants} t={t} />}
      {tab === 'documents' && (
        <DocumentsTab
          documents={documents}
          lotId={lot.id}
          t={t}
          onDeleted={id => setDocuments(prev => prev.filter(d => d.id !== id))}
        />
      )}
      {tab === 'tickets' && <EmptyTab icon={Ticket} message={t.lots.detail.ticketsSoon} />}
      {tab === 'prestataires' && <EmptyTab icon={Wrench} message={t.lots.detail.prestatairesSoon} />}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.common.edit}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>{t.lots.address}</Label>
              <Input {...form.register('address')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.lots.city}</Label>
                <Input {...form.register('city')} />
              </div>
              <div className="space-y-2">
                <Label>{t.lots.postalCode}</Label>
                <Input {...form.register('postal_code')} />
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
                <Input type="number" step="0.01" {...form.register('area_m2')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.lots.rent} (€)</Label>
                <Input type="number" step="0.01" {...form.register('rent_amount')} />
              </div>
              <div className="space-y-2">
                <Label>{t.lots.charges} (€)</Label>
                <Input type="number" step="0.01" {...form.register('charges_amount')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t.common.loading : t.common.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.lots.detail.deleteTitle}</DialogTitle>
            <DialogDescription>{t.lots.detail.deleteDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={deleting}>
              {deleting ? t.common.loading : t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Breadcrumb({ t, current }: { t: ReturnType<typeof useLanguage>['t']; current?: string }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link href="/lots" className="hover:text-foreground transition-colors">
        {t.nav.lots}
      </Link>
      {current && (
        <>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground truncate">{current}</span>
        </>
      )}
    </nav>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'muted' }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        'text-sm font-medium mt-1',
        tone === 'success' && 'text-emerald-600',
        tone === 'muted' && 'text-muted-foreground',
      )}>
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active, onClick, count, children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative px-3 py-2 text-sm font-medium transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <span className="flex items-center gap-1.5">
        {children}
        {count != null && count > 0 && (
          <span className="text-xs text-muted-foreground">({count})</span>
        )}
      </span>
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />
      )}
    </button>
  );
}

function InfoTab({ lot, t }: { lot: Lot; t: ReturnType<typeof useLanguage>['t'] }) {
  const rows: [string, React.ReactNode][] = [
    [t.lots.address, lot.address],
    [t.lots.city, `${lot.postal_code} ${lot.city}`],
    [t.lots.type, <Badge key="type" variant="secondary">{t.lots.types[lot.type]}</Badge>],
    [t.lots.area, lot.area_m2 ? `${lot.area_m2} m²` : '—'],
    [t.lots.rent, `${lot.rent_amount} €`],
    [t.lots.charges, `${lot.charges_amount} €`],
  ];
  return (
    <div className="rounded-lg border divide-y">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-sm">{value}</span>
        </div>
      ))}
    </div>
  );
}

function TenantsTab({ occupants, t }: { occupants: Occupant[]; t: ReturnType<typeof useLanguage>['t'] }) {
  if (occupants.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{t.lots.detail.noTenants}</p>;
  }
  return (
    <div className="rounded-lg border divide-y">
      {occupants.map(occ => (
        <Link
          key={occ.tenant.id}
          href={`/tenants?edit=${occ.tenant.id}`}
          className="flex items-center gap-4 p-4 hover:bg-accent/40 transition-colors"
        >
          <div className="flex size-9 items-center justify-center rounded-full bg-muted shrink-0 text-xs font-medium">
            {occ.tenant.first_name[0]}{occ.tenant.last_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {occ.tenant.first_name} {occ.tenant.last_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {occ.source === 'lease' ? (
                <>
                  {new Date(occ.startDate).toLocaleDateString()}
                  {occ.endDate && ` → ${new Date(occ.endDate).toLocaleDateString()}`}
                </>
              ) : (
                <>Via {t.documents.types[occ.documentType] ?? occ.documentType} · {new Date(occ.createdAt).toLocaleDateString()}</>
              )}
            </p>
          </div>
          {occ.source === 'lease' ? (
            <>
              <Badge variant={occ.status === 'active' ? 'default' : 'secondary'} className="shrink-0 text-xs">
                {t.lots.detail.leaseStatus[occ.status]}
              </Badge>
              <span className="text-sm font-medium shrink-0">{occ.rentAmount} €</span>
            </>
          ) : (
            <Badge variant="secondary" className="shrink-0 text-xs">Document</Badge>
          )}
        </Link>
      ))}
    </div>
  );
}

function DocumentsTab({
  documents, lotId, t, onDeleted,
}: {
  documents: Document[];
  lotId: string;
  t: ReturnType<typeof useLanguage>['t'];
  onDeleted: (id: string) => void;
}) {
  const router = useRouter();
  const uploadHref = `/documents/upload?lot_id=${lotId}`;

  const handleView = async (doc: Document) => {
    const res = await fetch(`/api/documents/${doc.id}/url`);
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, '_blank');
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Supprimer « ${doc.file_name} » ?`)) return;
    const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
    if (res.ok) onDeleted(doc.id);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link href={uploadHref}>
            <Plus className="size-4 mr-2" />
            {t.documents.upload}
          </Link>
        </Button>
      </div>
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{t.lots.detail.noDocuments}</p>
      ) : (
        <div className="rounded-lg border divide-y">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0">
                <FileText className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{doc.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.documents.types[doc.doc_type]} · {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={doc.status === 'confirmed' ? 'default' : 'secondary'} className="shrink-0 text-xs">
                {doc.status === 'confirmed' ? t.documents.confirmed : t.documents.pending}
              </Badge>
              {doc.status === 'pending' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/documents/upload?review=${doc.id}`)}
                >
                  Réviser
                </Button>
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="size-8" onClick={() => handleView(doc)} aria-label="Voir">
                    <Eye className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => router.push(`/documents/upload?review=${doc.id}`)}
                    aria-label="Modifier"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(doc)}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyTab({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
      <Icon className="size-10 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
