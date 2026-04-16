'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Upload, Eye, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/contexts/workspace-context';
import { createClient } from '@/lib/supabase-browser';
import type { Document, Lot, Tenant } from '@/db';

type DocWithRefs = Document & { lot?: Lot | null; tenant?: Tenant | null };

const DOC_TYPE_LABELS: Record<string, string> = {
  bail: 'Bail',
  quittance: 'Quittance',
  etat_des_lieux: 'État des lieux',
  facture: 'Facture',
  autre: 'Autre',
};

export default function DocumentsPage() {
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();
  const supabase = createClient();

  const [docs, setDocs] = useState<DocWithRefs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    Promise.all([
      supabase.from('documents').select('*').eq('workspace_id', activeWorkspace.id).order('created_at', { ascending: false }),
      supabase.from('lots').select('*').eq('workspace_id', activeWorkspace.id),
      supabase.from('tenants').select('*').eq('workspace_id', activeWorkspace.id),
    ]).then(([docsRes, lotsRes, tenantsRes]) => {
      const lotsMap = new Map((lotsRes.data ?? []).map(l => [l.id, l as Lot]));
      const tenantsMap = new Map((tenantsRes.data ?? []).map(t => [t.id, t as Tenant]));
      setDocs(((docsRes.data ?? []) as Document[]).map(d => ({
        ...d,
        lot: d.lot_id ? (lotsMap.get(d.lot_id) ?? null) : null,
        tenant: d.tenant_id ? (tenantsMap.get(d.tenant_id) ?? null) : null,
      })));
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  const pending = docs.filter(d => d.status === 'pending');
  const confirmed = docs.filter(d => d.status === 'confirmed');

  const handleView = async (doc: Document) => {
    const res = await fetch(`/api/documents/${doc.id}/url`);
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, '_blank');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return;
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    setDocs(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Documents</h1>
        <Button size="sm" onClick={() => router.push('/documents/upload')}>
          <Upload className="size-4 mr-2" />
          Importer
        </Button>
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
        <>
          {pending.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
                <AlertCircle className="size-4" />
                {pending.length} document{pending.length > 1 ? 's' : ''} à réviser
              </div>
              {pending.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 rounded-md bg-white border p-3">
                  <FileText className="size-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm truncate">{doc.file_name}</span>
                  <Button size="sm" variant="outline" onClick={() => router.push(`/documents/upload?review=${doc.id}`)}>
                    Réviser
                  </Button>
                </div>
              ))}
            </div>
          )}

          {confirmed.length > 0 && (
            <div className="rounded-lg border divide-y">
              {confirmed.map(doc => (
                <div key={doc.id} className="flex items-center gap-4 p-4">
                  <FileText className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                      {doc.lot && ` · ${doc.lot.address}, ${doc.lot.city}`}
                      {doc.tenant && ` · ${doc.tenant.first_name} ${doc.tenant.last_name}`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                  </Badge>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => handleView(doc)}>
                      <Eye className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => router.push(`/documents/upload?review=${doc.id}`)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-8 text-destructive hover:text-destructive" onClick={() => handleDelete(doc.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
