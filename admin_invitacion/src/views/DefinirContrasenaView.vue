<script setup lang="ts">
// Se usa en 3 casos: enlace de invitación (primer ingreso), enlace de recuperación y "Cambiar contraseña".
// supabase-js detecta automáticamente el token del enlace en la URL y abre la sesión.
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Logo from '../components/Logo.vue';
import { iniciarSesion, useSesion } from '../composables/useSesion';
import { inicioSegunRol } from '../router';
import { mensajeDeError, supabase } from '../lib/supabase';
import { useAvisos } from '../composables/useAvisos';

const router = useRouter();
const { estado } = useSesion();
const avisos = useAvisos();

const clave = ref('');
const repetir = ref('');
const guardando = ref(false);
const error = ref('');
const listo = ref(false);

const valida = computed(() => clave.value.length >= 8 && clave.value === repetir.value);

onMounted(async () => {
  await iniciarSesion();
  // Esperar a que supabase-js procese el token del enlace (si lo hay)
  if (!estado.session) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) error.value = 'El enlace no es válido o ya venció. Pide uno nuevo desde “¿Olvidaste tu contraseña?”.';
  }
  listo.value = true;
});

async function guardar() {
  if (!valida.value) return;
  guardando.value = true;
  error.value = '';
  try {
    const { error: err } = await supabase.auth.updateUser({ password: clave.value });
    if (err) throw err;
    avisos.ok('Contraseña guardada.');
    // dar tiempo a que la sesión cargue el perfil
    await new Promise((r) => setTimeout(r, 300));
    router.replace(estado.perfil ? inicioSegunRol() : { name: 'login' });
  } catch (e) {
    error.value = await mensajeDeError(e);
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <div class="acceso">
    <div class="acceso__caja">
      <div class="acceso__logo">
        <Logo />
        <h1>Tu contraseña</h1>
        <p>Mínimo 8 caracteres</p>
      </div>

      <div v-if="!listo" class="cargando"><span class="spinner" /></div>
      <form v-else class="form" @submit.prevent="guardar">
        <div v-if="error" class="alerta alerta--error">{{ error }}</div>
        <template v-if="estado.session">
          <div class="alerta alerta--info">Cuenta: {{ estado.session.user.email }}</div>
          <div class="campo">
            <label for="nueva">Nueva contraseña</label>
            <input id="nueva" v-model="clave" class="input" type="password" autocomplete="new-password" minlength="8" required />
          </div>
          <div class="campo">
            <label for="repetir">Repite la contraseña</label>
            <input
              id="repetir"
              v-model="repetir"
              class="input"
              :class="{ 'input--error': repetir && repetir !== clave }"
              type="password"
              autocomplete="new-password"
              required
            />
            <span v-if="repetir && repetir !== clave" class="ayuda ayuda--error">No coinciden</span>
          </div>
          <button type="submit" class="btn btn--primario btn--bloque" :disabled="!valida || guardando">
            {{ guardando ? 'Guardando…' : 'Guardar contraseña' }}
          </button>
        </template>
        <RouterLink :to="estado.perfil ? inicioSegunRol() : { name: 'login' }" class="enlace" style="text-align: center">
          {{ estado.perfil ? 'Volver al panel' : 'Ir a ingresar' }}
        </RouterLink>
      </form>
    </div>
  </div>
</template>
