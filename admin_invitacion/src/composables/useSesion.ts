import { computed, reactive } from 'vue';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigurado } from '../lib/supabase';
import type { Perfil } from '../lib/tipos';

const estado = reactive({
  listo: false,
  session: null as Session | null,
  perfil: null as Perfil | null,
  /** Para alumnos: id de su invitación */
  invitacionId: null as string | null,
});

let inicio: Promise<void> | null = null;
let usuarioCargado: string | null = null;

async function aplicar(session: Session | null) {
  estado.session = session;
  const uid = session?.user.id ?? null;
  if (uid === usuarioCargado) return;
  usuarioCargado = uid;

  estado.perfil = null;
  estado.invitacionId = null;
  if (!uid) return;

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id, rol, nombre, email, colegio_id, created_at')
    .eq('id', uid)
    .maybeSingle();
  estado.perfil = (perfil as Perfil | null) ?? null;

  if (estado.perfil?.rol === 'alumno') {
    const { data } = await supabase.from('invitaciones').select('id').eq('alumno_id', uid).maybeSingle();
    estado.invitacionId = data?.id ?? null;
  }
}

/** Carga la sesión una sola vez y escucha cambios (login, logout, renovación de token). */
export function iniciarSesion() {
  if (!supabaseConfigurado) {
    estado.listo = true;
    return Promise.resolve();
  }
  inicio ??= (async () => {
    const { data } = await supabase.auth.getSession();
    await aplicar(data.session);
    estado.listo = true;
    // No se hacen consultas dentro del callback (recomendación de supabase-js): se difieren.
    supabase.auth.onAuthStateChange((_evento, session) => {
      setTimeout(() => void aplicar(session), 0);
    });
  })();
  return inicio;
}

export async function ingresar(email: string, clave: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: clave });
  if (error) throw error;
  await aplicar(data.session);
}

export async function salir() {
  await supabase.auth.signOut();
  await aplicar(null);
}

export function useSesion() {
  return {
    estado,
    rol: computed(() => estado.perfil?.rol ?? null),
    esSuperadmin: computed(() => estado.perfil?.rol === 'superadmin'),
    esProfesor: computed(() => estado.perfil?.rol === 'profesor'),
    esAlumno: computed(() => estado.perfil?.rol === 'alumno'),
  };
}
