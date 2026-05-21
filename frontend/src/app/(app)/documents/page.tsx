'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  Home,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/contexts/workspace-context';
import { createClient } from '@/lib/supabase-browser';
import type {
  Document,
  DocumentExternalFile,
  DocumentProcessingJob,
  Lot,
  Tenant,
} from '@/db';

type DocWithRefs = Document & {
  lot?: Lot | null;
  tenants: Tenant[];
  summary?: string | null;
  indexInfo?: DocumentIndexInfo | null;
};

const DOC_TYPE_LABELS: Record<string, string> = {
  bail: 'Bail',
  caution: 'Caution',
  quittance: 'Quittance',
  etat_des_lieux: 'État des lieux',
  assurance: 'Assurance',
  rib: 'RIB',
  caf: 'CAF',
  piece_identite: 'Identité',
  mandat: 'Mandat',
  facture: 'Facture',
  autre: 'Autre',
};

type Mode = 'review' | 'vault';

type EditorState = {
  doc_type: string;
  lot_id: string;
  tenant_ids: string[];
  add_tenant_id: string;
};

type DocumentSearchResult = {
  chunk_id?: string;
  document_id: string;
  file_name: string;
  doc_type: string;
  status?: string;
  content: string;
  score: number;
  source: string;
  page_number: number | null;
  lot_id: string | null;
  tenant_id: string | null;
  metadata?: Record<string, unknown> | null;
};

type DocumentIndexInfo = {
  external_status?: DocumentExternalFile['status'];
  external_error?: string | null;
  external_updated_at?: string | null;
  job_status?: DocumentProcessingJob['status'];
  job_error?: string | null;
  job_finished_at?: string | null;
  job_created_at?: string | null;
};

type DocumentIndexState = {
  kind: 'review' | 'indexed' | 'indexing' | 'failed' | 'unindexed';
  label: string;
  description: string;
  badgeClassName: string;
  iconClassName: string;
  retryable: boolean;
};

