<script setup lang="ts">
import Logo from '../components/Logo.vue';
</script>

<template>
  <div class="acceso">
    <div class="acceso__caja" style="max-width: 520px">
      <div class="acceso__logo">
        <Logo />
        <h1>Falta configurar</h1>
        <p>Conexión con Supabase</p>
      </div>
      <div class="form">
        <p style="margin: 0">
          Crea el archivo <code>.env.local</code> en <code>admin_invitacion/</code> (puedes copiar <code>.env.example</code>) con los datos de tu
          proyecto Supabase y reinicia <code>npm run dev</code>:
        </p>
        <pre class="alerta alerta--info mono" style="margin: 0; white-space: pre-wrap">VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_LANDING_URL=http://localhost:5173</pre>
        <p class="ayuda" style="margin: 0">Los pasos completos están en <code>README.md</code> de la carpeta del proyecto.</p>
      </div>
    </div>
  </div>
</template>
