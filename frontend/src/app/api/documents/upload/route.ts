import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACT_PROMPT = `Tu es un assistant spécialisé en gestion locative immobilière française.
Extrais les informations de ce document immobilier.

IMPORTANT : Distingue strictement les LOCATAIRES des BAILLEURS / PROPRIÉTAIRES.
- Les LOCATAIRES ("preneur", "locataire", "les Locataires") louent le bien. Extrais-les tous.
- Le BAILLEUR ("bailleur", "propriétaire", "loueur") n'est PAS un locataire — ne l'inclus JAMAIS dans "tenants".
- Un bail peut avoir plusieurs colocataires : renvoie-les tous dans le tableau.

Pour l'adresse du BIEN loué (pas celle du bailleur) :
- "property_address" doit inclure le numéro et la rue, sans la ville ni le code postal (ex: "8 rue des Trois Frères").
- "property_city" la ville seule (ex: "Paris").
- "property_postal_code" le code postal seul (ex: "75018").
- "property_type" : apartment | house | studio | parking | commercial | other (apartment si incertain).
- "property_area_m2" : surface en m² si mentionnée, sinon null.

Retourne UNIQUEMENT du JSON valide (null ou [] si inconnu) :
{
  "doc_type": "bail" | "caution" | "quittance" | "etat_des_lieux" | "assurance" | "rib" | "caf" | "piece_identite" | "mandat" | "facture" | "autre",
  "tenants": [{ "first_name": string, "last_name": string, "email": string | null }],
  "landlord_last_name": string | null,
  "property_address": string | null,
  "property_city": string | null,
  "property_postal_code": string | null,
  "property_type": "apartment" | "house" | "studio" | "parking" | "commercial" | "other" | null,
  "property_area_m2": number | null,
  "document_date": "YYYY-MM-DD" | null,
  "rent_amount": number | null,
  "charges_amount": number | null,
  "summary": "résumé en 1-2 phrases en français"
}`;

type PropertyType = 'apartment' | 'house' | 'studio' | 'parking' | 'commercial' | 'other';
const PROPERTY_TYPES: PropertyType[] = ['apartment', 'house', 'studio', 'parking', 'commercial', 'other'];

function normalizeText(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,;:'"()\-_/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ABBR_MAP: Record<string, string> = {
  bd: 'boulevard', bld: 'boulevard', blvd: 'boulevard',
  av: 'avenue', ave: 'avenue',
  pl: 'place',
  r: 'rue',
  imp: 'impasse',
  sq: 'square',
  ch: 'chemin',
  st: 'saint', ste: 'sainte',
};

function expandAbbr(s: string): string {
  return s
    .split(' ')
    .map(w => ABBR_MAP[w] ?? w)
    .join(' ');
}

function normalizeAddress(s: string): string {
  return expandAbbr(normalizeText(s));
}

function normalizeName(s: string): string {
  return normalizeText(s);
}

function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

