import { createContext, useContext, useEffect, useState } from 'react';
import { modoDemo, supabase } from '../lib/supabase';
import { aplicarColores } from '../lib/formato';
import { DEMO } from './evento';
import type { DatosInvitacion } from './tipos';

export type EstadoCarga =
  | { tipo: 'cargando' }
  | { tipo: 'ok'; datos: DatosInvitacion }
  | { tipo: 'no-encontrada' }
  | { tipo: 'error' };

export const InvitacionCtx = createContext<DatosInvitacion | null>(null);

/** Datos de la invitación actual. Solo usar dentro de <InvitacionProvider>. */
export const useInvitacion = () => {
  const d = useContext(InvitacionCtx);
  if (!d) throw new Error('useInvitacion fuera de InvitacionProvider');
  return d;
};

/** Ruta: invitacion.novamark.com/<slug>?preview=<token> */
const leerUrl = () => {
  const slug = decodeURIComponent(location.pathname.split('/').filter(Boolean)[0] ?? '').toLowerCase();
  const preview = new URLSearchParams(location.search).get('preview');
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return { slug, preview: preview && uuid.test(preview) ? preview : null };
};

const estadoInicial = (): EstadoCarga => {
  if (modoDemo) return { tipo: 'ok', datos: DEMO };
  return leerUrl().slug ? { tipo: 'cargando' } : { tipo: 'no-encontrada' };
};

/** Carga la invitación según la URL (o los datos demo si no hay Supabase). */
export function useCargarInvitacion(): EstadoCarga {
  const [estado, setEstado] = useState<EstadoCarga>(estadoInicial);

  useEffect(() => {
    const { slug, preview } = leerUrl();
    if (!supabase || !slug) return;
    let activo = true;
    supabase.rpc('obtener_invitacion', { p_slug: slug, p_preview: preview }).then(({ data, error }) => {
      if (!activo) return;
      if (error) setEstado({ tipo: 'error' });
      else if (!data) setEstado({ tipo: 'no-encontrada' });
      else setEstado({ tipo: 'ok', datos: data as DatosInvitacion });
    });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (estado.tipo !== 'ok') return;
    const { colegio, invitacion } = estado.datos;
    aplicarColores(colegio.color_primario, colegio.color_secundario);
    document.title = `Graduación de ${invitacion.nombres || invitacion.apodo} · ${invitacion.promocion}`;
  }, [estado]);

  return estado;
}
