<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';

defineProps<{ titulo: string; ancho?: string }>();
const emit = defineEmits<{ cerrar: [] }>();

const alPresionar = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('cerrar');
};
onMounted(() => document.addEventListener('keydown', alPresionar));
onBeforeUnmount(() => document.removeEventListener('keydown', alPresionar));
</script>

<template>
  <Teleport to="body">
    <div class="modal-fondo" @mousedown.self="emit('cerrar')">
      <div class="modal" role="dialog" aria-modal="true" :aria-label="titulo" :style="ancho ? { maxWidth: ancho } : undefined">
        <div class="modal__cabecera">
          <h2>{{ titulo }}</h2>
          <button type="button" class="cerrar" aria-label="Cerrar" @click="emit('cerrar')">×</button>
        </div>
        <div class="modal__cuerpo">
          <slot />
        </div>
        <div v-if="$slots.pie" class="modal__pie">
          <slot name="pie" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
