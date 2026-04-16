import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPTS = {
  lot: `Extract property (bien immobilier) information from this description or document.
Return ONLY valid JSON with these exact fields (use null for unknown values):
{
  "address": "street address only (no city/postal)",
  "city": "city name",
  "postal_code": "5-digit postal code",
  "type": "apartment|house|studio|parking|commercial|other",
  "area_m2": number or null,
  "rent_amount": number,
  "charges_amount": number
}`,
  tenant: `Extract tenant (locataire) information from this description or document.
Return ONLY valid JSON with these exact fields (use null for unknown values):
{
  "first_name": "first name",
  "last_name": "last name",
  "email": "email address or null",
  "phone": "phone number or null"
}`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, description, file, fileType } = body as {
      type: 'lot' | 'tenant';
      description?: string;
      file?: string;
      fileType?: string;
    };

    if (!PROMPTS[type]) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    let content: Anthropic.MessageParam['content'];

    if (file) {
      const mediaType = (fileType as Anthropic.Base64ImageSource['media_type']) ?? 'application/pdf';
      content = [
        {
          type: 'document' as const,
          source: { type: 'base64' as const, media_type: 'application/pdf', data: file },
        } as unknown as Anthropic.ContentBlockParam,
        { type: 'text', text: PROMPTS[type] },
      ];
      // For images use image block instead
      if (mediaType.startsWith('image/')) {
        content = [
          {
            type: 'image' as const,
            source: { type: 'base64' as const, media_type: mediaType as Anthropic.Base64ImageSource['media_type'], data: file },
          },
          { type: 'text', text: PROMPTS[type] },
        ];
      }
    } else {
      content = `${PROMPTS[type]}\n\nDescription: ${description}`;
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: 'No JSON in response' }, { status: 500 });

    return NextResponse.json(JSON.parse(match[0]));
  } catch (e) {
    console.error('[AI parse]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
