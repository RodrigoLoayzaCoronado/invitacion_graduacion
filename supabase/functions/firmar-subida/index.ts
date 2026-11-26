// =====================================================================
// Edge Function: firmar-subida
// Devuelve una URL firmada (válida 5 min) para subir UNA imagen a
// Cloudflare R2 directamente desde el navegador. Las claves de R2 nunca
// salen de aquí, y la ruta del archivo la decide el servidor.
//
//   tipo 'perfil' -> foto del graduado   (id = invitación que puedes gestionar)
//   tipo 'escudo' -> escudo de un colegio (id = colegio; superadmin o profesor de ese colegio)
// =====================================================================
import { AwsClient } from 'npm:aws4fetch@1.0.20';
import { clienteAdmin, clienteUsuario, ErrorHttp, json, servir, usuarioActual } from '../_shared/comun.ts';

const TIPOS: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new ErrorHttp(500, `Falta configurar el secreto ${k}`);
  return v;
};

servir(async (req) => {
  const admin = clienteAdmin();
  const yo = await usuarioActual(req, admin);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const tipo = body.tipo;
  const id = typeof body.id === 'string' ? body.id : '';
  const contentType = typeof body.content_type === 'string' ? body.content_type : '';
  const ext = TIPOS[contentType];

  if (!UUID_RE.test(id)) throw new ErrorHttp(400, 'Identificador inválido');
  if (!ext) throw new ErrorHttp(400, 'Formato no permitido (usa WebP, JPG o PNG)');

  let carpeta: string;
  if (tipo === 'perfil') {
    // Se valida con las mismas reglas RLS que usa la base de datos
    const { data: puede } = await clienteUsuario(req).rpc('puede_gestionar', { p_invitacion: id });
    if (!puede) throw new ErrorHttp(403, 'No puedes modificar esta invitación');
    carpeta = `perfiles/${id}`;
  } else if (tipo === 'escudo') {
    const permitido = yo.rol === 'superadmin' || (yo.rol === 'profesor' && yo.colegio_id === id);
    if (!permitido) throw new ErrorHttp(403, 'No puedes modificar este colegio');
    carpeta = `escudos/${id}`;
  } else {
    throw new ErrorHttp(400, 'Tipo de imagen desconocido');
  }

  const key = `${carpeta}/${crypto.randomUUID()}.${ext}`;

  const r2 = new AwsClient({
    accessKeyId: env('R2_ACCESS_KEY_ID'),
    secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    service: 's3',
    region: 'auto',
  });

  const url = new URL(`https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/${env('R2_BUCKET')}/${key}`);
  url.searchParams.set('X-Amz-Expires', '300');

  const firmado = await r2.sign(new Request(url, { method: 'PUT', headers: { 'Content-Type': contentType } }), {
    aws: { signQuery: true },
  });

  return json({
    url_subida: firmado.url,
    url_publica: `${env('R2_PUBLIC_URL').replace(/\/+$/, '')}/${key}`,
    content_type: contentType,
  });
});