function generatePlaceholderEmail(first: string, last: string): string {
  const slug = normalizeText(`${first}.${last}`).replace(/\s+/g, '.');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug}.${suffix}@placeholder.local`;
}

function safeFileName(name: string): string {
  const cleaned = name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'document.pdf';
}

function optionalFormValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0)));
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'documents';
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cs: Array<{ name: string; value: string; options?: CookieOptions }>) =>
            cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const workspaceId = formData.get('workspace_id') as string | null;
    const contextLotId = optionalFormValue(formData, 'lot_id');
    const contextTenantId = optionalFormValue(formData, 'tenant_id');
    const conversationId = optionalFormValue(formData, 'conversation_id');
    const source = safePathSegment(optionalFormValue(formData, 'source') ?? 'documents');

    if (!file || !workspaceId) {
      return NextResponse.json({ error: 'Fichier ou workspace manquant' }, { status: 400 });
    }

    const admin = getServiceSupabase();

    // Upload to Supabase Storage
    const month = new Date().toISOString().slice(0, 7);
    const filePath = `${workspaceId}/${month}/${source}/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeFileName(file.name)}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from('documents')
      .upload(filePath, fileBuffer, { contentType: file.type });

    if (uploadError) {
      console.error('[documents/upload] storage error:', uploadError);
      return NextResponse.json({ error: 'Erreur upload fichier' }, { status: 500 });
    }

    // AI extraction
    let extractedData: Record<string, unknown> = {};
    try {
      const base64 = fileBuffer.toString('base64');
      const isImage = file.type.startsWith('image/');

      const content: Anthropic.MessageParam['content'] = isImage
        ? [
            { type: 'image', source: { type: 'base64', media_type: file.type as Anthropic.Base64ImageSource['media_type'], data: base64 } },
            { type: 'text', text: EXTRACT_PROMPT },
          ]
        : [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as unknown as Anthropic.ContentBlockParam,
            { type: 'text', text: EXTRACT_PROMPT },
          ];

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) extractedData = JSON.parse(match[0]);
    } catch (aiErr) {
      console.warn('[documents/upload] AI extraction failed:', aiErr);
    }

    // ---------- Match or auto-create the lot ----------
    let suggestedLotId: string | null = null;
    let createdLotId: string | null = null;
    const reviewFlags: string[] = [];

    if (contextLotId) {
      const { data: contextLot } = await admin
        .from('lots')
        .select('id, address, city, postal_code, rent_amount')
        .eq('workspace_id', workspaceId)
        .eq('id', contextLotId)
        .single();
      if (contextLot) {
        suggestedLotId = contextLot.id;
      } else {
        reviewFlags.push('context_lot_not_found');
      }
    }

    const propAddress = typeof extractedData.property_address === 'string' ? extractedData.property_address.trim() : '';
    const propCity = typeof extractedData.property_city === 'string' ? extractedData.property_city.trim() : '';
    const propPostal = typeof extractedData.property_postal_code === 'string' ? extractedData.property_postal_code.trim() : '';
    const propType = PROPERTY_TYPES.includes(extractedData.property_type as PropertyType)
      ? (extractedData.property_type as PropertyType)
      : 'apartment';
    const propArea = typeof extractedData.property_area_m2 === 'number' ? extractedData.property_area_m2 : null;
    const rentAmount = typeof extractedData.rent_amount === 'number' ? extractedData.rent_amount : 0;
    const chargesAmount = typeof extractedData.charges_amount === 'number' ? extractedData.charges_amount : 0;

    if (propAddress && !suggestedLotId) {
      const { data: allLots } = await admin
        .from('lots')
        .select('id, address, city, postal_code')
        .eq('workspace_id', workspaceId);

      const normExtracted = normalizeAddress(propAddress);
      const normCity = propCity ? normalizeText(propCity) : '';

      // Score each lot: exact normalized match > substring match (scoped by postal/city if available).
      let best: { id: string; score: number } | null = null;
      for (const lot of allLots ?? []) {
        const normLot = normalizeAddress(lot.address);
        let score = 0;
        if (normLot === normExtracted) score = 100;
        else if (normLot.includes(normExtracted) || normExtracted.includes(normLot)) score = 70;
        if (score > 0) {
          if (propPostal && lot.postal_code === propPostal) score += 20;
          else if (propPostal && lot.postal_code !== propPostal) score -= 30;
          if (normCity && normalizeText(lot.city) === normCity) score += 10;
        }
        if (score > 0 && (!best || score > best.score)) {
          best = { id: lot.id, score };
        }
      }

      if (best && best.score >= 50) {
        suggestedLotId = best.id;
      } else if (propAddress && propCity && propPostal) {
        // Auto-create the lot when we have the three essential fields.
        const { data: newLot, error: lotErr } = await admin
          .from('lots')
          .insert({
            workspace_id: workspaceId,
            address: propAddress,
            city: propCity,
            postal_code: propPostal,
            type: propType,
            area_m2: propArea,
            rent_amount: rentAmount,
            charges_amount: chargesAmount,
          })
          .select('id')
          .single();
        if (!lotErr && newLot) {
          suggestedLotId = newLot.id;
          createdLotId = newLot.id;
        } else if (lotErr) {
          console.warn('[documents/upload] auto-create lot failed:', lotErr);
        }
      }
    }
    if (propAddress && suggestedLotId) {
      reviewFlags.push('property_address_extracted');
    }

    // ---------- Match or auto-create tenants ----------
    const extractedTenants = Array.isArray(extractedData.tenants)
      ? (extractedData.tenants as Array<{ first_name?: string; last_name?: string; email?: string | null }>)
      : [];

    // Deduplicate extracted tenants (AI sometimes repeats the same person).
    const dedupedExtracted: typeof extractedTenants = [];
    const seenKeys = new Set<string>();
    for (const t of extractedTenants) {
      if (!t.first_name || !t.last_name) continue;
      const key = t.email
        ? `e:${normalizeEmail(t.email)}`
        : `n:${normalizeName(t.first_name)}|${normalizeName(t.last_name)}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      dedupedExtracted.push(t);
    }

    // Load every workspace tenant once for fuzzy matching.
    const { data: allTenants } = await admin
      .from('tenants')
      .select('id, first_name, last_name, email')
      .eq('workspace_id', workspaceId);

    const suggestedTenantIds: string[] = [];
    const createdTenantIds: string[] = [];

    for (const t of dedupedExtracted) {
      const fn = (t.first_name ?? '').trim();
      const ln = (t.last_name ?? '').trim();
      const emailNorm = t.email ? normalizeEmail(t.email) : '';
      const fnNorm = normalizeName(fn);
      const lnNorm = normalizeName(ln);

      let matchId: string | null = null;
      for (const row of allTenants ?? []) {
        if (emailNorm && normalizeEmail(row.email) === emailNorm) { matchId = row.id; break; }
      }
      if (!matchId) {
        // Require both first + last to match (normalized) before linking existing tenants.
        // Last-name-only matching previously caused false positives (e.g. landlord with same surname).
        for (const row of allTenants ?? []) {
          if (normalizeName(row.last_name) === lnNorm && normalizeName(row.first_name) === fnNorm) {
            matchId = row.id;
            break;
          }
        }
      }

      if (matchId) {
        if (!suggestedTenantIds.includes(matchId)) suggestedTenantIds.push(matchId);
        continue;
      }

      // No match — auto-create. Use extracted email if provided, otherwise a placeholder
      // the user can fix from the tenants page.
      const email = emailNorm || generatePlaceholderEmail(fn, ln);
      const { data: newTenant, error: tErr } = await admin
        .from('tenants')
        .insert({
          workspace_id: workspaceId,
          first_name: fn,
          last_name: ln,
          email,
        })
        .select('id')
        .single();
      if (!tErr && newTenant) {
        suggestedTenantIds.push(newTenant.id);
        createdTenantIds.push(newTenant.id);
        allTenants?.push({ id: newTenant.id, first_name: fn, last_name: ln, email });
      } else if (tErr) {
        console.warn('[documents/upload] auto-create tenant failed:', tErr);
      }
    }

    if (contextTenantId) {
      const { data: contextTenant } = await admin
        .from('tenants')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('id', contextTenantId)
        .single();
      if (contextTenant && !suggestedTenantIds.includes(contextTenant.id)) {
        suggestedTenantIds.unshift(contextTenant.id);
      } else if (!contextTenant) {
        reviewFlags.push('context_tenant_not_found');
      }
    }

    if (!suggestedLotId) reviewFlags.push('missing_property_match');
    if (suggestedTenantIds.length === 0 && dedupedExtracted.length > 0) reviewFlags.push('missing_tenant_match');
    if ((extractedData.doc_type as string | undefined) === 'autre') reviewFlags.push('unknown_document_type');
    if (dedupedExtracted.length > 1) reviewFlags.push('multiple_tenants_detected');

    extractedData = {
      ...extractedData,
      _pipeline: {
        source,
        provider: 'anthropic',
        parser: 'native-llm',
        status: 'needs_review',
        uploaded_at: new Date().toISOString(),
        conversation_id: conversationId,
        context_lot_id: contextLotId,
        context_tenant_id: contextTenantId,
        review_flags: reviewFlags,
      },
    };

    const suggestedTenantId = uniqueIds(suggestedTenantIds)[0] ?? null;
    const linkedTenantIds = uniqueIds(suggestedTenantIds);

    // Create document record
    const { data: doc, error: dbError } = await admin
      .from('documents')
      .insert({
        workspace_id: workspaceId,
        file_name: file.name,
        file_path: filePath,
        doc_type: (extractedData.doc_type as string) || 'autre',
        status: 'pending',
        extracted_data: extractedData,
        lot_id: suggestedLotId,
        tenant_id: suggestedTenantId,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[documents/upload] db error:', dbError);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }

    // Persist every matched tenant in the junction table.
    if (linkedTenantIds.length > 0) {
      await admin.from('document_tenants').insert(
        linkedTenantIds.map(tenantId => ({
          document_id: doc.id,
          tenant_id: tenantId,
          workspace_id: workspaceId,
        }))
      );
    }

    // Generate signed URL for review
    const { data: signedData } = await admin.storage
      .from('documents')
      .createSignedUrl(filePath, 3600);

    return NextResponse.json({
      ...doc,
      signed_url: signedData?.signedUrl ?? '',
      suggested_lot_id: suggestedLotId,
      suggested_tenant_id: suggestedTenantId,
      suggested_tenant_ids: linkedTenantIds,
      created_lot_id: createdLotId,
      created_tenant_ids: createdTenantIds,
    }, { status: 201 });
  } catch (e) {
    console.error('[documents/upload]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
