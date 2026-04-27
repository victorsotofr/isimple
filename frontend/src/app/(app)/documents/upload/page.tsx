'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle2, UserPlus, Plus, AlertCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useWorkspace } from '@/contexts/workspace-context';
import { createClient } from '@/lib/supabase-browser';
import type { Lot, Tenant } from '@/db';

const DOC_TYPES = [
  { value: 'bail', label: 'Bail' },
  { value: 'quittance', label: 'Quittance de loyer' },
  { value: 'etat_des_lieux', label: 'État des lieux' },
  { value: 'facture', label: 'Facture' },
  { value: 'autre', label: 'Autre' },
];

type ExtractedTenant = { first_name: string; last_name: string; email?: string | null };

type ExtractedData = {
  doc_type?: string;
  tenants?: ExtractedTenant[];
  // Legacy single-tenant fields (kept for backward compat with older extractions)
  tenant_first_name?: string | null;
  tenant_last_name?: string | null;
  tenant_email?: string | null;
  landlord_last_name?: string | null;
  property_address?: string | null;
  property_city?: string | null;
  property_postal_code?: string | null;
  document_date?: string | null;
  rent_amount?: number | null;
  summary?: string | null;
};

function getExtractedTenants(d: ExtractedData): ExtractedTenant[] {
  if (d.tenants?.length) return d.tenants;
  if (d.tenant_first_name && d.tenant_last_name) {
    return [{ first_name: d.tenant_first_name, last_name: d.tenant_last_name, email: d.tenant_email ?? null }];
  }
  return [];
}

