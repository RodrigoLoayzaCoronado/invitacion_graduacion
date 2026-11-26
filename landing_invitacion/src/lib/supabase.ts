import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Sin configuración, la landing funciona en modo demo (datos de prueba + localStorage). */
export const modoDemo = !(url && anonKey && !url.includes('TU-PROYECTO'));

export const supabase = modoDemo
  ? null
  : createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
