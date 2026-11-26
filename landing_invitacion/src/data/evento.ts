// =====================================================
// DATOS DE DEMOSTRACIÓN
// Se usan solo cuando la landing no tiene Supabase configurado
// (sin .env.local), para poder probar el diseño.
// =====================================================
import type { DatosInvitacion } from './tipos';

export const DEMO: DatosInvitacion = {
  invitacion: {
    id: 'demo',
    slug: 'demo',
    publicada: true,
    nombres: 'Sebastián Andrés',
    apellidos: 'Rojas Mendoza',
    apodo: 'Seba',
    genero: 'masculino',
    titulo: 'Bachiller en Humanidades',
    promocion: 'Promoción 2026',
    foto_url: '/img/foto-demo.svg',
    mensaje:
      'Doce años de aulas, amigos, recreos y desafíos me trajeron hasta aquí. ' +
      'Nada de esto habría sido posible sin mi familia, mis maestros y quienes ' +
      'me acompañaron en el camino. Hoy cierro esta etapa con gratitud y quiero ' +
      'celebrarla contigo.',
    lema: '“Unidos por la fe, formados para servir”',
    fecha_evento: '2026-12-12T17:00:00-04:00',
    dress_code_titulo: 'Formal / Gala',
    dress_code_detalle: 'Te sugerimos tonos negros, blancos o rojos. Reservamos el blanco total para los graduados.',
    dress_code_colores: ['#121212', '#ffffff', '#d2161e', '#9a9a9a'],
    whatsapp: '59170000000',
    fecha_limite: '2026-12-05',
  },
  colegio: {
    id: 'demo',
    nombre: 'Unidad Educativa Monte Cristo',
    ciudad: 'Sucre – Bolivia',
    fundacion: 2008,
    lema: '“Unidos por la fe, formados para servir”',
    escudo_url: '/img/escudo.jpg',
    color_primario: '#d2161e',
    color_secundario: '#121212',
  },
  programa: [
    {
      id: 'm1',
      hora: '17:00:00',
      titulo: 'Misa de Acción de Gracias',
      lugar: 'Catedral Metropolitana de Sucre',
      direccion: 'Plaza 25 de Mayo, Sucre',
      mapa_url: 'https://maps.google.com/?q=Catedral+Metropolitana+de+Sucre',
      icono: 'iglesia',
    },
    {
      id: 'm2',
      hora: '19:00:00',
      titulo: 'Acto de Graduación',
      lugar: 'Coliseo U.E. Monte Cristo',
      direccion: 'Sucre, Chuquisaca',
      mapa_url: 'https://maps.google.com/?q=Unidad+Educativa+Monte+Cristo+Sucre',
      icono: 'birrete',
    },
    {
      id: 'm3',
      hora: '21:30:00',
      titulo: 'Cena y Fiesta de Gala',
      lugar: 'Salón de Eventos “Los Balcones”',
      direccion: 'Av. Las Américas, Sucre',
      mapa_url: 'https://maps.google.com/?q=Salon+de+eventos+Sucre',
      icono: 'copa',
    },
  ],
  vista_previa: false,
};
