<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import ModalBase from '../components/ModalBase.vue';
import SubirImagen from '../components/SubirImagen.vue';
import Icono from '../components/Icono.vue';
import { mensajeDeError, supabase } from '../lib/supabase';
import type { Colegio } from '../lib/tipos';
import { useSesion } from '../composables/useSesion';
import { useAvisos } from '../composables/useAvisos';

const { estado, esSuperadmin } = useSesion();
const avisos = useAvisos();

const colegios = ref<Colegio[]>([]);
const conteo = ref<Record<string, { alumnos: number; profesores: number }>>({});
const cargando = ref(true);

const vacio = (): Omit<Colegio, 'id'> & { id: string | null } => ({
  id: null,
  nombre: '',
  ciudad: '',
  fundacion: null,
  lema: '',
  escudo_url: null,
  color_primario: '#d2161e',
  color_secundario: '#121212',
});
const form = reactive(vacio());
const editando = ref(false);
const guardando = ref(false);

const visibles = computed(() =>
  esSuperadmin.value ? colegios.value : colegios.value.filter((c) => c.id === estado.perfil?.colegio_id),
);

async function cargar() {
  cargando.value = true;
  const [{ data, error }, { data: perfiles }] = await Promise.all([
    supabase.from('colegios').select('*').order('nombre'),
    supabase.from('perfiles').select('colegio_id, rol'),
  ]);
  if (error) avisos.error(await mensajeDeError(error));
  colegios.value = (data as Colegio[]) ?? [];
  const c: Record<string, { alumnos: number; profesores: number }> = {};
  for (const p of perfiles ?? []) {
    if (!p.colegio_id) continue;
    c[p.colegio_id] ??= { alumnos: 0, profesores: 0 };
    if (p.rol === 'alumno') c[p.colegio_id].alumnos++;
    if (p.rol === 'profesor') c[p.colegio_id].profesores++;
  }
  conteo.value = c;
  cargando.value = false;
}
onMounted(cargar);

function abrir(c?: Colegio) {
  Object.assign(form, c ? { ...c, lema: c.lema ?? '' } : vacio());
  editando.value = true;
}

async function guardar() {
  guardando.value = true;
  const datos = {
    nombre: form.nombre.trim(),
    ciudad: form.ciudad.trim(),
    fundacion: form.fundacion || null,
    lema: form.lema?.trim() || null,
    color_primario: form.color_primario,
    color_secundario: form.color_secundario,
  };
  const { data, error } = form.id
    ? await supabase.from('colegios').update(datos).eq('id', form.id).select().single()
    : await supabase.from('colegios').insert(datos).select().single();
  guardando.value = false;
  if (error) return avisos.error(await mensajeDeError(error));

  avisos.ok(form.id ? 'Colegio actualizado.' : 'Colegio creado. Ya puedes subir su escudo.');
  form.id = (data as Colegio).id; // tras crear, queda abierto para subir el escudo
  await cargar();
}

async function guardarEscudo(url: string) {
  if (!form.id) return;
  const { error } = await supabase.from('colegios').update({ escudo_url: url }).eq('id', form.id);
  if (error) return avisos.error(await mensajeDeError(error));
  form.escudo_url = url;
  avisos.ok('Escudo actualizado.');
  await cargar();
}

async function eliminar(c: Colegio) {
  if (!confirm(`¿Eliminar "${c.nombre}"? Solo es posible si no tiene profesores ni alumnos.`)) return;
  const { error } = await supabase.from('colegios').delete().eq('id', c.id);
  if (error) {
    return avisos.error(/foreign key/i.test(error.message) ? 'El colegio tiene usuarios o invitaciones; elimínalos primero.' : await mensajeDeError(error));
  }
  avisos.ok('Colegio eliminado.');
  await cargar();
}
</script>

