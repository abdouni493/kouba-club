import { supabase } from './supabaseClient';

export type ImageBucket = 'club-logo' | 'activity-images' | 'player-photos' | 'player-documents';

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

/** Uploads a base64 PDF (as produced by src/lib/pdf.ts) and returns its public URL, for linking in an SMS. */
export async function uploadPdfForSms(base64: string): Promise<string> {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'application/pdf' });

  const path = `${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage.from('sms-attachments').upload(path, blob, { cacheControl: '3600', upsert: false, contentType: 'application/pdf' });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('sms-attachments').getPublicUrl(path);
  return data.publicUrl;
}
