import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ProjectPhoto } from '@/types';

function getMetaPath(projectId: string): string {
  return `${projectId}/photos/photos_metadata.json`;
}

async function getPhotosMetadata(supabase: any, projectId: string): Promise<ProjectPhoto[]> {
  try {
    const { data, error } = await supabase.storage
      .from('receipts')
      .download(getMetaPath(projectId));

    if (error || !data) {
      return [];
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading photos metadata:', err);
    return [];
  }
}

async function savePhotosMetadata(supabase: any, projectId: string, photos: ProjectPhoto[]): Promise<boolean> {
  try {
    const jsonStr = JSON.stringify(photos, null, 2);
    const { error } = await supabase.storage
      .from('receipts')
      .upload(getMetaPath(projectId), Buffer.from(jsonStr), {
        contentType: 'application/json',
        upsert: true,
      });

    if (error) {
      console.error('Error saving photos metadata:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error writing photos metadata:', err);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const photos = await getPhotosMetadata(supabase, projectId);
    return NextResponse.json({ photos });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const caption = (formData.get('caption') as string | null) || '';
    const category = ((formData.get('category') as string | null) || 'progress') as ProjectPhoto['category'];

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Sanitize filename & unique path
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const storagePath = `${projectId}/photos/${Date.now()}_${cleanFileName}`;

    // Upload to Supabase Storage in 'receipts' bucket under photos/
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(storagePath, file, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error for photo:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload photo to storage', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(storagePath);

    const newPhoto: ProjectPhoto = {
      id: photoId,
      project_id: projectId,
      url: publicUrlData.publicUrl,
      storage_path: storagePath,
      file_name: file.name,
      caption: caption.trim() || undefined,
      category,
      uploaded_at: new Date().toISOString(),
      file_size: file.size,
    };

    // Update metadata list
    const existingPhotos = await getPhotosMetadata(supabase, projectId);
    const updatedPhotos = [newPhoto, ...existingPhotos];
    await savePhotosMetadata(supabase, projectId, updatedPhotos);

    return NextResponse.json({
      success: true,
      photo: newPhoto,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const photoId = searchParams.get('photoId');

    if (!projectId || !photoId) {
      return NextResponse.json({ error: 'projectId and photoId are required' }, { status: 400 });
    }

    const existingPhotos = await getPhotosMetadata(supabase, projectId);
    const photoToDelete = existingPhotos.find((p) => p.id === photoId);

    if (photoToDelete?.storage_path) {
      await supabase.storage.from('receipts').remove([photoToDelete.storage_path]);
    }

    const updatedPhotos = existingPhotos.filter((p) => p.id !== photoId);
    await savePhotosMetadata(supabase, projectId, updatedPhotos);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { projectId, photoId, caption, category } = body;

    if (!projectId || !photoId) {
      return NextResponse.json({ error: 'projectId and photoId are required' }, { status: 400 });
    }

    const existingPhotos = await getPhotosMetadata(supabase, projectId);
    const updatedPhotos = existingPhotos.map((p) => {
      if (p.id === photoId) {
        return {
          ...p,
          caption: caption !== undefined ? caption : p.caption,
          category: category !== undefined ? category : p.category,
        };
      }
      return p;
    });

    await savePhotosMetadata(supabase, projectId, updatedPhotos);
    return NextResponse.json({ success: true, photos: updatedPhotos });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
