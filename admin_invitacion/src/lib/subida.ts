import { mensajeDeError, supabase } from './supabase';

export type TipoImagen = 'perfil' | 'escudo';

/**
 * Sube una imagen a Cloudflare R2:
 * 1) pide una URL firmada a la Edge Function `firmar-subida` (valida permisos)
 * 2) hace PUT directo a R2 desde el navegador
 * Devuelve la URL pública final.
 */
export async function subirImagen(tipo: TipoImagen, id: string, blob: Blob): Promise<string> {
  const { data, error } = await supabase.functions.invoke('firmar-subida', {
    body: { tipo, id, content_type: blob.type },
  });
  if (error) throw new Error(await mensajeDeError(error));

  const { url_subida, url_publica, content_type } = data as {
    url_subida: string;
    url_publica: string;
    content_type: string;
  };

  const resp = await fetch(url_subida, { method: 'PUT', headers: { 'Content-Type': content_type }, body: blob });
  if (!resp.ok) throw new Error(`No se pudo subir la imagen (R2 respondió ${resp.status})`);
  return url_publica;
}
