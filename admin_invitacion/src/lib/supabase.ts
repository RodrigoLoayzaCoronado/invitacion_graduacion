import { createClient, FunctionsHttpError } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigurado = Boolean(url && anonKey && !url.includes('TU-PROYECTO'));

// Con valores de relleno si falta configuración: la app muestra la pantalla "Sin configurar".
export const supabase = createClient(
  supabaseConfigurado ? url! : 'https://sin-configurar.supabase.co',
  supabaseConfigurado ? anonKey! : 'sin-configurar',
);

export const LANDING_URL = ((import.meta.env.VITE_LANDING_URL as string | undefined) ?? '').replace(/\/+$/, '');

/** Extrae el mensaje legible de un error de Edge Function o de PostgREST. */
export async function mensajeDeError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return body.error as string;
    } catch {
      /* respuesta sin JSON */
    }
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = String((error as { message: string }).message);
    if (/violates check constraint/i.test(msg)) return 'Algún dato no cumple el formato permitido.';
    if (/duplicate key.*slug/i.test(msg)) return 'Esa dirección ya está en uso.';
    if (/row-level security|permission denied/i.test(msg)) return 'No tienes permiso para esta acción.';
    if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
    return msg;
  }
  return 'Ocurrió un error inesperado.';
}

/** Llama a la Edge Function gestionar-usuarios y lanza un Error legible si falla. */
export async function gestionarUsuarios<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('gestionar-usuarios', { body });
  if (error) throw new Error(await mensajeDeError(error));
  return data as T;
}