export default function DocumentsPage() {
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();
  const supabase = createClient();

  const [docs, setDocs] = useState<DocWithRefs[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('review');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [requestedDocId, setRequestedDocId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [contentQuery, setContentQuery] = useState('');
  const [contentSearching, setContentSearching] = useState(false);
  const [contentSearchError, setContentSearchError] = useState('');
  const [contentResults, setContentResults] = useState<DocumentSearchResult[]>([]);
  const [contentSearched, setContentSearched] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [actionDocId, setActionDocId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'review' || tab === 'vault') setMode(tab);
    setRequestedDocId(params.get('doc'));
  }, []);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    Promise.all([
      supabase.from('documents').select('*').eq('workspace_id', activeWorkspace.id).order('created_at', { ascending: false }),
      supabase.from('lots').select('*').eq('workspace_id', activeWorkspace.id).order('created_at', { ascending: false }),
      supabase.from('tenants').select('*').eq('workspace_id', activeWorkspace.id).order('created_at', { ascending: false }),
      supabase.from('document_tenants').select('document_id, tenant_id').eq('workspace_id', activeWorkspace.id),
      supabase.from('document_external_files').select('document_id, status, error, updated_at').eq('workspace_id', activeWorkspace.id),
      supabase
        .from('document_processing_jobs')
        .select('document_id, status, error, finished_at, created_at')
        .eq('workspace_id', activeWorkspace.id)
        .eq('stage', 'indexed')
        .order('created_at', { ascending: false }),
    ]).then(([docsRes, lotsRes, tenantsRes, linksRes, externalFilesRes, indexJobsRes]) => {
      const lotRows = (lotsRes.data ?? []) as Lot[];
      const tenantRows = (tenantsRes.data ?? []) as Tenant[];
      const lotsMap = new Map(lotRows.map(l => [l.id, l]));
      const tenantsMap = new Map(tenantRows.map(t => [t.id, t]));
      const indexInfoByDoc = buildIndexInfoByDoc(
        (externalFilesRes.data ?? []) as Pick<DocumentExternalFile, 'document_id' | 'status' | 'error' | 'updated_at'>[],
        (indexJobsRes.data ?? []) as Pick<DocumentProcessingJob, 'document_id' | 'status' | 'error' | 'finished_at' | 'created_at'>[],
      );
      const linksByDoc = new Map<string, string[]>();
      for (const row of (linksRes.data ?? [])) {
        const list = linksByDoc.get(row.document_id) ?? [];
        list.push(row.tenant_id);
        linksByDoc.set(row.document_id, list);
      }

      const hydrated = ((docsRes.data ?? []) as Document[]).map(d => {
        const linkedIds = linksByDoc.get(d.id) ?? (d.tenant_id ? [d.tenant_id] : []);
        const extracted = (d.extracted_data as { summary?: string } | null) ?? null;
        return {
          ...d,
          lot: d.lot_id ? (lotsMap.get(d.lot_id) ?? null) : null,
          tenants: linkedIds.map(id => tenantsMap.get(id)).filter((t): t is Tenant => !!t),
          summary: extracted?.summary ?? null,
          indexInfo: indexInfoByDoc.get(d.id) ?? null,
        };
      });

      setLots(lotRows);
      setTenants(tenantRows);
      setDocs(hydrated);
      setSelectedId(current => current ?? null);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  const counts = useMemo(() => ({
    review: docs.filter(d => d.status === 'pending').length,
    vault: docs.filter(d => d.status === 'confirmed').length,
    all: docs.length,
  }), [docs]);

  const visibleDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter(d => {
      const inMode = mode === 'review' ? d.status === 'pending' : d.status === 'confirmed';
      const matchesType = typeFilter === 'all' || d.doc_type === typeFilter;
      const haystack = [
        d.file_name,
        d.doc_type,
        d.summary,
        d.lot?.address,
        d.lot?.city,
        d.tenants.map(t => `${t.first_name} ${t.last_name}`).join(' '),
      ].filter(Boolean).join(' ').toLowerCase();
      return inMode && matchesType && (!q || haystack.includes(q));
    });
  }, [docs, mode, query, typeFilter]);

  const selectedDoc = useMemo(
    () => visibleDocs.find(d => d.id === selectedId) ?? visibleDocs[0] ?? null,
    [selectedId, visibleDocs]
  );

  useEffect(() => {
    if (visibleDocs.length === 0) {
      if (selectedId) setSelectedId(null);
      return;
    }

    if (requestedDocId && visibleDocs.some(d => d.id === requestedDocId)) {
      setSelectedId(requestedDocId);
      setRequestedDocId(null);
      return;
    }

    if (!selectedId || !visibleDocs.some(d => d.id === selectedId)) {
      setSelectedId(visibleDocs[0].id);
    }
  }, [requestedDocId, selectedId, visibleDocs]);

  useEffect(() => {
    if (!selectedDoc) {
      setPreviewUrl('');
      setEditor(null);
      return;
    }
    if (actionDocId !== selectedDoc.id) {
      setActionError('');
      setActionNotice('');
      setActionDocId(null);
    }
    setEditor({
      doc_type: selectedDoc.doc_type,
      lot_id: selectedDoc.lot_id ?? '',
      tenant_ids: selectedDoc.tenants.map(t => t.id),
      add_tenant_id: '',
    });
    let active = true;
    setPreviewUrl('');
    fetch(`/api/documents/${selectedDoc.id}/url`)
      .then(res => res.ok ? res.json() : { url: '' })
      .then(({ url }) => { if (active) setPreviewUrl(url ?? ''); })
      .catch(() => { if (active) setPreviewUrl(''); });
    return () => { active = false; };
  }, [actionDocId, selectedDoc]);

  const loadDocumentIndexInfo = async (documentId: string): Promise<DocumentIndexInfo | null> => {
    if (!activeWorkspace) return null;
    const [externalFilesRes, indexJobsRes] = await Promise.all([
      supabase
        .from('document_external_files')
        .select('document_id, status, error, updated_at')
        .eq('workspace_id', activeWorkspace.id)
        .eq('document_id', documentId)
        .order('updated_at', { ascending: false })
        .limit(1),
      supabase
        .from('document_processing_jobs')
        .select('document_id, status, error, finished_at, created_at')
        .eq('workspace_id', activeWorkspace.id)
        .eq('document_id', documentId)
        .eq('stage', 'indexed')
        .order('created_at', { ascending: false })
        .limit(1),
    ]);
    return buildIndexInfoByDoc(
      (externalFilesRes.data ?? []) as Pick<DocumentExternalFile, 'document_id' | 'status' | 'error' | 'updated_at'>[],
      (indexJobsRes.data ?? []) as Pick<DocumentProcessingJob, 'document_id' | 'status' | 'error' | 'finished_at' | 'created_at'>[],
    ).get(documentId) ?? null;
  };

  const updateDoc = (updated: Document, tenantIds: string[], indexInfo?: DocumentIndexInfo | null) => {
    const lotsMap = new Map(lots.map(l => [l.id, l]));
    const tenantsMap = new Map(tenants.map(t => [t.id, t]));
    const extracted = (updated.extracted_data as { summary?: string } | null) ?? null;
    const hydrated = {
      ...updated,
      lot: updated.lot_id ? (lotsMap.get(updated.lot_id) ?? null) : null,
      tenants: tenantIds.map(id => tenantsMap.get(id)).filter((t): t is Tenant => !!t),
      summary: extracted?.summary ?? null,
    } satisfies Omit<DocWithRefs, 'indexInfo'>;
    setDocs(prev => prev.map(d => d.id === updated.id ? {
      ...hydrated,
      indexInfo: indexInfo ?? d.indexInfo ?? null,
    } : d));
  };

  const refreshDocumentAfterMutation = async (updated: Document, tenantIds: string[]) => {
    const [freshRes, indexInfo] = await Promise.all([
      activeWorkspace
        ? supabase
            .from('documents')
            .select('*')
            .eq('workspace_id', activeWorkspace.id)
            .eq('id', updated.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      loadDocumentIndexInfo(updated.id),
    ]);
    updateDoc((freshRes.data ?? updated) as Document, tenantIds, indexInfo);
  };

  const saveSelected = async (confirmDoc = false) => {
    if (!selectedDoc || !editor) return;
    setBusyId(selectedDoc.id);
    setActionError('');
    setActionNotice('');
    setActionDocId(null);
    const tenantIds = editor.tenant_ids;
    const res = await fetch(`/api/documents/${selectedDoc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: confirmDoc ? 'confirmed' : selectedDoc.status,
        doc_type: editor.doc_type,
        lot_id: editor.lot_id || null,
        tenant_ids: tenantIds,
      }),
    });
    const payload = await res.json().catch(() => null) as ({ document?: Document; detail?: string; error?: string } & Partial<Document>) | null;
    if (res.ok) {
      const updated = payload as Document;
      await refreshDocumentAfterMutation(updated, tenantIds);
      if (confirmDoc) {
        setActionDocId(updated.id);
        setActionNotice('Document confirmé. Le statut d’indexation est visible dans le coffre-fort.');
      } else {
        setActionDocId(updated.id);
        setActionNotice('Modifications enregistrées.');
      }
      if (confirmDoc) setMode('review');
    } else {
      if (payload?.document) {
        const indexInfo = await loadDocumentIndexInfo(payload.document.id);
        updateDoc(payload.document, tenantIds, indexInfo);
        if (confirmDoc && payload.document.status === 'confirmed') {
          setMode('vault');
          setSelectedId(payload.document.id);
          window.history.replaceState(null, '', `/documents?tab=vault&doc=${payload.document.id}`);
        }
        setActionDocId(payload.document.id);
      } else {
        setActionDocId(selectedDoc.id);
      }
      setActionError(payload?.detail ?? payload?.error ?? 'Enregistrement impossible.');
    }
    setBusyId(null);
  };

  const retrySelectedIndex = async () => {
    if (!selectedDoc) return;
    setBusyId(selectedDoc.id);
    setActionError('');
    setActionNotice('');
    setActionDocId(null);
    const tenantIds = selectedDoc.tenants.map(t => t.id);
    const res = await fetch(`/api/documents/${selectedDoc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'confirmed',
        doc_type: selectedDoc.doc_type,
        lot_id: selectedDoc.lot_id,
        tenant_ids: tenantIds,
      }),
    });
    const payload = await res.json().catch(() => null) as ({ document?: Document; detail?: string; error?: string } & Partial<Document>) | null;
    if (res.ok) {
      await refreshDocumentAfterMutation(payload as Document, tenantIds);
      setActionDocId(selectedDoc.id);
      setActionNotice('Indexation relancée.');
    } else {
      if (payload?.document) {
        const indexInfo = await loadDocumentIndexInfo(payload.document.id);
        updateDoc(payload.document, tenantIds, indexInfo);
        setActionDocId(payload.document.id);
      } else {
        setActionDocId(selectedDoc.id);
      }
      setActionError(payload?.detail ?? payload?.error ?? 'Indexation impossible.');
    }
    setBusyId(null);
  };

  const deleteSelected = async () => {
    if (!selectedDoc) return;
    if (!confirm(`Supprimer « ${selectedDoc.file_name} » ? Cette action est irréversible.`)) return;
    setBusyId(selectedDoc.id);
    setActionError('');
    setActionNotice('');
    setActionDocId(null);
    const res = await fetch(`/api/documents/${selectedDoc.id}`, { method: 'DELETE' });
    if (res.ok) {
      setDocs(prev => prev.filter(d => d.id !== selectedDoc.id));
      setSelectedId(null);
    }
    setBusyId(null);
  };

  const prepareDelivery = async () => {
    if (!selectedDoc) return;
    setBusyId(selectedDoc.id);
    const primaryTenant = selectedDoc.tenants[0] ?? null;
    const res = await fetch(`/api/documents/${selectedDoc.id}/deliver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'download',
        recipient_type: primaryTenant ? 'tenant' : 'agency',
        recipient_id: primaryTenant?.id ?? null,
        recipient_address: primaryTenant?.email ?? null,
        status: 'prepared',
        message: `Document préparé depuis le coffre-fort: ${selectedDoc.file_name}`,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.signed_url === 'string') {
        await navigator.clipboard?.writeText(data.signed_url).catch(() => undefined);
        window.open(data.signed_url, '_blank', 'noopener,noreferrer');
      }
    }
    setBusyId(null);
  };

  const selectMode = (nextMode: Mode) => {
    setMode(nextMode);
    setRequestedDocId(null);
    setSelectedId(null);
    window.history.replaceState(null, '', `/documents?tab=${nextMode}`);
  };

  const runContentSearch = async () => {
    if (!activeWorkspace || !contentQuery.trim()) return;
    setContentSearching(true);
    setContentSearchError('');
    setContentSearched(false);
    try {
      const res = await fetch('/api/documents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          query: contentQuery.trim(),
          include_pending: false,
          match_count: 6,
        }),
      });
      const data = await res.json() as { results?: unknown; error?: string; detail?: string };
      if (!res.ok) {
        setContentSearchError(data.error ?? data.detail ?? 'Recherche indisponible.');
        setContentResults([]);
        return;
      }
      const rawResults: unknown[] = Array.isArray(data.results) ? data.results : [];
      const results = rawResults
        .map(normalizeSearchResult)
        .filter((result): result is DocumentSearchResult => !!result);
      setContentResults(results);
      setContentSearched(true);
    } catch {
      setContentSearchError('Recherche indisponible.');
      setContentResults([]);
    } finally {
      setContentSearching(false);
    }
  };

  const openSearchResult = (result: DocumentSearchResult) => {
    setQuery('');
    setTypeFilter('all');
    setMode('vault');
    setRequestedDocId(null);
    setSelectedId(result.document_id);
    window.history.replaceState(null, '', `/documents?tab=vault&doc=${result.document_id}`);
  };

  const selectedBusy = !!selectedDoc && busyId === selectedDoc.id;
  const selectedIndexState = selectedDoc ? getDocumentIndexState(selectedDoc) : null;
  const indexedDocCount = docs.filter(doc => getDocumentIndexState(doc).kind === 'indexed').length;
  const unindexedConfirmedCount = docs.filter(doc => doc.status === 'confirmed' && getDocumentIndexState(doc).kind !== 'indexed').length;
  const headerSubtitle = mode === 'review'
    ? counts.review > 0
      ? `${counts.review} document${counts.review > 1 ? 's' : ''} à confirmer`
      : 'Aucun document à confirmer'
    : `${counts.vault} document${counts.vault > 1 ? 's' : ''} confirmé${counts.vault > 1 ? 's' : ''}`;

  return (
    <div className="flex h-[calc(100dvh-5rem)] min-h-[560px] flex-col gap-3 overflow-hidden">
      <header className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Documents</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {headerSubtitle}
          </p>
        </div>
        <Button onClick={() => router.push('/documents/upload')}>
          <Upload className="size-4" />
          Importer
        </Button>
      </header>

      <div className="flex shrink-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit rounded-lg border bg-card p-1">
          <button
            type="button"
            onClick={() => router.push('/documents/upload')}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Importer
          </button>
          <TabButton active={mode === 'review'} onClick={() => selectMode('review')}>
            Revue <span className="ml-1 rounded-full bg-brand px-1.5 text-[10px] text-white">{counts.review}</span>
          </TabButton>
          <TabButton active={mode === 'vault'} onClick={() => selectMode('vault')}>
            Coffre-fort <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{counts.vault}</span>
          </TabButton>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row lg:max-w-2xl">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher un fichier, un bien, un locataire..."
              className="pl-9"
            />
          </div>
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

      <div className="shrink-0 rounded-lg border bg-card p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Recherche dans le contenu</p>
            <p className="text-xs text-muted-foreground">
              {indexedDocCount} document{indexedDocCount > 1 ? 's' : ''} indexé{indexedDocCount > 1 ? 's' : ''}
              {unindexedConfirmedCount > 0 && ` · ${unindexedConfirmedCount} confirmé${unindexedConfirmedCount > 1 ? 's' : ''} à indexer`}
            </p>
          </div>
          <div className="flex min-w-0 flex-1 gap-2">
            <Input
              value={contentQuery}
              onChange={event => setContentQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') runContentSearch();
              }}
              placeholder="Ex : dépôt de garantie, assurance, fuite..."
            />
            <Button type="button" variant="outline" onClick={runContentSearch} disabled={contentSearching || !contentQuery.trim()}>
              {contentSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Chercher
            </Button>
          </div>
        </div>
        {contentSearchError && (
          <p className="mt-2 text-xs text-destructive">{contentSearchError}</p>
        )}
        {contentResults.length > 0 && (
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {contentResults.map((result, index) => (
              <SearchResultCard
                key={`${result.document_id}-${result.chunk_id ?? result.page_number ?? 'passage'}-${index}`}
                result={result}
                resultIndex={index}
                lots={lots}
                tenants={tenants}
                onOpen={() => openSearchResult(result)}
              />
            ))}
          </div>
        )}
        {contentSearched && !contentSearchError && contentResults.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Aucun passage indexé trouvé pour cette recherche.
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : docs.length === 0 ? (
        <EmptyDocuments onUpload={() => router.push('/documents/upload')} />
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-card">
            <div className="shrink-0 border-b px-3 py-2.5">
              <p className="text-sm font-semibold">
                {mode === 'review' ? 'Documents à revoir' : 'Coffre-fort'}
              </p>
              <p className="text-xs text-muted-foreground">
                {visibleDocs.length} document{visibleDocs.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {visibleDocs.length === 0 ? (
                <div className="p-8 text-sm text-muted-foreground">
                  {mode === 'review' ? 'Aucun document à confirmer.' : 'Aucun document confirmé.'}
                </div>
              ) : visibleDocs.map(doc => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  active={selectedDoc?.id === doc.id}
                  onSelect={() => setSelectedId(doc.id)}
                />
              ))}
            </div>
          </section>

          <section className="min-h-0 min-w-0 overflow-hidden rounded-lg border bg-card">
            {selectedDoc && editor ? (
              <div className="grid h-full min-h-0 lg:grid-cols-[300px_minmax(0,1fr)]">
                <div className="min-h-0 overflow-y-auto border-b p-3 lg:border-b-0 lg:border-r">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{selectedDoc.file_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(selectedDoc.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={selectedDoc.status === 'confirmed' ? 'secondary' : 'outline'}>
                        {selectedDoc.status === 'confirmed' ? 'Confirmé' : 'À revoir'}
                      </Badge>
                      <IndexStatusBadge doc={selectedDoc} />
                    </div>
                  </div>

                  {selectedDoc.summary && (
                    <p className="mt-4 rounded-md bg-muted/60 p-3 text-sm leading-6 text-muted-foreground">
                      {selectedDoc.summary}
                    </p>
                  )}

                  {selectedIndexState && (
                    <div className={`mt-3 rounded-md border p-3 text-xs ${selectedIndexState.badgeClassName}`}>
                      <div className="flex items-start gap-2">
                        <IndexStatusIcon state={selectedIndexState} className="mt-0.5 size-3.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{selectedIndexState.label}</p>
                          <p className="mt-0.5 leading-5 opacity-80">{selectedIndexState.description}</p>
                          {selectedDoc.indexInfo?.external_error && (
                            <p className="mt-1 line-clamp-2 leading-5 opacity-80">
                              {selectedDoc.indexInfo.external_error}
                            </p>
                          )}
                          {!selectedDoc.indexInfo?.external_error && selectedDoc.indexInfo?.job_error && (
                            <p className="mt-1 line-clamp-2 leading-5 opacity-80">
                              {selectedDoc.indexInfo.job_error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {actionError && (
                    <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs leading-5 text-destructive">
                      {actionError}
                    </p>
                  )}
                  {actionNotice && (
                    <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
                      {actionNotice}
                    </p>
                  )}

                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type de document</label>
                      <select
                        value={editor.doc_type}
                        onChange={e => setEditor({ ...editor, doc_type: e.target.value })}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Bien</label>
                      <select
                        value={editor.lot_id}
                        onChange={e => setEditor({ ...editor, lot_id: e.target.value })}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Aucun bien</option>
                        {lots.map(lot => (
                          <option key={lot.id} value={lot.id}>{lot.address}, {lot.city}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Locataires</label>
                      <div className="min-h-9 rounded-md border px-2 py-1.5">
                        {editor.tenant_ids.length === 0 ? (
                          <p className="px-1 py-0.5 text-sm text-muted-foreground">Aucun locataire associé</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {editor.tenant_ids.map(id => {
                              const tenant = tenants.find(t => t.id === id);
                              if (!tenant) return null;
                              return (
                                <span key={id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                                  {tenant.first_name} {tenant.last_name}
                                  <button
                                    type="button"
                                    onClick={() => setEditor({
                                      ...editor,
                                      tenant_ids: editor.tenant_ids.filter(x => x !== id),
                                    })}
                                    className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                                  >
                                    x
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={editor.add_tenant_id}
                          onChange={e => setEditor({ ...editor, add_tenant_id: e.target.value })}
                          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="">Ajouter un locataire existant...</option>
                          {tenants.filter(t => !editor.tenant_ids.includes(t.id)).map(tenant => (
                            <option key={tenant.id} value={tenant.id}>{tenant.first_name} {tenant.last_name}</option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!editor.add_tenant_id}
                          onClick={() => setEditor({
                            ...editor,
                            tenant_ids: [...editor.tenant_ids, editor.add_tenant_id],
                            add_tenant_id: '',
                          })}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 border-t pt-3">
                    {selectedDoc.status === 'pending' ? (
                      <Button onClick={() => saveSelected(true)} disabled={selectedBusy}>
                        {selectedBusy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                        Confirmer
                      </Button>
                    ) : (
                      <Button onClick={() => saveSelected(false)} disabled={selectedBusy}>
                        {selectedBusy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                        Enregistrer les modifications
                      </Button>
                    )}
                    {selectedDoc.status === 'confirmed' && selectedIndexState?.retryable && (
                      <Button variant="outline" onClick={retrySelectedIndex} disabled={selectedBusy}>
                        {selectedBusy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                        Relancer l&apos;indexation
                      </Button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {selectedDoc.status === 'confirmed' ? (
                        <Button variant="outline" onClick={prepareDelivery} disabled={selectedBusy}>
                          <Link2 className="size-4" />
                          Préparer le lien
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={() => saveSelected(false)} disabled={selectedBusy}>
                          <FileText className="size-4" />
                          Sauvegarder
                        </Button>
                      )}
                      <Button variant="outline" className="text-destructive hover:text-destructive" onClick={deleteSelected} disabled={selectedBusy}>
                        <Trash2 className="size-4" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 bg-muted/30">
                  {previewUrl ? (
                    <iframe src={previewUrl} className="h-full min-h-0 w-full" title="Aperçu du document" />
                  ) : (
                    <div className="flex h-full min-h-0 items-center justify-center text-sm text-muted-foreground">
                      Aucun PDF à afficher.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-0 items-center justify-center text-sm text-muted-foreground">
                Sélectionnez un document.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
        active ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function buildIndexInfoByDoc(
  externalFiles: Pick<DocumentExternalFile, 'document_id' | 'status' | 'error' | 'updated_at'>[],
  indexJobs: Pick<DocumentProcessingJob, 'document_id' | 'status' | 'error' | 'finished_at' | 'created_at'>[],
) {
  const byDoc = new Map<string, DocumentIndexInfo>();

  for (const row of externalFiles) {
    const current = byDoc.get(row.document_id) ?? {};
    byDoc.set(row.document_id, {
      ...current,
      external_status: row.status,
      external_error: row.error,
      external_updated_at: row.updated_at,
    });
  }

  for (const row of indexJobs) {
    if (!row.document_id) continue;
    const current = byDoc.get(row.document_id) ?? {};
    if (current.job_status) continue;
    byDoc.set(row.document_id, {
      ...current,
      job_status: row.status,
      job_error: row.error,
      job_finished_at: row.finished_at,
      job_created_at: row.created_at,
    });
  }

  return byDoc;
}

function getDocumentIndexState(doc: DocWithRefs | Document): DocumentIndexState {
  const indexInfo = 'indexInfo' in doc ? doc.indexInfo : null;

  if (doc.status === 'pending') {
    return {
      kind: 'review',
      label: 'À confirmer',
      description: 'L’indexation démarre après confirmation du document.',
      badgeClassName: 'border-amber-200 bg-amber-50 text-amber-800',
      iconClassName: 'text-amber-700',
      retryable: false,
    };
  }

  const failed = doc.processing_status === 'failed'
    || indexInfo?.external_status === 'failed'
    || indexInfo?.job_status === 'failed';
  if (failed) {
    return {
      kind: 'failed',
      label: 'Indexation échouée',
      description: 'Ce document est confirmé mais absent de la recherche documentaire.',
      badgeClassName: 'border-destructive/30 bg-destructive/10 text-destructive',
      iconClassName: 'text-destructive',
      retryable: true,
    };
  }

  if (doc.processing_status === 'indexed' || doc.indexed_at || indexInfo?.external_status === 'indexed') {
    return {
      kind: 'indexed',
      label: 'Indexé',
      description: 'Disponible dans la recherche documentaire et les réponses avec contexte.',
      badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      iconClassName: 'text-emerald-700',
      retryable: false,
    };
  }

  const indexing = indexInfo?.external_status === 'uploading' || indexInfo?.job_status === 'running';
  if (indexing || doc.processing_status === 'reviewed') {
    return {
      kind: 'indexing',
      label: indexing ? 'Indexation en cours' : 'Indexation à finaliser',
      description: indexing
        ? 'Le document est en cours de synchronisation avec l’index de recherche.'
        : 'Le document est confirmé, mais l’index n’a pas encore marqué la synchronisation comme terminée.',
      badgeClassName: 'border-sky-200 bg-sky-50 text-sky-800',
      iconClassName: 'text-sky-700',
      retryable: !indexing,
    };
  }

  return {
    kind: 'unindexed',
    label: 'Non indexé',
    description: 'Relancez l’indexation pour rendre ce document trouvable dans la recherche.',
    badgeClassName: 'border-muted bg-muted/60 text-muted-foreground',
    iconClassName: 'text-muted-foreground',
    retryable: true,
  };
}

function IndexStatusIcon({ state, className }: { state: DocumentIndexState; className?: string }) {
  if (state.kind === 'indexed') return <CheckCircle2 className={`${className ?? ''} ${state.iconClassName}`} />;
  if (state.kind === 'failed') return <AlertCircle className={`${className ?? ''} ${state.iconClassName}`} />;
  if (state.kind === 'indexing') return <Loader2 className={`${className ?? ''} ${state.iconClassName} animate-spin`} />;
  if (state.kind === 'review') return <Clock3 className={`${className ?? ''} ${state.iconClassName}`} />;
  return <FileText className={`${className ?? ''} ${state.iconClassName}`} />;
}

function IndexStatusBadge({ doc }: { doc: DocWithRefs }) {
  const state = getDocumentIndexState(doc);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${state.badgeClassName}`}>
      <IndexStatusIcon state={state} className="size-3" />
      {state.label}
    </span>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOrEmpty(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function normalizeSearchResult(row: unknown): DocumentSearchResult | null {
  if (!isRecord(row)) return null;
  const documentId = stringOrEmpty(row.document_id);
  const content = stringOrEmpty(row.content);
  if (!documentId || !content) return null;

  const pageNumber = typeof row.page_number === 'number'
    ? row.page_number
    : typeof row.page_number === 'string' && row.page_number.trim()
      ? Number(row.page_number)
      : null;
  const score = typeof row.score === 'number' ? row.score : Number(row.score ?? 0);

  return {
    chunk_id: stringOrEmpty(row.chunk_id) || undefined,
    document_id: documentId,
    file_name: stringOrEmpty(row.file_name) || 'Document',
    doc_type: stringOrEmpty(row.doc_type) || 'autre',
    status: stringOrEmpty(row.status) || undefined,
    content,
    score: Number.isFinite(score) ? score : 0,
    source: stringOrEmpty(row.source) || 'index',
    page_number: typeof pageNumber === 'number' && Number.isFinite(pageNumber) ? pageNumber : null,
    lot_id: stringOrEmpty(row.lot_id) || null,
    tenant_id: stringOrEmpty(row.tenant_id) || null,
    metadata: isRecord(row.metadata) ? row.metadata : null,
  };
}

function SearchResultCard({
  result,
  resultIndex,
  lots,
  tenants,
  onOpen,
}: {
  result: DocumentSearchResult;
  resultIndex: number;
  lots: Lot[];
  tenants: Tenant[];
  onOpen: () => void;
}) {
  const lot = result.lot_id ? lots.find(item => item.id === result.lot_id) : null;
  const tenant = result.tenant_id ? tenants.find(item => item.id === result.tenant_id) : null;
  const citation = [
    `Source ${resultIndex + 1}`,
    result.page_number ? `page ${result.page_number}` : 'passage indexé',
  ].join(' · ');
  const provider = typeof result.metadata?.provider === 'string' ? result.metadata.provider : result.source;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{result.file_name}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {citation} · score {result.score.toFixed(2)}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {DOC_TYPE_LABELS[result.doc_type] ?? result.doc_type}
        </Badge>
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
        {result.content}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
        {lot && (
          <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5">
            <Home className="size-3" />
            <span className="max-w-[10rem] truncate">{lot.address}</span>
          </span>
        )}
        {tenant && (
          <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5">
            <User className="size-3" />
            <span className="max-w-[10rem] truncate">{tenant.first_name} {tenant.last_name}</span>
          </span>
        )}
        <span className="rounded-full bg-muted px-1.5 py-0.5">{provider}</span>
      </div>
    </button>
  );
}

function DocumentRow({
  doc,
  active,
  onSelect,
}: {
  doc: DocWithRefs;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`block w-full border-b px-2.5 py-2 text-left transition-colors last:border-b-0 ${
        active ? 'bg-muted' : 'hover:bg-muted/60'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${
          doc.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {doc.status === 'pending' ? <AlertCircle className="size-3" /> : <FileText className="size-3" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-medium">{doc.file_name}</p>
            <Badge variant="secondary" className="shrink-0 px-1.5 text-[10px]">
              {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
            </Badge>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            {doc.lot ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Home className="size-3 shrink-0" />
                <span className="truncate">{doc.lot.address}</span>
              </span>
            ) : null}
            {doc.tenants.length > 0 ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <User className="size-3 shrink-0" />
                <span className="truncate">{doc.tenants[0].first_name} {doc.tenants[0].last_name}</span>
              </span>
            ) : null}
          </div>
          <div className="mt-2">
            <IndexStatusBadge doc={doc} />
          </div>
        </div>
      </div>
    </button>
  );
}

function EmptyDocuments({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="rounded-lg border bg-card p-10 text-center">
      <FileText className="mx-auto size-10 text-muted-foreground/40" />
      <p className="mt-3 text-sm font-medium">Aucun document pour l’instant.</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Importez un bail, une quittance, un état des lieux ou un document locataire. isimple extraira les informations utiles.
      </p>
      <Button className="mt-4" onClick={onUpload}>
        <Upload className="size-4" />
        Importer des documents
      </Button>
    </div>
  );
}
