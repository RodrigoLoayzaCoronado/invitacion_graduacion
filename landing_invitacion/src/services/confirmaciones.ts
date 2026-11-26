import { supabase } from '../lib/supabase';

export type NuevaConfirmacion = { nombre: string; personas: number; mensaje: string };

/** Guarda la confirmación (en modo demo no hace nada). */
export async function guardarConfirmacion(invitacionId: string, c: NuevaConfirmacion) {
  if (!supabase) return;
  const { error } = await supabase.from('confirmaciones').insert({ invitacion_id: invitacionId, ...c });
  if (error) throw error;
}
