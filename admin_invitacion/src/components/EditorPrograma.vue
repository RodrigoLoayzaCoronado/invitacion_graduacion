<script setup lang="ts">
import Icono from './Icono.vue';
import { ICONOS_MOMENTO, type Momento } from '../lib/tipos';

const items = defineModel<Momento[]>({ required: true });
const MAX = 8;

const agregar = () =>
  items.value.push({ hora: '', titulo: '', lugar: '', direccion: '', mapa_url: '', icono: 'birrete' });

const quitar = (i: number) => items.value.splice(i, 1);

const mover = (i: number, d: -1 | 1) => {
  const j = i + d;
  if (j < 0 || j >= items.value.length) return;
  const copia = [...items.value];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  items.value = copia;
};

const urlMapa = (m: Momento) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([m.lugar, m.direccion].filter(Boolean).join(', '))}`;

const ordenarPorHora = () => {
  items.value = [...items.value].sort((a, b) => a.hora.localeCompare(b.hora));
};
</script>

<template>
  <div class="programa">
    <div v-if="!items.length" class="vacio">
      <strong>Sin momentos todavía</strong>
      Agrega la misa, el acto de graduación, la fiesta…
    </div>

    <div v-for="(m, i) in items" :key="i" class="momento">
      <div class="momento__orden">
        <span class="momento__num">{{ i + 1 }}</span>
        <button type="button" class="btn btn--linea btn--icono btn--chico" :disabled="i === 0" title="Subir" @click="mover(i, -1)"><Icono nombre="arriba" /></button>
        <button type="button" class="btn btn--linea btn--icono btn--chico" :disabled="i === items.length - 1" title="Bajar" @click="mover(i, 1)"><Icono nombre="abajo" /></button>
      </div>
      <div class="campos">
        <div class="campo">
          <label :for="`m-hora-${i}`">Hora</label>
          <input :id="`m-hora-${i}`" v-model="m.hora" class="input" type="time" required />
        </div>
        <div class="campo">
          <label :for="`m-ico-${i}`">Ícono</label>
          <select :id="`m-ico-${i}`" v-model="m.icono" class="input">
            <option v-for="o in ICONOS_MOMENTO" :key="o.valor" :value="o.valor">{{ o.texto }}</option>
          </select>
        </div>
        <div class="campo campo--ancho">
          <label :for="`m-tit-${i}`">Título</label>
          <input :id="`m-tit-${i}`" v-model="m.titulo" class="input" maxlength="80" required placeholder="Acto de Graduación" />
        </div>
        <div class="campo">
          <label :for="`m-lug-${i}`">Lugar</label>
          <input :id="`m-lug-${i}`" v-model="m.lugar" class="input" maxlength="100" placeholder="Coliseo del colegio" />
        </div>
        <div class="campo">
          <label :for="`m-dir-${i}`">Dirección</label>
          <input :id="`m-dir-${i}`" v-model="m.direccion" class="input" maxlength="140" placeholder="Calle, zona, ciudad" />
        </div>
        <div class="campo campo--ancho">
          <label :for="`m-map-${i}`">Enlace de Google Maps</label>
          <div class="fila" style="flex-wrap: nowrap">
            <input :id="`m-map-${i}`" v-model="m.mapa_url" class="input" type="url" pattern="https://.*" maxlength="500" placeholder="https://maps.app.goo.gl/…" />
            <button
              type="button"
              class="btn btn--linea btn--chico"
              :disabled="!m.lugar && !m.direccion"
              title="Generar desde el lugar y la dirección"
              @click="m.mapa_url = urlMapa(m)"
            >
              <Icono nombre="mapa" /> Generar
            </button>
          </div>
          <span class="ayuda">Pega el enlace “Compartir” de Google Maps, o genéralo desde el lugar y la dirección.</span>
        </div>
      </div>
      <button type="button" class="btn btn--peligro btn--icono btn--chico momento__quitar" title="Quitar" @click="quitar(i)"><Icono nombre="borrar" /></button>
    </div>

    <div class="fila mt">
      <button type="button" class="btn btn--negro" :disabled="items.length >= MAX" @click="agregar"><Icono nombre="mas" /> Agregar momento</button>
      <button v-if="items.length > 1" type="button" class="btn btn--linea" @click="ordenarPorHora">Ordenar por hora</button>
    </div>
  </div>
</template>

<style scoped>
.momento { position: relative; display: grid; grid-template-columns: auto 1fr; gap: 1rem; padding: 1.2rem 3rem 1.2rem 1rem; border: 1px solid var(--borde); border-radius: var(--radio); background: #fcfbfa; margin-bottom: 0.9rem; }
.momento__orden { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; }
.momento__num { width: 28px; height: 28px; border-radius: 50%; background: var(--negro); color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 0.8rem; }
.momento__quitar { position: absolute; top: 0.8rem; right: 0.8rem; }
@media (max-width: 560px) {
  .momento { grid-template-columns: 1fr; padding-right: 1rem; }
  .momento__orden { flex-direction: row; }
}
</style>
