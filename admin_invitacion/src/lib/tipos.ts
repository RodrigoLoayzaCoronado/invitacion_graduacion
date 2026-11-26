// Tipos que reflejan las tablas de supabase/migrations/*_esquema_inicial.sql

export type Rol = 'superadmin' | 'profesor' | 'alumno';
export type Genero = 'masculino' | 'femenino' | 'neutro';
export type IconoMomento = 'iglesia' | 'birrete' | 'copa' | 'musica' | 'foto';

export interface Colegio {
  id: string;
  nombre: string;
  ciudad: string;
  fundacion: number | null;
  lema: string | null;
  escudo_url: string | null;
  color_primario: string;
  color_secundario: string;
}

export interface Perfil {
  id: string;
  rol: Rol;
  nombre: string;
  email: string;
  colegio_id: string | null;
  created_at: string;
}

export interface Invitacion {
  id: string;
  alumno_id: string;
  colegio_id: string;
  slug: string;
  publicada: boolean;
  preview_token: string;
  nombres: string;
  apellidos: string;
  apodo: string;
  genero: Genero;
  titulo: string;
  promocion: string;
  foto_url: string | null;
  mensaje: string;
  lema: string;
  fecha_evento: string | null;
  dress_code_titulo: string;
  dress_code_detalle: string;
  dress_code_colores: string[];
  whatsapp: string | null;
  fecha_limite: string | null;
  updated_at: string;
}

export interface Momento {
  id?: string;
  hora: string; // HH:MM
  titulo: string;
  lugar: string;
  direccion: string;
  mapa_url: string | null;
  icono: IconoMomento;
}

export interface MensajeMuro {
  id: string;
  invitacion_id: string;
  nombre: string;
  texto: string;
  visible: boolean;
  created_at: string;
}

export interface Confirmacion {
  id: string;
  invitacion_id: string;
  nombre: string;
  personas: number;
  mensaje: string;
  created_at: string;
}

export const ROL_TEXTO: Record<Rol, string> = {
  superadmin: 'Superadmin',
  profesor: 'Profesor',
  alumno: 'Alumno',
};

export const ICONOS_MOMENTO: { valor: IconoMomento; texto: string }[] = [
  { valor: 'iglesia', texto: 'Misa / iglesia' },
  { valor: 'birrete', texto: 'Acto de graduación' },
  { valor: 'copa', texto: 'Cena / brindis' },
  { valor: 'musica', texto: 'Fiesta / baile' },
  { valor: 'foto', texto: 'Sesión de fotos' },
];

/** Columnas de invitaciones que el navegador puede modificar (coinciden con los GRANT del SQL). */
export const COLUMNAS_EDITABLES = [
  'slug', 'publicada', 'nombres', 'apellidos', 'apodo', 'genero', 'titulo', 'promocion',
  'foto_url', 'mensaje', 'lema', 'fecha_evento', 'dress_code_titulo', 'dress_code_detalle',
  'dress_code_colores', 'whatsapp', 'fecha_limite',
] as const;
