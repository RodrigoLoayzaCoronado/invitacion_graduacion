// =====================================================
// SERVICIO DE MENSAJES (libro de firmas)
// - Con Supabase: tabla `mensajes` + Realtime (se actualiza en vivo)
// - Modo demo: localStorage con mensajes de ejemplo
// =====================================================
import { supabase } from '../lib/supabase';

export type MensajeMuro = { id: string; nombre: string; texto: string; fecha: number };

type Fila = { id: string; nombre: string; texto: string; created_at: string };
const aMensaje = (f: Fila): MensajeMuro => ({ id: f.id, nombre: f.nombre, texto: f.texto, fecha: Date.parse(f.created_at) });

export function suscribirMensajes(
  invitacionId: string,
  cb: (m: MensajeMuro[]) => void,
  onError?: (e: unknown) => void,
): () => void {
  if (!supabase) return demo.suscribir(cb);
  const sb = supabase;

  const cargar = async () => {
    const { data, error } = await sb
      .from('mensajes')
      .select('id, nombre, texto, created_at')
      .eq('invitacion_id', invitacionId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) onError?.(error);
    else cb((data as Fila[]).map(aMensaje));
  };

  void cargar();
  const canal = sb
    .channel(`mensajes-${invitacionId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes', filter: `invitacion_id=eq.${invitacionId}` }, () => void cargar())
    .subscribe();

  return () => {
    void sb.removeChannel(canal);
  };
}

export async function agregarMensaje(invitacionId: string, data: { nombre: string; texto: string }): Promise<MensajeMuro> {
  if (!supabase) return demo.agregar(data);
  const { data: fila, error } = await supabase
    .from('mensajes')
    .insert({ invitacion_id: invitacionId, nombre: data.nombre, texto: data.texto })
    .select('id, nombre, texto, created_at')
    .single();
  if (error) throw error;
  return aMensaje(fila as Fila);
}

// ---------------------------------------------------------------------
// Modo demo (sin Supabase)
// ---------------------------------------------------------------------
const demo = (() => {
  const KEY = 'graduacion_mensajes_demo';
  const EJEMPLOS: MensajeMuro[] = [
    { id: 'e1', nombre: 'Mamá y Papá', texto: '¡Estamos orgullosos de ti! Este es solo el comienzo de todo lo que vas a lograr.', fecha: 3 },
    { id: 'e2', nombre: 'Prof. Carla', texto: 'Fue un honor acompañarte estos años. ¡Éxitos en la universidad!', fecha: 2 },
    { id: 'e3', nombre: 'Diego', texto: 'Hermano, lo logramos. Promo 2026 para siempre 🎓', fecha: 1 },
  ];
  const oyentes = new Set<(m: MensajeMuro[]) => void>();
  const leer = (): MensajeMuro[] => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as MensajeMuro[];
    } catch {
      /* sin almacenamiento */
    }
    return EJEMPLOS;
  };
  const ordenar = (m: MensajeMuro[]) => [...m].sort((a, b) => b.fecha - a.fecha);

  return {
    suscribir(cb: (m: MensajeMuro[]) => void) {
      oyentes.add(cb);
      const t = setTimeout(() => cb(ordenar(leer())), 400);
      return () => {
        clearTimeout(t);
        oyentes.delete(cb);
      };
    },
    async agregar(data: { nombre: string; texto: string }) {
      const nuevo: MensajeMuro = { id: crypto.randomUUID(), ...data, fecha: Date.now() };
      const todos = ordenar([nuevo, ...leer()]);
      try {
        localStorage.setItem(KEY, JSON.stringify(todos));
      } catch {
        /* ignorar */
      }
      oyentes.forEach((cb) => cb(todos));
      return nuevo;
    },
  };
})();
