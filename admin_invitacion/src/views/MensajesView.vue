<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Icono from '../components/Icono.vue';
import { mensajeDeError, supabase } from '../lib/supabase';
import { formatearFecha } from '../lib/fecha';
import type { MensajeMuro } from '../lib/tipos';
import { useAvisos } from '../composables/useAvisos';

const props = defineProps<{ id: string }>();
const avisos = useAvisos();

const lista = ref<MensajeMuro[]>([]);
const graduado = ref('');
const cargando = ref(true);
const ocultos = computed(() => lista.value.filter((m) => !m.visible).length);

async function cargar() {
  cargando.value = true;
  const [{ data, error }, { data: inv }] = await Promise.all([
    supabase.from('mensajes').select('*').eq('invitacion_id', props.id).order('created_at', { ascending: false }),
    supabase.from('invitaciones').select('nombres, apellidos').eq('id', props.id).maybeSingle(),
  ]);
  if (error) avisos.error(await mensajeDeError(error));
  lista.value = (data as MensajeMuro[]) ?? [];
  graduado.value = inv ? `${inv.nombres} ${inv.apellidos}`.trim() : '';
  cargando.value = false;
}
onMounted(cargar);

async function alternar(m: MensajeMuro) {
  const { error } = await supabase.from('mensajes').update({ visible: !m.visible }).eq('id', m.id);
  if (error) return avisos.error(await mensajeDeError(error));
  m.visible = !m.visible;
  avisos.info(m.visible ? 'Mensaje visible en la invitación.' : 'Mensaje oculto.');
}

async function eliminar(m: MensajeMuro) {
  if (!confirm(`¿Eliminar el mensaje de ${m.nombre}?`)) return;
  const { error } = await supabase.from('mensajes').delete().eq('id', m.id);
  if (error) return avisos.error(await mensajeDeError(error));
  lista.value = lista.value.filter((x) => x.id !== m.id);
}
</script>

<template>
  <div>
    <div class="cabecera">
      <div>
        <p class="cabecera__eyebrow">{{ graduado || 'Invitación' }}</p>
        <h1>Libro de firmas</h1>
      </div>
      <div class="cabecera__acciones">
        <button type="button" class="btn btn--linea" @click="cargar">Actualizar</button>
      </div>
    </div>

    <p class="ayuda" style="margin: -0.8rem 0 1.2rem">
      Los mensajes se publican al instante. Puedes ocultar o eliminar los que no quieras mostrar.
      <template v-if="ocultos"> · {{ ocultos }} oculto(s)</template>
    </p>

    <div v-if="cargando" class="cargando"><span class="spinner" /></div>
    <div v-else-if="!lista.length" class="tarjeta vacio">
      <strong>Aún no hay mensajes</strong>
      Cuando tus invitados firmen el libro, aparecerán aquí.
    </div>
    <div v-else class="grilla">
      <article v-for="m in lista" :key="m.id" class="tarjeta nota" :class="{ 'nota--oculta': !m.visible }">
        <div class="tarjeta__cuerpo">
          <p class="nota__texto">“{{ m.texto }}”</p>
          <p class="nota__autor">— {{ m.nombre }}</p>
          <span class="sub">{{ formatearFecha(m.created_at) }}</span>
        </div>
        <div class="nota__acciones">
          <span class="chip" :class="m.visible ? 'chip--ok' : 'chip--neutro'">{{ m.visible ? 'Visible' : 'Oculto' }}</span>
          <div class="fila">
            <button type="button" class="btn btn--linea btn--chico" @click="alternar(m)">
              <Icono :nombre="m.visible ? 'ojoNo' : 'ojo'" /> {{ m.visible ? 'Ocultar' : 'Mostrar' }}
            </button>
            <button type="button" class="btn btn--peligro btn--chico" title="Eliminar" @click="eliminar(m)"><Icono nombre="borrar" /></button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.grilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
.nota { display: flex; flex-direction: column; }
.nota .tarjeta__cuerpo { flex: 1; }
.nota--oculta { opacity: 0.55; }
.nota__texto { margin: 0 0 0.6rem; font-style: italic; line-height: 1.5; }
.nota__autor { margin: 0; font-family: var(--f-script); font-size: 1.5rem; color: var(--rojo); }
.nota__acciones { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 0.7rem 1.4rem; border-top: 1px solid var(--borde); background: #fbfaf8; }
</style>
