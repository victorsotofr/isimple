import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACT_PROMPT = `Tu es un assistant spécialisé en gestion locative immobilière française.
Extrais les informations de ce document immobilier.
Retourne UNIQUEMENT du JSON valide avec ces champs (null si inconnu) :
{
  "doc_type": "bail" | "quittance" | "etat_des_lieux" | "facture" | "autre",
  "tenant_first_name": string | null,
  "tenant_last_name": string | null,
  "tenant_email": string | null,
  "property_address": string | null,
  "property_city": string | null,
  "property_postal_code": string | null,
  "document_date": "YYYY-MM-DD" | null,
  "rent_amount": number | null,
  "summary": "résumé en 1-2 phrases en français"
}`;

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

    if (!file || !workspaceId) {
      return NextResponse.json({ error: 'Fichier ou workspace manquant' }, { status: 400 });
    }

    const admin = getServiceSupabase();

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop() ?? 'pdf';
    const filePath = `${workspaceId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
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

    // Try to match lot and tenant from extracted data
    let suggestedLotId: string | null = null;
    let suggestedTenantId: string | null = null;

    if (extractedData.tenant_last_name) {
      const { data: matchedTenants } = await admin
        .from('tenants')
        .select('id, last_name')
        .eq('workspace_id', workspaceId)
        .ilike('last_name', `%${extractedData.tenant_last_name}%`)
        .limit(1);
      if (matchedTenants?.length) suggestedTenantId = matchedTenants[0].id;
    }

    if (extractedData.property_address) {
      const { data: matchedLots } = await admin
        .from('lots')
        .select('id, address')
        .eq('workspace_id', workspaceId)
        .ilike('address', `%${String(extractedData.property_address).split(' ').slice(1).join(' ')}%`)
        .limit(1);
      if (matchedLots?.length) suggestedLotId = matchedLots[0].id;
    }

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

    // Generate signed URL for review
    const { data: signedData } = await admin.storage
      .from('documents')
      .createSignedUrl(filePath, 3600);

    return NextResponse.json({
      ...doc,
      signed_url: signedData?.signedUrl ?? '',
      suggested_lot_id: suggestedLotId,
      suggested_tenant_id: suggestedTenantId,
    }, { status: 201 });
  } catch (e) {
    console.error('[documents/upload]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
