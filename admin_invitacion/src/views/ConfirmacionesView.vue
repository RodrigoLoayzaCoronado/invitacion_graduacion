<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Icono from '../components/Icono.vue';
import { mensajeDeError, supabase } from '../lib/supabase';
import { formatearFecha } from '../lib/fecha';
import type { Confirmacion } from '../lib/tipos';
import { useAvisos } from '../composables/useAvisos';

const props = defineProps<{ id: string }>();
const avisos = useAvisos();

const lista = ref<Confirmacion[]>([]);
const graduado = ref('');
const slug = ref('');
const cargando = ref(true);

const totalPersonas = computed(() => lista.value.reduce((s, c) => s + c.personas, 0));

async function cargar() {
  cargando.value = true;
  const [{ data, error }, { data: inv }] = await Promise.all([
    supabase.from('confirmaciones').select('*').eq('invitacion_id', props.id).order('created_at', { ascending: false }),
    supabase.from('invitaciones').select('nombres, apellidos, slug').eq('id', props.id).maybeSingle(),
  ]);
  if (error) avisos.error(await mensajeDeError(error));
  lista.value = (data as Confirmacion[]) ?? [];
  graduado.value = inv ? `${inv.nombres} ${inv.apellidos}`.trim() : '';
  slug.value = inv?.slug ?? 'invitacion';
  cargando.value = false;
}
onMounted(cargar);

async function eliminar(c: Confirmacion) {
  if (!confirm(`¿Eliminar la confirmación de ${c.nombre}?`)) return;
  const { error } = await supabase.from('confirmaciones').delete().eq('id', c.id);
  if (error) return avisos.error(await mensajeDeError(error));
  lista.value = lista.value.filter((x) => x.id !== c.id);
}

function exportarCsv() {
  // Separador ";" y BOM UTF-8 para que Excel en español lo abra bien
  const celda = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const filas = [
    ['Nombre', 'Personas', 'Mensaje', 'Fecha'],
    ...lista.value.map((c) => [c.nombre, c.personas, c.mensaje, formatearFecha(c.created_at)]),
    ['TOTAL', totalPersonas.value, '', ''],
  ];
  const csv = '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `confirmaciones-${slug.value}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
</script>

<template>
  <div>
    <div class="cabecera">
      <div>
        <p class="cabecera__eyebrow">{{ graduado || 'Invitación' }}</p>
        <h1>Confirmaciones</h1>
      </div>
      <div class="cabecera__acciones">
        <button type="button" class="btn btn--linea" @click="cargar"><span>Actualizar</span></button>
        <button type="button" class="btn btn--negro" :disabled="!lista.length" @click="exportarCsv"><Icono nombre="descargar" /> Exportar a Excel</button>
      </div>
    </div>

    <div class="estadisticas">
      <div class="tarjeta estadistica">
        <div class="estadistica__valor">{{ totalPersonas }}</div>
        <div class="estadistica__label">Personas confirmadas</div>
      </div>
      <div class="tarjeta estadistica">
        <div class="estadistica__valor">{{ lista.length }}</div>
        <div class="estadistica__label">Confirmaciones</div>
      </div>
    </div>

    <div class="tarjeta">
      <div v-if="cargando" class="cargando"><span class="spinner" /></div>
      <div v-else-if="!lista.length" class="vacio">
        <strong>Aún no hay confirmaciones</strong>
        Comparte el enlace de tu invitación; aquí aparecerá cada respuesta.
      </div>
      <div v-else class="tabla-envoltura">
        <table class="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Personas</th>
              <th>Mensaje</th>
              <th class="oculto-movil">Fecha</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in lista" :key="c.id">
              <td><strong>{{ c.nombre }}</strong></td>
              <td>{{ c.personas }}</td>
              <td>{{ c.mensaje || '—' }}</td>
              <td class="oculto-movil sub">{{ formatearFecha(c.created_at) }}</td>
              <td>
                <div class="tabla__acciones">
                  <button type="button" class="btn btn--peligro btn--chico" title="Eliminar" @click="eliminar(c)"><Icono nombre="borrar" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