<template>
  <div>
    <div class="cabecera">
      <div>
        <p class="cabecera__eyebrow">{{ esSuperadmin ? 'Superadmin' : 'Profesor' }}</p>
        <h1>{{ esSuperadmin ? 'Colegios' : 'Mi colegio' }}</h1>
      </div>
      <div v-if="esSuperadmin" class="cabecera__acciones">
        <button type="button" class="btn btn--primario" @click="abrir()"><Icono nombre="mas" /> Nuevo colegio</button>
      </div>
    </div>

    <div v-if="cargando" class="cargando"><span class="spinner" /></div>

    <div v-else-if="!visibles.length" class="tarjeta vacio">
      <strong>Aún no hay colegios</strong>
      Crea el primero para empezar a registrar profesores y alumnos.
    </div>

    <div v-else class="grilla">
      <article v-for="c in visibles" :key="c.id" class="tarjeta colegio">
        <div class="colegio__franja" :style="{ background: `linear-gradient(90deg, ${c.color_primario} 0 60%, ${c.color_secundario} 60%)` }" />
        <div class="tarjeta__cuerpo colegio__cuerpo">
          <img v-if="c.escudo_url" :src="c.escudo_url" alt="" class="colegio__escudo" />
          <div v-else class="colegio__escudo colegio__escudo--vacio">Sin escudo</div>
          <div class="colegio__info">
            <h2 class="tarjeta__titulo">{{ c.nombre }}</h2>
            <p class="sub">{{ c.ciudad }}<template v-if="c.fundacion"> · desde {{ c.fundacion }}</template></p>
            <p class="sub">{{ conteo[c.id]?.profesores ?? 0 }} profesores · {{ conteo[c.id]?.alumnos ?? 0 }} alumnos</p>
          </div>
        </div>
        <div class="colegio__acciones">
          <button type="button" class="btn btn--linea btn--chico" @click="abrir(c)"><Icono nombre="editar" /> Editar</button>
          <button v-if="esSuperadmin" type="button" class="btn btn--peligro btn--chico" @click="eliminar(c)"><Icono nombre="borrar" /> Eliminar</button>
        </div>
      </article>
    </div>

    <ModalBase v-if="editando" :titulo="form.id ? 'Editar colegio' : 'Nuevo colegio'" @cerrar="editando = false">
      <form id="form-colegio" class="campos" @submit.prevent="guardar">
        <div class="campo campo--ancho">
          <label for="c-nombre">Nombre</label>
          <input id="c-nombre" v-model="form.nombre" class="input" required minlength="3" maxlength="120" placeholder="Unidad Educativa…" />
        </div>
        <div class="campo">
          <label for="c-ciudad">Ciudad</label>
          <input id="c-ciudad" v-model="form.ciudad" class="input" maxlength="80" placeholder="Sucre – Bolivia" />
        </div>
        <div class="campo">
          <label for="c-fund">Año de fundación</label>
          <input id="c-fund" v-model.number="form.fundacion" class="input" type="number" min="1800" max="2100" />
        </div>
        <div class="campo campo--ancho">
          <label for="c-lema">Lema</label>
          <input id="c-lema" v-model="form.lema" class="input" maxlength="160" />
          <span class="ayuda">Se usa como lema por defecto en las invitaciones nuevas.</span>
        </div>
        <div class="campo">
          <label for="c-p">Color principal</label>
          <div class="fila"><input id="c-p" v-model="form.color_primario" type="color" class="color" /><span class="mono">{{ form.color_primario }}</span></div>
        </div>
        <div class="campo">
          <label for="c-s">Color secundario</label>
          <div class="fila"><input id="c-s" v-model="form.color_secundario" type="color" class="color" /><span class="mono">{{ form.color_secundario }}</span></div>
        </div>
        <div class="campo campo--ancho">
          <span class="etiqueta">Escudo</span>
          <SubirImagen v-if="form.id" tipo="escudo" :id="form.id" :url="form.escudo_url" @subida="guardarEscudo" />
          <span v-else class="ayuda">Guarda el colegio para poder subir su escudo.</span>
        </div>
      </form>
      <template #pie>
        <button type="button" class="btn btn--linea" @click="editando = false">Cerrar</button>
        <button type="submit" form="form-colegio" class="btn btn--primario" :disabled="guardando">
          {{ guardando ? 'Guardando…' : 'Guardar' }}
        </button>
      </template>
    </ModalBase>
  </div>
</template>

<style scoped>
.grilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
.colegio { overflow: hidden; display: flex; flex-direction: column; }
.colegio__franja { height: 6px; }
.colegio__cuerpo { display: flex; gap: 1rem; align-items: center; flex: 1; }
.colegio__escudo { width: 64px; height: 64px; border-radius: 50%; object-fit: contain; background: #fff; border: 1px solid var(--borde); flex-shrink: 0; }
.colegio__escudo--vacio { display: grid; place-items: center; font-size: 0.6rem; color: var(--texto-suave); text-align: center; }
.colegio__info { min-width: 0; }
.colegio__acciones { display: flex; gap: 0.5rem; padding: 0.8rem 1.4rem; border-top: 1px solid var(--borde); background: #fbfaf8; }
.color { width: 44px; height: 36px; padding: 2px; border: 1px solid var(--borde); border-radius: 8px; background: #fff; cursor: pointer; }
</style>
