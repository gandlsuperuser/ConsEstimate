import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';
import { ReceiptScanResult } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_PROMPT = `You are a construction cost accountant. Analyze this receipt and return ONLY a JSON object with these fields: { vendor: string, date: string (YYYY-MM-DD or null), total: number, currency: string, items: [{description: string, amount: number}], suggested_category: string (pick the single best match from this list: [Demo, Foundation, Framing, Roofing, Electrical, Plumbing, HVAC, Insulation, Drywall, Flooring, Cabinets/Millwork, Paint, Exterior, Landscaping, Overhead, Equipment, Permits, Other]), confidence: 'high'|'medium'|'low', notes: string }. Return nothing except the JSON.`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'No project ID provided' }, { status: 400 });
    }

    // Read file as base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mediaType = file.type || 'application/octet-stream';

    // Call Claude API with vision
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as any,
                data: base64,
              },
            },
          ],
        },
      ],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse JSON response
    let scanResult: ReceiptScanResult;
    try {
      scanResult = JSON.parse(responseText.trim());
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse receipt data' },
        { status: 422 }
      );
    }

    // Upload receipt to Supabase Storage
    const supabase = await createClient();
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${projectId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    let receiptUrl: string | null = null;
    if (!uploadError) {
      const { data } = supabase.storage.from('receipts').getPublicUrl(fileName);
      receiptUrl = data.publicUrl;
    }

    // Save expense to database
    const { data: expense, error: dbError } = await supabase
      .from('expenses')
      .insert({
        project_id: projectId,
        category: scanResult.suggested_category,
        vendor: scanResult.vendor,
        expense_date: scanResult.date || new Date().toISOString().split('T')[0],
        amount: scanResult.total,
        receipt_url: receiptUrl,
        scan_confidence: scanResult.confidence,
        notes: scanResult.notes,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: 'Failed to save expense', details: dbError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      expense,
      scanResult,
    });
  } catch (error) {
    console.error('Receipt scan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
