<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Logo from '../components/Logo.vue';
import { ingresar, useSesion } from '../composables/useSesion';
import { inicioSegunRol } from '../router';
import { mensajeDeError, supabase } from '../lib/supabase';

const route = useRoute();
const router = useRouter();
const { estado } = useSesion();

const email = ref('');
const clave = ref('');
const cargando = ref(false);
const error = ref(route.query.sinPerfil ? 'Tu cuenta no tiene acceso al panel. Consulta con tu profesor.' : '');
const info = ref('');
const recuperando = ref(false);

async function enviar() {
  error.value = '';
  info.value = '';
  cargando.value = true;
  try {
    if (recuperando.value) {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
        redirectTo: `${location.origin}/definir-contrasena`,
      });
      if (err) throw err;
      info.value = 'Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.';
      return;
    }
    await ingresar(email.value.trim(), clave.value);
    if (!estado.perfil) {
      error.value = 'Tu cuenta no tiene acceso al panel. Consulta con tu profesor.';
      return;
    }
    const destino = typeof route.query.r === 'string' && route.query.r.startsWith('/') ? route.query.r : null;
    router.replace(destino ?? inicioSegunRol());
  } catch (e) {
    error.value = await mensajeDeError(e);
  } finally {
    cargando.value = false;
  }
}
</script>

<template>
  <div class="acceso">
    <div class="acceso__caja">
      <div class="acceso__logo">
        <Logo />
        <h1>Graduaciones</h1>
        <p>{{ recuperando ? 'Recuperar contraseña' : 'Ingresa a tu panel' }}</p>
      </div>

      <form class="form" @submit.prevent="enviar">
        <div v-if="error" class="alerta alerta--error">{{ error }}</div>
        <div v-if="info" class="alerta alerta--ok">{{ info }}</div>

        <div class="campo">
          <label for="email">Correo</label>
          <input id="email" v-model="email" class="input" type="email" autocomplete="email" required />
        </div>
        <div v-if="!recuperando" class="campo">
          <label for="clave">Contraseña</label>
          <input id="clave" v-model="clave" class="input" type="password" autocomplete="current-password" required />
        </div>

        <button type="submit" class="btn btn--primario btn--bloque" :disabled="cargando">
          {{ cargando ? 'Un momento…' : recuperando ? 'Enviar enlace' : 'Ingresar' }}
        </button>
        <div class="fila" style="justify-content: center">
          <button type="button" class="enlace" @click="(recuperando = !recuperando), (error = ''), (info = '')">
            {{ recuperando ? 'Volver a ingresar' : '¿Olvidaste tu contraseña?' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
