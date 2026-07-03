import { supabase } from './supabaseClient';

export type ImageBucket = 'club-logo' | 'activity-images' | 'player-photos';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/** Uploads an image to the given public Supabase Storage bucket and returns its public URL. */
export async function uploadImage(bucket: ImageBucket, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Le fichier doit être une image');
  if (file.size > MAX_SIZE) throw new Error('Image trop volumineuse (5 Mo max)');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
