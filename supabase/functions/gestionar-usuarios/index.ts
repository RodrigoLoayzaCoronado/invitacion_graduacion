// =====================================================================
// Edge Function: gestionar-usuarios
// Acciones:
//   crear        -> crea profesor o alumno (y la invitación vacía del alumno)
//   cambiar_clave-> asigna una nueva contraseña a un usuario que gestionas
//   eliminar     -> borra el usuario (y en cascada su perfil e invitación)
//
// Permisos:
//   superadmin : profesores y alumnos de cualquier colegio
//   profesor   : solo alumnos de su propio colegio
// =====================================================================
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { clienteAdmin, ErrorHttp, json, servir, usuarioActual, type Perfil } from '../_shared/comun.ts';

const RESERVADOS = new Set([
  'admin', 'panel', 'login', 'api', 'assets', 'img', 'static', 'public', 'preview',
  'novamark', 'invitacion', 'invitaciones', 'www', 'app', 'favicon', 'robots',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const slugificar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '');

async function slugUnico(admin: SupabaseClient, nombres: string, apellidos: string) {
  const primerNombre = nombres.split(/\s+/)[0] ?? '';
  const primerApellido = apellidos.split(/\s+/)[0] ?? '';
  let base = slugificar(`${primerNombre} ${primerApellido}`);
  if (base.length < 3 || RESERVADOS.has(base)) base = `graduado-${base}`.replace(/-+$/, '');

  for (let i = 1; i < 100; i++) {
    const candidato = i === 1 ? base : `${base}-${i}`;
    const { data } = await admin.from('invitaciones').select('id').eq('slug', candidato).maybeSingle();
    if (!data) return candidato;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

/** ¿Quien llama puede gestionar al usuario objetivo? */
async function verificarGestion(admin: SupabaseClient, yo: Perfil, objetivoId: string) {
  if (objetivoId === yo.id) throw new ErrorHttp(400, 'No puedes hacer esto sobre tu propio usuario');
  const { data: objetivo } = await admin
    .from('perfiles')
    .select('id, rol, colegio_id')
    .eq('id', objetivoId)
    .single();
  if (!objetivo) throw new ErrorHttp(404, 'Usuario no encontrado');

  if (yo.rol === 'superadmin') return objetivo;
  if (yo.rol === 'profesor' && objetivo.rol === 'alumno' && objetivo.colegio_id === yo.colegio_id) return objetivo;
  throw new ErrorHttp(403, 'No tienes permiso sobre este usuario');
}

async function crear(admin: SupabaseClient, yo: Perfil, body: Record<string, unknown>) {
  const rol = body.rol === 'profesor' ? 'profesor' : 'alumno';
  const email = texto(body.email, 120).toLowerCase();
  const nombres = texto(body.nombres, 60);
  const apellidos = texto(body.apellidos, 60);
  const modo = body.modo === 'clave' ? 'clave' : 'correo';
  const clave = typeof body.clave === 'string' ? body.clave : '';
  const anio = Number(body.promocion) || new Date().getFullYear();

  if (!EMAIL_RE.test(email)) throw new ErrorHttp(400, 'Correo inválido');
  if (nombres.length < 2) throw new ErrorHttp(400, 'Escribe el nombre');
  if (modo === 'clave' && clave.length < 8) throw new ErrorHttp(400, 'La contraseña debe tener al menos 8 caracteres');

  // Permisos y colegio de destino
  let colegioId: string | null;
  if (yo.rol === 'superadmin') {
    colegioId = texto(body.colegio_id, 36) || null;
  } else if (yo.rol === 'profesor') {
    if (rol !== 'alumno') throw new ErrorHttp(403, 'Un profesor solo puede crear alumnos');
    colegioId = yo.colegio_id;
  } else {
    throw new ErrorHttp(403, 'No tienes permiso para crear usuarios');
  }
  if (!colegioId) throw new ErrorHttp(400, 'Selecciona un colegio');

  const { data: colegio } = await admin.from('colegios').select('id, lema').eq('id', colegioId).single();
  if (!colegio) throw new ErrorHttp(400, 'El colegio no existe');

  const nombreCompleto = `${nombres} ${apellidos}`.trim();

  // 1) Usuario de Auth
  const metadata = { nombre: nombreCompleto, rol };
  const adminUrl = Deno.env.get('ADMIN_URL') ?? '';
  const { data: creado, error: errAuth } =
    modo === 'correo'
      ? await admin.auth.admin.inviteUserByEmail(email, {
          data: metadata,
          redirectTo: adminUrl ? `${adminUrl}/definir-contrasena` : undefined,
        })
      : await admin.auth.admin.createUser({ email, password: clave, email_confirm: true, user_metadata: metadata });

  if (errAuth || !creado.user) {
    const msg = errAuth?.message ?? '';
    if (/already|registered|exists/i.test(msg)) throw new ErrorHttp(409, 'Ya existe un usuario con ese correo');
    throw new ErrorHttp(400, `No se pudo crear el usuario: ${msg}`);
  }
  const userId = creado.user.id;

  // 2) Perfil + invitación. Si algo falla, se revierte el usuario de Auth.
  try {
    const { error: errPerfil } = await admin.from('perfiles').insert({
      id: userId,
      rol,
      nombre: nombreCompleto,
      email,
      colegio_id: colegioId,
      creado_por: yo.id,
    });
    if (errPerfil) throw errPerfil;

    let invitacion: { id: string; slug: string } | null = null;
    if (rol === 'alumno') {
      const slug = await slugUnico(admin, nombres, apellidos);
      const { data, error } = await admin
        .from('invitaciones')
        .insert({
          alumno_id: userId,
          colegio_id: colegioId,
          slug,
          nombres,
          apellidos,
          apodo: nombres.split(/\s+/)[0] ?? '',
          promocion: `Promoción ${anio}`,
          lema: colegio.lema ?? '',
          dress_code_titulo: 'Formal',
          dress_code_colores: ['#121212', '#ffffff'],
        })
        .select('id, slug')
        .single();
      if (error) throw error;
      invitacion = data;
    }

    return json({ ok: true, usuario: { id: userId, email, rol, nombre: nombreCompleto }, invitacion, modo });
  } catch (e) {
    await admin.auth.admin.deleteUser(userId);
    console.error(e);
    throw new ErrorHttp(500, 'No se pudo completar el registro; se revirtió el usuario');
  }
}

servir(async (req) => {
  const admin = clienteAdmin();
  const yo = await usuarioActual(req, admin);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  switch (body.accion) {
    case 'crear':
      return crear(admin, yo, body);

    case 'cambiar_clave': {
      const id = texto(body.usuario_id, 36);
      const clave = typeof body.clave === 'string' ? body.clave : '';
      if (clave.length < 8) throw new ErrorHttp(400, 'La contraseña debe tener al menos 8 caracteres');
      await verificarGestion(admin, yo, id);
      const { error } = await admin.auth.admin.updateUserById(id, { password: clave });
      if (error) throw new ErrorHttp(400, error.message);
      return json({ ok: true });
    }

    case 'eliminar': {
      const id = texto(body.usuario_id, 36);
      await verificarGestion(admin, yo, id);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw new ErrorHttp(400, error.message);
      return json({ ok: true });
    }

    default:
      throw new ErrorHttp(400, 'Acción desconocida');
  }
});
