// Utilidades compartidas por las Edge Functions
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export class ErrorHttp extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type Perfil = {
  id: string;
  rol: 'superadmin' | 'profesor' | 'alumno';
  nombre: string;
  colegio_id: string | null;
};

/** Cliente con privilegios totales (service role). Solo vive en el servidor. */
export const clienteAdmin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** Cliente que actúa como el usuario que llama (respeta RLS). */
export const clienteUsuario = (req: Request) =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** Identifica al usuario que llama a partir de su JWT y carga su perfil. */
export async function usuarioActual(req: Request, admin: SupabaseClient): Promise<Perfil> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) throw new ErrorHttp(401, 'Sesión requerida');

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new ErrorHttp(401, 'Sesión inválida o vencida');

  const { data: perfil } = await admin
    .from('perfiles')
    .select('id, rol, nombre, colegio_id')
    .eq('id', data.user.id)
    .single();
  if (!perfil) throw new ErrorHttp(403, 'Tu usuario no tiene un perfil asignado');
  return perfil as Perfil;
}

/** Envuelve el handler con CORS y manejo de errores uniforme. */
export const servir = (handler: (req: Request) => Promise<Response>) =>
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof ErrorHttp) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: 'Error interno' }, 500);
    }
  });
