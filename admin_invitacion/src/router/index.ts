import { createRouter, createWebHistory, type RouteLocationRaw } from 'vue-router';
import { iniciarSesion, useSesion } from '../composables/useSesion';
import { supabaseConfigurado } from '../lib/supabase';
import type { Rol } from '../lib/tipos';
import PanelLayout from '../layouts/PanelLayout.vue';

declare module 'vue-router' {
  interface RouteMeta {
    publica?: boolean;
    roles?: Rol[];
    titulo?: string;
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/sin-configurar', name: 'sin-configurar', component: () => import('../views/SinConfigurarView.vue'), meta: { publica: true } },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { publica: true } },
    // Llega aquí desde el correo de invitación / recuperación, o desde "Cambiar contraseña"
    { path: '/definir-contrasena', name: 'definir-contrasena', component: () => import('../views/DefinirContrasenaView.vue'), meta: { publica: true } },
    {
      path: '/',
      component: PanelLayout,
      children: [
        { path: '', name: 'inicio', component: { render: () => null } },
        { path: 'colegios', name: 'colegios', component: () => import('../views/ColegiosView.vue'), meta: { roles: ['superadmin', 'profesor'], titulo: 'Colegios' } },
        { path: 'usuarios', name: 'usuarios', component: () => import('../views/UsuariosView.vue'), meta: { roles: ['superadmin', 'profesor'], titulo: 'Usuarios' } },
        { path: 'invitacion/:id', name: 'invitacion', component: () => import('../views/EditorInvitacionView.vue'), props: true, meta: { titulo: 'Invitación' } },
        { path: 'invitacion/:id/confirmaciones', name: 'confirmaciones', component: () => import('../views/ConfirmacionesView.vue'), props: true, meta: { titulo: 'Confirmaciones' } },
        { path: 'invitacion/:id/mensajes', name: 'mensajes', component: () => import('../views/MensajesView.vue'), props: true, meta: { titulo: 'Libro de firmas' } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

/** Pantalla de inicio según el rol */
export function inicioSegunRol(): RouteLocationRaw {
  const { estado } = useSesion();
  switch (estado.perfil?.rol) {
    case 'superadmin':
      return { name: 'colegios' };
    case 'profesor':
      return { name: 'usuarios' };
    case 'alumno':
      return estado.invitacionId ? { name: 'invitacion', params: { id: estado.invitacionId } } : { name: 'login' };
    default:
      return { name: 'login' };
  }
}

router.beforeEach(async (to) => {
  if (!supabaseConfigurado) return to.name === 'sin-configurar' ? true : { name: 'sin-configurar' };

  await iniciarSesion();
  const { estado } = useSesion();

  if (to.meta.publica) return true;
  if (!estado.session) return { name: 'login', query: to.fullPath !== '/' ? { r: to.fullPath } : {} };
  if (!estado.perfil) return { name: 'login', query: { sinPerfil: '1' } };

  if (to.name === 'inicio') return inicioSegunRol();
  if (to.meta.roles && !to.meta.roles.includes(estado.perfil.rol)) return inicioSegunRol();
  return true;
});

export default router;
