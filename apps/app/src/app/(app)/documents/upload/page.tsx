'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspace } from '@/contexts/workspace-context';
import { createClient } from '@/lib/supabase-browser';
import type { Lot, Tenant } from '@isimple/db';

const DOC_TYPES = [
  { value: 'bail', label: 'Bail' },
  { value: 'quittance', label: 'Quittance de loyer' },
  { value: 'etat_des_lieux', label: 'État des lieux' },
  { value: 'facture', label: 'Facture' },
  { value: 'autre', label: 'Autre' },
];

type ExtractedData = {
  doc_type?: string;
  tenant_first_name?: string | null;
  tenant_last_name?: string | null;
  tenant_email?: string | null;
  property_address?: string | null;
  property_city?: string | null;
  document_date?: string | null;
  rent_amount?: number | null;
  summary?: string | null;
};

type ReviewState = {
  doc_id: string;
  file_path: string;
  file_name: string;
  signed_url: string;
  extracted: ExtractedData;
  doc_type: string;
  lot_id: string;
  tenant_id: string;
};

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewId = searchParams.get('review');
  const { activeWorkspace } = useWorkspace();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<'idle' | 'analyzing' | 'review' | 'saving' | 'done'>('idle');
  const [review, setReview] = useState<ReviewState | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState('');

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
      supabase.from('documents').select('*').eq('id', reviewId).single().then(async ({ data }) => {
        if (!data) return;
        const urlRes = await fetch(`/api/documents/${reviewId}/url`);
        const { url } = urlRes.ok ? await urlRes.json() : { url: '' };
        const extracted = (data.extracted_data as ExtractedData) ?? {};
        setReview({
          doc_id: data.id,
          file_path: data.file_path,
          file_name: data.file_name,
          signed_url: url,
          extracted,
          doc_type: data.doc_type,
          lot_id: data.lot_id ?? '',
          tenant_id: data.tenant_id ?? '',
        });
        setStep('review');
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id, reviewId]);

  const handleFile = (f: File) => {
    if (f.type === 'application/pdf' || f.type.startsWith('image/')) {
      setFile(f);
      setError('');
    }
  };

  const handleAnalyze = async () => {
    if (!file || !activeWorkspace) return;
    setStep('analyzing');
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('workspace_id', activeWorkspace.id);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur');
      const data = await res.json();
      setReview({
        doc_id: data.id,
        file_path: data.file_path,
        file_name: data.file_name,
        signed_url: data.signed_url,
        extracted: data.extracted_data ?? {},
        doc_type: data.extracted_data?.doc_type ?? 'autre',
        lot_id: data.suggested_lot_id ?? '',
        tenant_id: data.suggested_tenant_id ?? '',
      });
      setStep('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setStep('idle');
    }
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
        tenant_id: review.tenant_id || null,
      }),
    });
    if (res.ok) {
      setStep('done');
    } else {
      setError('Erreur lors de la confirmation');
      setStep('review');
    }
  };

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <CheckCircle2 className="size-12 text-green-500" />
        <p className="text-lg font-medium">Document enregistré</p>
        <Button onClick={() => router.push('/documents')}>Retour au coffre-fort</Button>
      </div>
    );
  }

  if ((step === 'review' || step === 'saving') && review) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setStep('idle'); setReview(null); }}>← Retour</Button>
          <h1 className="text-xl font-semibold">Réviser le document</h1>
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
                <Label>Bien associé</Label>
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
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Locataire associé</Label>
                <select
                  value={review.tenant_id}
                  onChange={e => setReview(r => r ? { ...r, tenant_id: e.target.value } : r)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Aucun</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
                {(review.extracted.tenant_first_name || review.extracted.tenant_last_name) && (
                  <p className="text-xs text-muted-foreground">
                    Extrait : {review.extracted.tenant_first_name} {review.extracted.tenant_last_name}
                    {review.extracted.tenant_email && ` (${review.extracted.tenant_email})`}
                  </p>
                )}
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

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">Importer un document</h1>

      <div
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors
          ${dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'}
          ${file ? 'border-green-400 bg-green-50/40' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

        {file ? (
          <div className="flex items-center gap-3">
            <FileText className="size-8 text-green-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-green-700">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} Mo</p>
            </div>
            <button onClick={e => { e.stopPropagation(); setFile(null); }} className="ml-2 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Glissez un PDF ici</p>
              <p className="text-xs text-muted-foreground mt-1">ou cliquez pour parcourir · PDF, image · max 50 Mo</p>
            </div>
          </>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {step === 'analyzing' ? (
        <Button disabled className="w-full">
          <Loader2 className="size-4 mr-2 animate-spin" />
          Analyse en cours…
        </Button>
      ) : (
        <Button onClick={handleAnalyze} disabled={!file} className="w-full">
          Analyser avec l'IA
        </Button>
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
