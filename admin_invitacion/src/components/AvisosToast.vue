<script setup lang="ts">
import { useAvisos } from '../composables/useAvisos';
const { avisos, cerrar } = useAvisos();
</script>

<template>
  <div class="avisos" role="status" aria-live="polite">
    <div v-for="a in avisos" :key="a.id" class="aviso" :class="`aviso--${a.tipo}`">
      <span>{{ a.texto }}</span>
      <button type="button" aria-label="Cerrar" @click="cerrar(a.id)">×</button>
    </div>
  </div>
</template>
