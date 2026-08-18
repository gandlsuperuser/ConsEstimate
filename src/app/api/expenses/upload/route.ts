import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const expenseId = formData.get('expenseId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'No project ID provided' }, { status: 400 });
    }

    const supabase = await createClient();

    // Sanitize filename and create unique path
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${projectId}/${Date.now()}-${cleanFileName}`;

    // Upload to Supabase Storage bucket 'receipts'
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload receipt to storage', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(storagePath);

    const receiptUrl = publicUrlData.publicUrl;

    let updatedExpense = null;

    // If linked to an existing expense, update it
    if (expenseId) {
      const { data: expense, error: updateError } = await supabase
        .from('expenses')
        .update({ receipt_url: receiptUrl })
        .eq('id', expenseId)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to link receipt to expense:', updateError);
      } else {
        updatedExpense = expense;
      }
    }

    return NextResponse.json({
      success: true,
      receiptUrl,
      storagePath,
      fileName: file.name,
      expense: updatedExpense,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Receipt upload error:', message);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
