import { supabase } from '@/lib/supabase';

const QUOTE_LOGO_BUCKET = (import.meta.env.VITE_SUPABASE_QUOTE_ASSETS_BUCKET as string | undefined) || 'quote-assets';

export async function uploadQuoteLogo(file: File, folder = 'logos') {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const path = `${folder}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from(QUOTE_LOGO_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  });
  if (error) throw error;

  const { data } = supabase.storage.from(QUOTE_LOGO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