function normalizeForMatch(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function findMatchingTenant(extracted: ExtractedTenant, tenants: Tenant[]): Tenant | undefined {
  if (extracted.email) {
    const target = extracted.email.toLowerCase().trim();
    const byEmail = tenants.find(t => t.email.toLowerCase() === target);
    if (byEmail) return byEmail;
  }
  const fn = normalizeForMatch(extracted.first_name);
  const ln = normalizeForMatch(extracted.last_name);
  return tenants.find(t =>
    normalizeForMatch(t.last_name) === ln && normalizeForMatch(t.first_name) === fn
  );
}

type ReviewState = {
  doc_id: string;
  file_path: string;
  file_name: string;
  signed_url: string;
  extracted: ExtractedData;
  doc_type: string;
  lot_id: string;
  tenant_ids: string[];
  created_lot_id?: string | null;
  created_tenant_ids?: string[];
};

type QueueItem = {
  file: File;
  state: 'pending' | 'analyzing' | 'done' | 'error';
  doc_id?: string;
  error?: string;
};

const MAX_CONCURRENT_UPLOADS = 2;
const isAcceptedFile = (f: File) => f.type === 'application/pdf' || f.type.startsWith('image/');

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewId = searchParams.get('review');
  const presetLotId = searchParams.get('lot_id');
  const { activeWorkspace } = useWorkspace();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [step, setStep] = useState<'idle' | 'analyzing' | 'review' | 'saving' | 'done'>('idle');
  const [review, setReview] = useState<ReviewState | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState('');
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [addTenantValue, setAddTenantValue] = useState('');
  const [pendingQueue, setPendingQueue] = useState<Array<{ id: string; file_name: string }>>([]);
  const [deletingDoc, setDeletingDoc] = useState(false);

  useEffect(() => {
    if (!activeWorkspace) return;
    Promise.all([
      supabase.from('lots').select('*').eq('workspace_id', activeWorkspace.id),
      supabase.from('tenants').select('*').eq('workspace_id', activeWorkspace.id),
    ]).then(([lotsRes, tenantsRes]) => {
      setLots((lotsRes.data ?? []) as Lot[]);
      setTenants((tenantsRes.data ?? []) as Tenant[]);
    });

    // If reviewing an existing document
    if (reviewId) {
      (async () => {
        const { data } = await supabase.from('documents').select('*').eq('id', reviewId).single();
        if (!data) return;
        const [{ data: linkRows }, urlRes, pendingRes] = await Promise.all([
          supabase.from('document_tenants').select('tenant_id').eq('document_id', reviewId),
          fetch(`/api/documents/${reviewId}/url`),
          supabase
            .from('documents')
            .select('id, file_name')
            .eq('workspace_id', activeWorkspace.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false }),
        ]);
        setPendingQueue((pendingRes.data ?? []) as Array<{ id: string; file_name: string }>);
        const { url } = urlRes.ok ? await urlRes.json() : { url: '' };
        const linkedIds = (linkRows ?? []).map(r => r.tenant_id as string);
        const tenant_ids = linkedIds.length
          ? linkedIds
          : data.tenant_id ? [data.tenant_id] : [];
        const extracted = (data.extracted_data as ExtractedData) ?? {};
        setReview({
          doc_id: data.id,
          file_path: data.file_path,
          file_name: data.file_name,
          signed_url: url,
          extracted,
          doc_type: data.doc_type,
          lot_id: data.lot_id ?? '',
          tenant_ids,
        });
        setStep('review');
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id, reviewId]);

  const addFiles = (incoming: File[]) => {
    const accepted = incoming.filter(isAcceptedFile);
    if (accepted.length === 0) return;
    setFiles(prev => [...prev, ...accepted]);
    setError('');
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadOne = async (file: File): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> => {
    if (!activeWorkspace) return { ok: false, error: 'Aucun espace actif' };
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('workspace_id', activeWorkspace.id);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
      if (!res.ok) return { ok: false, error: (await res.json()).error ?? 'Erreur' };
      return { ok: true, data: await res.json() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Erreur' };
    }
  };

  const openReview = async (data: Record<string, unknown>) => {
    const suggestedIds: string[] = Array.isArray(data.suggested_tenant_ids)
      ? (data.suggested_tenant_ids as string[])
      : data.suggested_tenant_id ? [data.suggested_tenant_id as string] : [];
    const extracted = (data.extracted_data as ExtractedData | undefined) ?? {};
    const createdTenantIds = Array.isArray(data.created_tenant_ids) ? (data.created_tenant_ids as string[]) : [];
    const createdLotId = (data.created_lot_id as string | null) ?? null;

    // If the server auto-created lot / tenants, re-fetch the local lists so the UI can resolve names.
    if (activeWorkspace && (createdLotId || createdTenantIds.length > 0)) {
      const [lotsRes, tenantsRes] = await Promise.all([
        supabase.from('lots').select('*').eq('workspace_id', activeWorkspace.id),
        supabase.from('tenants').select('*').eq('workspace_id', activeWorkspace.id),
      ]);
      setLots((lotsRes.data ?? []) as Lot[]);
      setTenants((tenantsRes.data ?? []) as Tenant[]);
    }

    setReview({
      doc_id: data.id as string,
      file_path: data.file_path as string,
      file_name: data.file_name as string,
      signed_url: (data.signed_url as string) ?? '',
      extracted,
      doc_type: extracted.doc_type ?? 'autre',
      lot_id: presetLotId ?? (data.suggested_lot_id as string | null) ?? '',
      tenant_ids: suggestedIds,
      created_lot_id: createdLotId,
      created_tenant_ids: createdTenantIds,
    });
    setStep('review');
  };

  const handleAnalyze = async () => {
    if (files.length === 0 || !activeWorkspace) return;
    setStep('analyzing');
    setError('');

    const initialQueue: QueueItem[] = files.map(f => ({ file: f, state: 'pending' }));
    setQueue(initialQueue);

    const results: Array<{ index: number; data?: Record<string, unknown>; error?: string }> = [];

    const indices = initialQueue.map((_, i) => i);
    const runOne = async (idx: number) => {
      setQueue(prev => prev.map((q, i) => i === idx ? { ...q, state: 'analyzing' } : q));
      const r = await uploadOne(initialQueue[idx].file);
      if (r.ok) {
        results.push({ index: idx, data: r.data });
        setQueue(prev => prev.map((q, i) => i === idx ? { ...q, state: 'done', doc_id: r.data.id as string } : q));
      } else {
        results.push({ index: idx, error: r.error });
        setQueue(prev => prev.map((q, i) => i === idx ? { ...q, state: 'error', error: r.error } : q));
      }
    };

    const workers: Promise<void>[] = [];
    const cursor = { i: 0 };
    for (let w = 0; w < Math.min(MAX_CONCURRENT_UPLOADS, indices.length); w++) {
      workers.push((async () => {
        while (cursor.i < indices.length) {
          const mine = cursor.i++;
          await runOne(indices[mine]);
        }
      })());
    }
    await Promise.all(workers);

    const successes = results.filter(r => r.data);
    // Single file success → open review screen directly (matches previous UX).
    if (files.length === 1 && successes.length === 1 && successes[0].data) {
      await openReview(successes[0].data);
      return;
    }

    // Multi-file or any error: hand off to the review queue in /documents.
    if (successes.length > 0) {
      setStep('done');
    } else {
      setStep('idle');
      setError('Échec de l\u2019analyse — réessayez.');
    }
  };

  const handleCreateTenant = async (extracted: ExtractedTenant, key: string) => {
    if (!review || !activeWorkspace) return;
    setCreatingKey(key);
    const { data, error: insertErr } = await supabase
      .from('tenants')
      .insert({
        workspace_id: activeWorkspace.id,
        first_name: extracted.first_name,
        last_name: extracted.last_name,
        email: extracted.email ?? `${normalizeForMatch(extracted.first_name)}.${normalizeForMatch(extracted.last_name)}.${Math.random().toString(36).slice(2, 6)}@placeholder.local`.replace(/\s+/g, '.'),
      })
      .select()
      .single();
    if (data && !insertErr) {
      setTenants(prev => [data as Tenant, ...prev]);
      setReview(r => r ? {
        ...r,
        tenant_ids: r.tenant_ids.includes(data.id) ? r.tenant_ids : [...r.tenant_ids, data.id],
      } : r);
    }
    setCreatingKey(null);
  };

  const addTenantId = (id: string) => {
    if (!id) return;
    setReview(r => r && !r.tenant_ids.includes(id) ? { ...r, tenant_ids: [...r.tenant_ids, id] } : r);
  };

  const removeTenantId = (id: string) => {
    setReview(r => r ? { ...r, tenant_ids: r.tenant_ids.filter(x => x !== id) } : r);
  };

  const handleConfirm = async () => {
    if (!review) return;
    setStep('saving');
    const res = await fetch(`/api/documents/${review.doc_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'confirmed',
        doc_type: review.doc_type,
        lot_id: review.lot_id || null,
        tenant_ids: review.tenant_ids,
      }),
    });
    if (res.ok) {
      const currentIdx = pendingQueue.findIndex(d => d.id === review.doc_id);
      const nextDoc = currentIdx >= 0 && currentIdx < pendingQueue.length - 1 ? pendingQueue[currentIdx + 1] : null;
      if (nextDoc) {
        setPendingQueue(prev => prev.filter(d => d.id !== review.doc_id));
        setStep('idle');
        setReview(null);
        router.push(`/documents/upload?review=${nextDoc.id}`);
      } else {
        setStep('done');
      }
    } else {
      setError('Erreur lors de la confirmation');
      setStep('review');
    }
  };

  if (step === 'done' && review) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <CheckCircle2 className="size-12 text-green-500" />
        <p className="text-lg font-medium">Document enregistré</p>
        <Button onClick={() => router.push(presetLotId ? `/lots/${presetLotId}` : '/documents')}>
          {presetLotId ? 'Retour au bien' : 'Retour au coffre-fort'}
        </Button>
      </div>
    );
  }

  if (step === 'done' && queue.length > 0) {
    const succeeded = queue.filter(q => q.state === 'done').length;
    const failed = queue.filter(q => q.state === 'error').length;
    return (
      <div className="max-w-xl space-y-6">
        <h1 className="text-xl font-semibold">Analyse terminée</h1>
        <div className="rounded-lg border divide-y">
          {queue.map((q, i) => <QueueRow key={i} item={q} />)}
        </div>
        <p className="text-sm text-muted-foreground">
          {succeeded} document{succeeded > 1 ? 's' : ''} prêt{succeeded > 1 ? 's' : ''} à réviser
          {failed > 0 && ` · ${failed} échec${failed > 1 ? 's' : ''}`}
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() => router.push(presetLotId ? `/lots/${presetLotId}?tab=documents` : '/documents')}
            disabled={succeeded === 0}
            className="flex-1"
          >
            Réviser les documents
          </Button>
          <Button variant="outline" onClick={() => { setFiles([]); setQueue([]); setStep('idle'); }}>
            Importer d&apos;autres documents
          </Button>
        </div>
      </div>
    );
  }

  if ((step === 'review' || step === 'saving') && review) {
    const currentIdx = pendingQueue.findIndex(d => d.id === review.doc_id);
    const inQueue = currentIdx >= 0;
    const queueTotal = pendingQueue.length;
    const prevDoc = inQueue && currentIdx > 0 ? pendingQueue[currentIdx - 1] : null;
    const nextDoc = inQueue && currentIdx < queueTotal - 1 ? pendingQueue[currentIdx + 1] : null;

    const goToDoc = (id: string) => {
      setStep('idle');
      setReview(null);
      router.push(`/documents/upload?review=${id}`);
    };

    const advanceOrExit = () => {
      if (nextDoc) goToDoc(nextDoc.id);
      else if (prevDoc) goToDoc(prevDoc.id);
      else router.push('/documents');
    };

    const handleDeleteCurrent = async () => {
      if (!review) return;
      if (!confirm(`Supprimer « ${review.file_name} » ? Cette action est irréversible.`)) return;
      setDeletingDoc(true);
      const res = await fetch(`/api/documents/${review.doc_id}`, { method: 'DELETE' });
      setDeletingDoc(false);
      if (res.ok) {
        setPendingQueue(prev => prev.filter(d => d.id !== review.doc_id));
        advanceOrExit();
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => router.push('/documents')}>← Documents</Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{review.file_name}</h1>
            {inQueue && queueTotal > 1 && (
              <p className="text-xs text-muted-foreground">
                Document {currentIdx + 1} sur {queueTotal} à réviser
              </p>
            )}
          </div>
          {inQueue && queueTotal > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={!prevDoc}
                onClick={() => prevDoc && goToDoc(prevDoc.id)}
                title={prevDoc?.file_name ?? ''}
              >
                <ChevronLeft className="size-3.5 mr-1" />
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!nextDoc}
                onClick={() => nextDoc && goToDoc(nextDoc.id)}
                title={nextDoc?.file_name ?? ''}
              >
                Suivant
                <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteCurrent}
            disabled={deletingDoc}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {deletingDoc ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Trash2 className="size-3.5 mr-1.5" />}
            Supprimer
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Left: extracted fields */}
          <div className="space-y-4 overflow-y-auto pr-2">
            <div className="rounded-lg border p-4 space-y-4">
              {review.extracted.summary && (
                <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                  {review.extracted.summary}
                </div>
              )}

              <div className="space-y-2">
                <Label>Type de document</Label>
                <select
                  value={review.doc_type}
                  onChange={e => setReview(r => r ? { ...r, doc_type: e.target.value } : r)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Bien associé
                  {review.created_lot_id && review.lot_id === review.created_lot_id && (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">
                      Nouveau
                    </span>
                  )}
                </Label>
                <select
                  value={review.lot_id}
                  onChange={e => setReview(r => r ? { ...r, lot_id: e.target.value } : r)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Aucun</option>
                  {lots.map(l => <option key={l.id} value={l.id}>{l.address}, {l.city}</option>)}
                </select>
                {review.extracted.property_address && (
                  <p className="text-xs text-muted-foreground">
                    Extrait : {review.extracted.property_address}{review.extracted.property_city ? `, ${review.extracted.property_city}` : ''}
                    {review.extracted.property_postal_code ? ` ${review.extracted.property_postal_code}` : ''}
                  </p>
                )}
                {review.created_lot_id && review.lot_id === review.created_lot_id && (
                  <p className="text-xs text-emerald-700">
                    Bien créé automatiquement — vérifiez les informations sur la fiche.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Locataires associés</Label>

                <div className="flex flex-wrap gap-1.5 min-h-9 rounded-md border border-input bg-transparent px-2 py-1.5">
                  {review.tenant_ids.length === 0 && (
                    <span className="text-sm text-muted-foreground px-1 py-0.5">Aucun locataire associé</span>
                  )}
                  {review.tenant_ids.map(id => {
                    const tenant = tenants.find(t => t.id === id);
                    if (!tenant) return null;
                    const isNew = review.created_tenant_ids?.includes(id);
                    return (
                      <span
                        key={id}
                        className={`inline-flex items-center gap-1 rounded-full text-xs font-medium pl-2.5 pr-1 py-0.5 ${
                          isNew
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-violet-100 text-violet-800'
                        }`}
                      >
                        {tenant.first_name} {tenant.last_name}
                        {isNew && (
                          <span className="text-[9px] uppercase tracking-wide font-semibold opacity-80">Nouveau</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeTenantId(id)}
                          className={`rounded-full p-0.5 transition-colors ${
                            isNew ? 'hover:bg-emerald-200' : 'hover:bg-violet-200'
                          }`}
                          aria-label="Retirer"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>

                {(() => {
                  const available = tenants.filter(t => !review.tenant_ids.includes(t.id));
                  if (available.length === 0) return null;
                  return (
                    <div className="flex items-center gap-2">
                      <select
                        value={addTenantValue}
                        onChange={e => setAddTenantValue(e.target.value)}
                        className="flex h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">Choisir un locataire existant…</option>
                        {available.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => { addTenantId(addTenantValue); setAddTenantValue(''); }}
                        disabled={!addTenantValue}
                        className="inline-flex items-center gap-1 rounded-md border border-input px-2 h-8 text-xs hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="size-3" />
                        Ajouter
                      </button>
                    </div>
                  );
                })()}

                {(() => {
                  const extracted = getExtractedTenants(review.extracted);
                  if (extracted.length === 0) return null;
                  return (
                    <div className="space-y-1 pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Extrait{extracted.length > 1 ? 's' : ''} du document :
                      </p>
                      {extracted.map((t, i) => {
                        const key = `${t.last_name}-${i}`;
                        const existing = findMatchingTenant(t, tenants);
                        const isLinked = existing && review.tenant_ids.includes(existing.id);
                        return (
                          <div key={key} className="flex items-center gap-2 text-xs py-0.5">
                            <span className="flex-1">
                              {t.first_name} {t.last_name}
                              {t.email && <span className="text-muted-foreground"> · {t.email}</span>}
                            </span>
                            {isLinked ? (
                              <span className="text-emerald-600 font-medium">✓ associé</span>
                            ) : existing ? (
                              <button
                                type="button"
                                onClick={() => addTenantId(existing.id)}
                                className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-700 transition-colors font-medium"
                              >
                                <Plus className="size-3" />
                                Associer
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCreateTenant(t, key)}
                                disabled={creatingKey === key}
                                className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-700 transition-colors disabled:opacity-50 font-medium"
                              >
                                {creatingKey === key ? <Loader2 className="size-3 animate-spin" /> : <UserPlus className="size-3" />}
                                Créer et associer
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {review.extracted.rent_amount && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Loyer extrait</Label>
                  <p className="text-sm">{review.extracted.rent_amount} €</p>
                </div>
              )}
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-3">
              <Button onClick={handleConfirm} disabled={step === 'saving'} className="flex-1">
                {step === 'saving' ? <><Loader2 className="size-4 mr-2 animate-spin" />Enregistrement…</> : 'Confirmer'}
              </Button>
            </div>
          </div>

          {/* Right: PDF preview */}
          <div className="rounded-lg border overflow-hidden">
            {review.signed_url ? (
              <iframe src={review.signed_url} className="w-full h-full" title="Aperçu du document" />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Aperçu non disponible
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isAnalyzing = step === 'analyzing';

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">Importer des documents</h1>

      <div
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors
          ${dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'}
          ${files.length > 0 ? 'border-green-400 bg-green-50/40' : ''}
          ${isAnalyzing ? 'pointer-events-none opacity-60' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/*"
          multiple
          className="hidden"
          onChange={e => {
            addFiles(Array.from(e.target.files ?? []));
            if (inputRef.current) inputRef.current.value = '';
          }}
        />
        <Upload className="size-7 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">
            {files.length === 0 ? 'Glissez un ou plusieurs documents' : 'Ajouter d\u2019autres documents'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">ou cliquez pour parcourir · PDF, image · max 50 Mo par fichier</p>
        </div>
      </div>

      {(files.length > 0 || queue.length > 0) && (
        <div className="rounded-lg border divide-y">
          {(isAnalyzing ? queue : files.map(f => ({ file: f, state: 'pending' as const }))).map((entry, i) => (
            <QueueRow
              key={i}
              item={entry}
              onRemove={isAnalyzing ? undefined : () => removeFile(i)}
            />
          ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {isAnalyzing ? (
        <Button disabled className="w-full">
          <Loader2 className="size-4 mr-2 animate-spin" />
          Analyse en cours… ({queue.filter(q => q.state === 'done' || q.state === 'error').length}/{queue.length})
        </Button>
      ) : (
        <Button onClick={handleAnalyze} disabled={files.length === 0} className="w-full">
          Analyser {files.length > 1 ? `${files.length} documents` : 'avec l\u2019IA'}
        </Button>
      )}
    </div>
  );
}

function QueueRow({ item, onRemove }: { item: QueueItem; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <FileText className="size-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.file.name}</p>
        <p className="text-xs text-muted-foreground">
          {(item.file.size / 1024 / 1024).toFixed(1)} Mo
          {item.state === 'error' && item.error && ` · ${item.error}`}
        </p>
      </div>
      <div className="shrink-0">
        {item.state === 'pending' && <span className="text-xs text-muted-foreground">En attente</span>}
        {item.state === 'analyzing' && (
          <span className="flex items-center gap-1.5 text-xs text-violet-600">
            <Loader2 className="size-3 animate-spin" />
            Analyse…
          </span>
        )}
        {item.state === 'done' && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="size-3.5" />
            Prêt
          </span>
        )}
        {item.state === 'error' && (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="size-3.5" />
            Échec
          </span>
        )}
      </div>
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Retirer"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense>
      <UploadContent />
    </Suspense>
  );
}
