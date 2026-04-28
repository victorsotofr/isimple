'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Upload, Eye, Pencil, Trash2, AlertCircle,
  CheckCircle2, Loader2, Home, User, Plus, Search, SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/contexts/workspace-context';
import { createClient } from '@/lib/supabase-browser';
import type { Document, Lot, Tenant } from '@/db';

type DocWithRefs = Document & {
  lot?: Lot | null;
  tenants: Tenant[];
  summary?: string | null;
};

const DOC_TYPE_LABELS: Record<string, string> = {
  bail: 'Bail',
  caution: 'Caution solidaire',
  quittance: 'Quittance',
  etat_des_lieux: 'État des lieux',
  assurance: 'Assurance',
  rib: 'RIB',
  caf: 'CAF',
  piece_identite: 'Pièce d’identité',
  mandat: 'Mandat',
  facture: 'Facture',
  autre: 'Autre',
};

export default function DocumentsPage() {
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();
  const supabase = createClient();

  const [docs, setDocs] = useState<DocWithRefs[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [previewDoc, setPreviewDoc] = useState<DocWithRefs | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    Promise.all([
      supabase.from('documents').select('*').eq('workspace_id', activeWorkspace.id).order('created_at', { ascending: false }),
      supabase.from('lots').select('*').eq('workspace_id', activeWorkspace.id),
      supabase.from('tenants').select('*').eq('workspace_id', activeWorkspace.id),
      supabase.from('document_tenants').select('document_id, tenant_id').eq('workspace_id', activeWorkspace.id),
    ]).then(([docsRes, lotsRes, tenantsRes, linksRes]) => {
      const lotsMap = new Map((lotsRes.data ?? []).map(l => [l.id, l as Lot]));
      const tenantsMap = new Map((tenantsRes.data ?? []).map(t => [t.id, t as Tenant]));
      const linksByDoc = new Map<string, string[]>();
      for (const row of (linksRes.data ?? [])) {
        const list = linksByDoc.get(row.document_id) ?? [];
        list.push(row.tenant_id);
        linksByDoc.set(row.document_id, list);
      }
      setDocs(((docsRes.data ?? []) as Document[]).map(d => {
        const linkedIds = linksByDoc.get(d.id) ?? (d.tenant_id ? [d.tenant_id] : []);
        const extracted = (d.extracted_data as { summary?: string } | null) ?? null;
        return {
          ...d,
          lot: d.lot_id ? (lotsMap.get(d.lot_id) ?? null) : null,
          tenants: linkedIds.map(id => tenantsMap.get(id)).filter((t): t is Tenant => !!t),
          summary: extracted?.summary ?? null,
        };
      }));
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter(d => {
      const haystack = [
        d.file_name,
        d.doc_type,
        d.lot?.address,
        d.lot?.city,
        d.tenants.map(t => `${t.first_name} ${t.last_name}`).join(' '),
        d.summary,
      ].filter(Boolean).join(' ').toLowerCase();
      return (!q || haystack.includes(q))
        && (statusFilter === 'all' || d.status === statusFilter)
        && (typeFilter === 'all' || d.doc_type === typeFilter);
    });
  }, [docs, query, statusFilter, typeFilter]);

  const pending = useMemo(() => filteredDocs.filter(d => d.status === 'pending'), [filteredDocs]);
  const confirmed = useMemo(() => filteredDocs.filter(d => d.status === 'confirmed'), [filteredDocs]);
  const allPendingCount = useMemo(() => docs.filter(d => d.status === 'pending').length, [docs]);
  const allConfirmedCount = useMemo(() => docs.filter(d => d.status === 'confirmed').length, [docs]);

  const handleView = async (doc: DocWithRefs) => {
    const res = await fetch(`/api/documents/${doc.id}/url`);
    if (res.ok) {
      const { url } = await res.json();
      setPreviewDoc(doc);
      setPreviewUrl(url);
    }
  };

  const handleDelete = async (doc: DocWithRefs) => {
    if (!confirm(`Supprimer « ${doc.file_name} » ? Cette action est irréversible.`)) return;
    setBusyId(doc.id);
    const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
    if (res.ok) setDocs(prev => prev.filter(d => d.id !== doc.id));
    setBusyId(null);
  };

  const handleQuickConfirm = async (doc: DocWithRefs) => {
    setBusyId(doc.id);
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'confirmed',
        doc_type: doc.doc_type,
        lot_id: doc.lot_id,
        tenant_ids: doc.tenants.map(t => t.id),
      }),
    });
    if (res.ok) {
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'confirmed' } : d));
    }
    setBusyId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Documents</h1>
          {pending.length > 0 && (
            <p className="text-sm text-amber-700 mt-0.5">
              {pending.length} document{pending.length > 1 ? 's' : ''} à réviser
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => router.push('/documents/upload')}>
          <Upload className="size-4 mr-2" />
          Importer
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`rounded-xl border p-4 text-left transition-colors ${statusFilter === 'all' ? 'border-foreground bg-foreground text-background' : 'bg-card hover:border-foreground/30'}`}
        >
          <p className="text-xs opacity-70">Tous les documents</p>
          <p className="mt-1 text-2xl font-semibold">{docs.length}</p>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`rounded-xl border p-4 text-left transition-colors ${statusFilter === 'pending' ? 'border-amber-500 bg-amber-50' : 'bg-card hover:border-foreground/30'}`}
        >
          <p className="text-xs text-amber-700">À réviser</p>
          <p className="mt-1 text-2xl font-semibold">{allPendingCount}</p>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('confirmed')}
          className={`rounded-xl border p-4 text-left transition-colors ${statusFilter === 'confirmed' ? 'border-emerald-500 bg-emerald-50' : 'bg-card hover:border-foreground/30'}`}
        >
          <p className="text-xs text-emerald-700">Confirmés</p>
          <p className="mt-1 text-2xl font-semibold">{allConfirmedCount}</p>
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un fichier, un bien, un locataire..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Tous les types</option>
            {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
          <FileText className="size-10 opacity-30" />
          <p className="text-sm">Aucun document pour l&apos;instant.</p>
          <Button variant="outline" size="sm" onClick={() => router.push('/documents/upload')}>
            <Upload className="size-4 mr-2" />Importer un document
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
          <div className="space-y-6">
          {pending.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertCircle className="size-4 text-amber-600" />
                  <span>À réviser</span>
                  <span className="text-muted-foreground font-normal">· {pending.length}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => router.push(`/documents/upload?review=${pending[0].id}`)}>
                  Ouvrir la revue
                </Button>
              </div>

              <div className="space-y-2">
                {pending.map(doc => (
                  <PendingCard
                    key={doc.id}
                    doc={doc}
                    busy={busyId === doc.id}
                    onConfirm={() => handleQuickConfirm(doc)}
                    onEdit={() => router.push(`/documents/upload?review=${doc.id}`)}
                    onDelete={() => handleDelete(doc)}
                    onView={() => handleView(doc)}
                  />
                ))}

                <button
                  onClick={() => router.push('/documents/upload')}
                  className="flex items-center gap-2 text-xs text-violet-600 hover:text-violet-700 transition-colors px-2 py-1"
                >
                  <Plus className="size-3.5" />
                  Importer d&apos;autres documents
                </button>
              </div>
            </section>
          )}

          {confirmed.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Coffre-fort · {confirmed.length}
              </h2>
              <div className="rounded-lg border divide-y">
                {confirmed.map(doc => (
                  <div key={doc.id} className="flex items-center gap-4 p-4">
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        {doc.lot && ` · ${doc.lot.address}, ${doc.lot.city}`}
                        {doc.tenants.length > 0 && ` · ${doc.tenants.map(t => `${t.first_name} ${t.last_name}`).join(', ')}`}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                    </Badge>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => handleView(doc)} aria-label="Voir">
                        <Eye className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => router.push(`/documents/upload?review=${doc.id}`)} aria-label="Modifier">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(doc)}
                        aria-label="Supprimer"
                        disabled={busyId === doc.id}
                      >
                        {busyId === doc.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {filteredDocs.length === 0 && (
            <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
              Aucun document ne correspond aux filtres.
            </div>
          )}
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-6 overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {previewDoc ? previewDoc.file_name : 'Aperçu du document'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {previewDoc ? (DOC_TYPE_LABELS[previewDoc.doc_type] ?? previewDoc.doc_type) : 'Sélectionnez un document dans la liste'}
                  </p>
                </div>
                {previewDoc && (
                  <Button size="sm" variant="outline" onClick={() => router.push(`/documents/upload?review=${previewDoc.id}`)}>
                    Réviser
                  </Button>
                )}
              </div>
              <div className="h-[640px] bg-muted/30">
                {previewUrl ? (
                  <iframe src={previewUrl} className="h-full w-full" title="Aperçu du document" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Aucun PDF à afficher.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function PendingCard({
  doc, busy, onConfirm, onEdit, onDelete, onView,
}: {
  doc: DocWithRefs;
  busy: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const hasAssociations = !!doc.lot || doc.tenants.length > 0;
  const canQuickConfirm = hasAssociations;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 hover:border-foreground/20 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 shrink-0">
          <FileText className="size-4" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onView}
              className="text-sm font-medium truncate hover:underline text-left"
              title="Ouvrir le PDF"
            >
              {doc.file_name}
            </button>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
            </Badge>
          </div>
          {doc.summary && (
            <p className="text-xs text-muted-foreground line-clamp-2">{doc.summary}</p>
          )}
        </div>
        <button
          onClick={onDelete}
          disabled={busy}
          className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 p-1 -m-1"
          aria-label="Supprimer"
          title="Supprimer"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {hasAssociations && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pl-12">
          {doc.lot && (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Home className="size-3" />
              <span className="truncate max-w-[300px]">{doc.lot.address}, {doc.lot.city}</span>
            </span>
          )}
          {doc.tenants.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <User className="size-3" />
              <span className="truncate max-w-[300px]">
                {doc.tenants.map(t => `${t.first_name} ${t.last_name}`).join(', ')}
              </span>
            </span>
          )}
        </div>
      )}

      {!hasAssociations && (
        <p className="text-xs text-amber-600 pl-12">
          Aucune association détectée — ouvrez pour réviser
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pl-12">
        <Button size="sm" variant="outline" onClick={onEdit} disabled={busy}>
          <Pencil className="size-3 mr-1.5" />
          Modifier
        </Button>
        <Button size="sm" onClick={onConfirm} disabled={busy || !canQuickConfirm}>
          {busy ? <Loader2 className="size-3 mr-1.5 animate-spin" /> : <CheckCircle2 className="size-3 mr-1.5" />}
          Confirmer
        </Button>
      </div>
    </div>
  );
}
