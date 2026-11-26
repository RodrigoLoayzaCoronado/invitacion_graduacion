<script setup lang="ts">
// Selector de imagen con recorte cuadrado (fotos de perfil) o ajuste completo (escudos).
// Procesa la imagen en el navegador, la sube a R2 y emite la URL pública.
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import ModalBase from './ModalBase.vue';
import Icono from './Icono.vue';
import { cargarImagen, exportarAjustada, exportarRecorte } from '../lib/imagen';
import { subirImagen, type TipoImagen } from '../lib/subida';
import { useAvisos } from '../composables/useAvisos';

const props = defineProps<{
  tipo: TipoImagen;
  id: string;
  url: string | null;
  redonda?: boolean;
  textoVacio?: string;
}>();
const emit = defineEmits<{ subida: [url: string] }>();

const avisos = useAvisos();
const input = ref<HTMLInputElement>();
const subiendo = ref(false);
const MAX_MB = 15;

// --- recortador ---
const VISOR = 280;
const img = ref<HTMLImageElement | null>(null);
const vista = reactive({ zoom: 1, x: 0, y: 0 });
let arrastre: { px: number; py: number; x: number; y: number } | null = null;

const escalaBase = computed(() => (img.value ? VISOR / Math.min(img.value.naturalWidth, img.value.naturalHeight) : 1));
const escala = computed(() => escalaBase.value * vista.zoom);

function limitar() {
  if (!img.value) return;
  const w = img.value.naturalWidth * escala.value;
  const h = img.value.naturalHeight * escala.value;
  vista.x = Math.min(0, Math.max(VISOR - w, vista.x));
  vista.y = Math.min(0, Math.max(VISOR - h, vista.y));
}

function centrar() {
  if (!img.value) return;
  vista.x = (VISOR - img.value.naturalWidth * escala.value) / 2;
  vista.y = (VISOR - img.value.naturalHeight * escala.value) / 2;
}

function cambiarZoom(nuevo: number) {
  // Mantiene el centro del visor al hacer zoom
  const c = VISOR / 2;
  const fx = (c - vista.x) / escala.value;
  const fy = (c - vista.y) / escala.value;
  vista.zoom = nuevo;
  vista.x = c - fx * escala.value;
  vista.y = c - fy * escala.value;
  limitar();
}

const inicioArrastre = (e: PointerEvent) => {
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
  arrastre = { px: e.clientX, py: e.clientY, x: vista.x, y: vista.y };
};
const moverArrastre = (e: PointerEvent) => {
  if (!arrastre) return;
  vista.x = arrastre.x + (e.clientX - arrastre.px);
  vista.y = arrastre.y + (e.clientY - arrastre.py);
  limitar();
};
const finArrastre = () => (arrastre = null);

function cerrarRecortador() {
  if (img.value) URL.revokeObjectURL(img.value.src);
  img.value = null;
}
onBeforeUnmount(cerrarRecortador);

async function alElegir(e: Event) {
  const archivo = (e.target as HTMLInputElement).files?.[0];
  (e.target as HTMLInputElement).value = '';
  if (!archivo) return;
  if (!archivo.type.startsWith('image/')) return avisos.error('El archivo debe ser una imagen.');
  if (archivo.size > MAX_MB * 1024 * 1024) return avisos.error(`La imagen supera los ${MAX_MB} MB.`);

  try {
    const cargada = await cargarImagen(archivo);
    if (props.tipo === 'escudo') {
      const blob = await exportarAjustada(cargada);
      URL.revokeObjectURL(cargada.src);
      await subir(blob);
    } else {
      img.value = cargada;
      vista.zoom = 1;
      centrar();
    }
  } catch (err) {
    avisos.error((err as Error).message);
  }
}

async function confirmarRecorte() {
  if (!img.value) return;
  const lado = VISOR / escala.value;
  const blob = await exportarRecorte(img.value, { sx: -vista.x / escala.value, sy: -vista.y / escala.value, lado });
  cerrarRecortador();
  await subir(blob);
}

async function subir(blob: Blob) {
  subiendo.value = true;
  try {
    const url = await subirImagen(props.tipo, props.id, blob);
    emit('subida', url);
  } catch (err) {
    avisos.error((err as Error).message);
  } finally {
    subiendo.value = false;
  }
}
</script>

<template>
  <div class="subir">
    <div class="subir__preview" :class="{ 'subir__preview--redonda': redonda }">
      <img v-if="url" :src="url" alt="" />
      <span v-else class="subir__vacio">{{ textoVacio ?? 'Sin imagen' }}</span>
      <span v-if="subiendo" class="subir__capa"><span class="spinner" /></span>
    </div>
    <div class="subir__acciones">
      <button type="button" class="btn btn--linea btn--chico" :disabled="subiendo" @click="input?.click()">
        <Icono nombre="subir" /> {{ url ? 'Cambiar' : 'Subir imagen' }}
      </button>
      <span class="ayuda">JPG, PNG o WebP · máx. {{ MAX_MB }} MB</span>
    </div>
    <input ref="input" type="file" accept="image/*" hidden @change="alElegir" />

    <ModalBase v-if="img" titulo="Ajusta la foto" ancho="380px" @cerrar="cerrarRecortador">
      <div
        class="recorte"
        :style="{ width: VISOR + 'px', height: VISOR + 'px' }"
        @pointerdown="inicioArrastre"
        @pointermove="moverArrastre"
        @pointerup="finArrastre"
        @pointercancel="finArrastre"
      >
        <img
          :src="img.src"
          alt=""
          draggable="false"
          :style="{
            width: img.naturalWidth * escala + 'px',
            height: img.naturalHeight * escala + 'px',
            transform: `translate(${vista.x}px, ${vista.y}px)`,
          }"
        />
        <span class="recorte__guia" />
      </div>
      <label class="campo mt">
        <span class="etiqueta">Zoom</span>
        <input type="range" min="1" max="3" step="0.01" :value="vista.zoom" @input="cambiarZoom(Number(($event.target as HTMLInputElement).value))" />
      </label>
      <p class="ayuda">Arrastra la imagen para encuadrarla.</p>
      <template #pie>
        <button type="button" class="btn btn--linea" @click="cerrarRecortador">Cancelar</button>
        <button type="button" class="btn btn--primario" @click="confirmarRecorte">Usar foto</button>
      </template>
    </ModalBase>
  </div>
</template>

<style scoped>
.subir { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.subir__preview { position: relative; width: 96px; height: 96px; border-radius: 12px; overflow: hidden; background: var(--fondo); border: 1px dashed var(--plata); display: grid; place-items: center; flex-shrink: 0; }
.subir__preview--redonda { border-radius: 50%; }
.subir__preview img { width: 100%; height: 100%; object-fit: cover; }
.subir__vacio { font-size: 0.7rem; color: var(--texto-suave); text-align: center; padding: 0.4rem; }
.subir__capa { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(255, 255, 255, 0.75); }
.subir__acciones { display: flex; flex-direction: column; gap: 0.35rem; align-items: flex-start; }

.recorte { position: relative; margin: 0 auto; overflow: hidden; border-radius: 12px; background: #000; cursor: grab; touch-action: none; user-select: none; }
.recorte:active { cursor: grabbing; }
.recorte img { position: absolute; top: 0; left: 0; max-width: none; pointer-events: none; }
.recorte__guia { position: absolute; inset: 0; border-radius: 50%; box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.45); border: 2px solid rgba(255, 255, 255, 0.85); pointer-events: none; }
</style>
