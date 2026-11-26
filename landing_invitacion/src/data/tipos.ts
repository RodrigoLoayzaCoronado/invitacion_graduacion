// Forma de los datos que devuelve la RPC `obtener_invitacion` de Supabase

export type Genero = 'masculino' | 'femenino' | 'neutro';
export type IconoMomento = 'iglesia' | 'birrete' | 'copa' | 'musica' | 'foto';

export type Momento = {
  id: string;
  hora: string; // "HH:MM:SS"
  titulo: string;
  lugar: string;
  direccion: string;
  mapa_url: string | null;
  icono: IconoMomento;
};

export type DatosInvitacion = {
  invitacion: {
    id: string;
    slug: string;
    publicada: boolean;
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
  };
  colegio: {
    id: string;
    nombre: string;
    ciudad: string;
    fundacion: number | null;
    lema: string | null;
    escudo_url: string | null;
    color_primario: string;
    color_secundario: string;
  };
  programa: Momento[];
  vista_previa: boolean;
};
