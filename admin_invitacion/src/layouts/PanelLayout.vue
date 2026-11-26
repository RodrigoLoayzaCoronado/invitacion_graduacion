<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Icono from '../components/Icono.vue';
import Logo from '../components/Logo.vue';
import { salir, useSesion } from '../composables/useSesion';
import { ROL_TEXTO } from '../lib/tipos';

const { estado } = useSesion();
const router = useRouter();

type Enlace = { a: object; texto: string; icono: string };

const enlaces = computed<Enlace[]>(() => {
  const p = estado.perfil;
  if (!p) return [];
  if (p.rol === 'superadmin')
    return [
      { a: { name: 'colegios' }, texto: 'Colegios', icono: 'colegio' },
      { a: { name: 'usuarios' }, texto: 'Usuarios', icono: 'usuarios' },
    ];
  if (p.rol === 'profesor')
    return [
      { a: { name: 'usuarios' }, texto: 'Alumnos', icono: 'usuarios' },
      { a: { name: 'colegios' }, texto: 'Mi colegio', icono: 'colegio' },
    ];
  const id = estado.invitacionId;
  if (!id) return [];
  return [
    { a: { name: 'invitacion', params: { id } }, texto: 'Mi invitación', icono: 'invitacion' },
    { a: { name: 'confirmaciones', params: { id } }, texto: 'Confirmaciones', icono: 'confirmaciones' },
    { a: { name: 'mensajes', params: { id } }, texto: 'Libro de firmas', icono: 'mensajes' },
  ];
});

async function cerrarSesion() {
  await salir();
  router.replace({ name: 'login' });
}
</script>

<template>
  <div class="panel">
    <aside class="lateral">
      <div class="marca">
        <Logo />
        <div>
          <div class="marca__titulo">Graduaciones</div>
          <div class="marca__sub">Panel NOVAMARK</div>
        </div>
      </div>

      <nav class="nav" aria-label="Principal">
        <RouterLink v-for="e in enlaces" :key="e.texto" :to="e.a" :title="e.texto">
          <Icono :nombre="e.icono" />
          <span>{{ e.texto }}</span>
        </RouterLink>
      </nav>

      <div class="usuario">
        <div class="usuario__nombre">{{ estado.perfil?.nombre }}</div>
        <div class="usuario__rol">{{ estado.perfil ? ROL_TEXTO[estado.perfil.rol] : '' }}</div>
        <div class="usuario__acciones">
          <RouterLink :to="{ name: 'definir-contrasena' }">Contraseña</RouterLink>
          <button type="button" title="Cerrar sesión" @click="cerrarSesion">Salir</button>
        </div>
      </div>
    </aside>

    <main class="principal">
      <RouterView :key="$route.fullPath" />
    </main>
  </div>
</template>
