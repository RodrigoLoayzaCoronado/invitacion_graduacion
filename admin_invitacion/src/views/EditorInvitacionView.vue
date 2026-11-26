<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import Icono from '../components/Icono.vue';
import SubirImagen from '../components/SubirImagen.vue';
import EditorPrograma from '../components/EditorPrograma.vue';
import { LANDING_URL, mensajeDeError, supabase } from '../lib/supabase';
import { inputLocalAIso, isoAInputLocal } from '../lib/fecha';
import { COLUMNAS_EDITABLES, type Colegio, type Invitacion, type Momento } from '../lib/tipos';
import { useSesion } from '../composables/useSesion';
import { useAvisos } from '../composables/useAvisos';

const props = defineProps<{ id: string }>();
const { esAlumno } = useSesion();
const avisos = useAvisos();

const TABS = [
  { id: 'graduado', texto: 'Graduado' },
  { id: 'mensaje', texto: 'Mensaje' },
  { id: 'evento', texto: 'Evento' },
  { id: 'programa', texto: 'Programa' },
  { id: 'confirmacion', texto: 'Confirmación' },
  { id: 'publicar', texto: 'Publicar' },
] as const;
const tab = ref<(typeof TABS)[number]['id']>('graduado');

const cargando = ref(true);
const noEncontrada = ref(false);
const guardando = ref(false);

const inv = ref<Invitacion | null>(null);
const colegio = ref<Colegio | null>(null);
const form = reactive({} as Invitacion);
const fechaLocal = ref('');
const programa = ref<Momento[]>([]);

const instantanea = ref('');
const foto = () => JSON.stringify({ f: { ...form, fecha_evento: inputLocalAIso(fechaLocal.value) }, p: programa.value });
const sucio = computed(() => !cargando.value && foto() !== instantanea.value);

async function cargar() {
  cargando.value = true;
  const { data, error } = await supabase.from('invitaciones').select('*').eq('id', props.id).maybeSingle();
  if (error || !data) {
    noEncontrada.value = true;
    cargando.value = false;
    return;
  }
  inv.value = data as Invitacion;
  Object.assign(form, data);
  fechaLocal.value = isoAInputLocal(form.fecha_evento);

  const [{ data: prog }, { data: col }] = await Promise.all([
    supabase.from('programa').select('id, hora, titulo, lugar, direccion, mapa_url, icono').eq('invitacion_id', props.id).order('orden'),
    supabase.from('colegios').select('*').eq('id', form.colegio_id).maybeSingle(),
  ]);
  programa.value = ((prog as Momento[]) ?? []).map((m) => ({ ...m, hora: m.hora.slice(0, 5), mapa_url: m.mapa_url ?? '' }));
  colegio.value = col as Colegio | null;
  instantanea.value = foto();
  cargando.value = false;
}
onMounted(cargar);

// ---------- ruta (slug) ----------
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// Mismas palabras reservadas que public.slug_reservado() en la base de datos
const RESERVADOS = new Set(['admin', 'panel', 'login', 'api', 'assets', 'img', 'static', 'public', 'preview', 'novamark', 'invitacion', 'invitaciones', 'www', 'app', 'favicon', 'robots']);
const estadoSlug = ref<'ok' | 'ocupado' | 'invalido' | 'revisando'>('ok');
let temporizador: ReturnType<typeof setTimeout> | undefined;

const normalizarSlug = () => {
  form.slug = form.slug
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-');
};

watch(
  () => form.slug,
  (s) => {
    clearTimeout(temporizador);
    if (!inv.value || s === undefined) return;
    if (s === inv.value.slug) return void (estadoSlug.value = 'ok');
    if (!SLUG_RE.test(s) || s.length < 3 || s.length > 60) return void (estadoSlug.value = 'invalido');
    if (RESERVADOS.has(s)) return void (estadoSlug.value = 'ocupado');
    estadoSlug.value = 'revisando';
    temporizador = setTimeout(async () => {
      const { data } = await supabase.rpc('slug_disponible', { p_slug: s, p_invitacion: props.id });
      if (form.slug === s) estadoSlug.value = data ? 'ok' : 'ocupado';
    }, 400);
  },
);

// ---------- colores del dress code ----------
const agregarColor = () => form.dress_code_colores.length < 6 && form.dress_code_colores.push('#d2161e');
const quitarColor = (i: number) => form.dress_code_colores.splice(i, 1);

// ---------- guardar ----------
const pendientes = computed(() => {
  const p: string[] = [];
  if (!form.foto_url) p.push('Foto de perfil');
  if (!form.nombres?.trim()) p.push('Nombres');
  if (!fechaLocal.value) p.push('Fecha y hora del evento');
  if (!programa.value.length) p.push('Al menos un momento en el programa');
  if (!form.whatsapp) p.push('WhatsApp para confirmaciones (opcional)');
  return p;
});

function validarPrograma() {
  const i = programa.value.findIndex((m) => !m.hora || !m.titulo.trim());
  if (i >= 0) {
    tab.value = 'programa';
    throw new Error(`El momento ${i + 1} del programa necesita hora y título.`);
  }
  const j = programa.value.findIndex((m) => m.mapa_url && !/^https:\/\//.test(m.mapa_url));
  if (j >= 0) {
    tab.value = 'programa';
    throw new Error(`El enlace de mapa del momento ${j + 1} debe empezar con https://`);
  }
}

async function guardar(extra: Partial<Invitacion> = {}) {
  if (estadoSlug.value !== 'ok') {
    tab.value = 'publicar';
    return avisos.error('Revisa la dirección de la invitación antes de guardar.');
  }
  try {
    validarPrograma();
  } catch (e) {
    return avisos.error((e as Error).message);
  }

  guardando.value = true;
  try {
    const datos: Record<string, unknown> = {};
    for (const k of COLUMNAS_EDITABLES) datos[k] = form[k];
    Object.assign(datos, extra, {
      fecha_evento: inputLocalAIso(fechaLocal.value),
      whatsapp: form.whatsapp?.replace(/\D/g, '') || null,
      fecha_limite: form.fecha_limite || null,
    });

    const { data, error } = await supabase.from('invitaciones').update(datos).eq('id', props.id).select().single();
    if (error) throw error;

    const progAnterior = JSON.parse(instantanea.value).p;
    if (JSON.stringify(progAnterior) !== JSON.stringify(programa.value)) {
      const { error: e2 } = await supabase.rpc('guardar_programa', {
        p_invitacion: props.id,
        p_items: programa.value.map((m) => ({ ...m, mapa_url: m.mapa_url?.trim() || null })),
      });
      if (e2) throw e2;
    }

    inv.value = data as Invitacion;
    Object.assign(form, data);
    instantanea.value = foto();
    avisos.ok('Cambios guardados.');
  } catch (e) {
    avisos.error(await mensajeDeError(e));
  } finally {
    guardando.value = false;
  }
}

const publicar = () => guardar({ publicada: true });
const despublicar = () => guardar({ publicada: false });

async function guardarFoto(url: string) {
  const { error } = await supabase.from('invitaciones').update({ foto_url: url }).eq('id', props.id);
  if (error) return avisos.error(await mensajeDeError(error));
  form.foto_url = url;
  // la foto se guarda al instante: actualizar la instantánea para no marcar cambios pendientes
  const snap = JSON.parse(instantanea.value);
  snap.f.foto_url = url;
  instantanea.value = JSON.stringify(snap);
  avisos.ok('Foto actualizada.');
}

// ---------- enlaces ----------
const urlPublica = computed(() => (LANDING_URL && inv.value ? `${LANDING_URL}/${inv.value.slug}` : ''));
const urlPrevia = computed(() => (urlPublica.value ? `${urlPublica.value}?preview=${inv.value!.preview_token}` : ''));
const copiar = async (t: string) => {
  await navigator.clipboard.writeText(t);
  avisos.info('Enlace copiado.');
};

// ---------- salir sin guardar ----------
const avisarSalida = (e: BeforeUnloadEvent) => {
  if (sucio.value) e.preventDefault();
};
onMounted(() => window.addEventListener('beforeunload', avisarSalida));
onBeforeUnmount(() => window.removeEventListener('beforeunload', avisarSalida));
onBeforeRouteLeave(() => (sucio.value ? confirm('Tienes cambios sin guardar. ¿Salir de todas formas?') : true));
</script>

<template>
  <div>
    <div v-if="cargando" class="cargando"><span class="spinner" /></div>

    <div v-else-if="noEncontrada" class="tarjeta vacio">
      <strong>Invitación no encontrada</strong>
      No existe o no tienes permiso para verla.
    </div>

    <template v-else-if="inv">
      <div class="cabecera">
        <div>
          <p class="cabecera__eyebrow">{{ esAlumno ? 'Mi invitación' : 'Invitación de' }}</p>
          <h1>{{ [form.nombres, form.apellidos].filter(Boolean).join(' ') || 'Sin nombre' }}</h1>
          <div class="fila" style="margin-top: 0.5rem">
            <span class="chip" :class="inv.publicada ? 'chip--ok' : 'chip--borrador'">{{ inv.publicada ? 'Publicada' : 'Borrador' }}</span>
            <span v-if="sucio" class="chip chip--rojo">Cambios sin guardar</span>
          </div>
        </div>
        <div class="cabecera__acciones">
          <a v-if="urlPrevia" class="btn btn--linea" :href="inv.publicada ? urlPublica : urlPrevia" target="_blank" rel="noreferrer">
            <Icono nombre="ojo" /> {{ inv.publicada ? 'Ver invitación' : 'Vista previa' }}
          </a>
          <button type="button" class="btn btn--primario" :disabled="guardando || !sucio" @click="guardar()">
            {{ guardando ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </div>
      </div>

      <div class="tabs" role="tablist">
        <button v-for="t in TABS" :key="t.id" type="button" role="tab" :aria-selected="tab === t.id" @click="tab = t.id">{{ t.texto }}</button>
      </div>

      <form class="tarjeta" @submit.prevent="guardar()">
        <div class="tarjeta__cuerpo">
          <!-- GRADUADO -->
          <section v-show="tab === 'graduado'">
            <h2 class="tarjeta__titulo">Datos del graduado</h2>
            <p class="tarjeta__desc">Así aparecerás en la portada de la invitación.</p>
            <div class="campos">
              <div class="campo campo--ancho">
                <span class="etiqueta">Foto de perfil</span>
                <SubirImagen tipo="perfil" :id="inv.id" :url="form.foto_url" redonda texto-vacio="Sin foto" @subida="guardarFoto" />
              </div>
              <div class="campo">
                <label for="nombres">Nombres</label>
                <input id="nombres" v-model="form.nombres" class="input" maxlength="60" />
              </div>
              <div class="campo">
                <label for="apellidos">Apellidos</label>
                <input id="apellidos" v-model="form.apellidos" class="input" maxlength="60" />
              </div>
              <div class="campo">
                <label for="apodo">¿Cómo te dicen?</label>
                <input id="apodo" v-model="form.apodo" class="input" maxlength="30" placeholder="Seba" />
                <span class="ayuda">Firma del mensaje y título del libro de firmas.</span>
              </div>
              <div class="campo">
                <span class="etiqueta">Me presento como</span>
                <div class="segmento">
                  <button type="button" :aria-pressed="form.genero === 'masculino'" @click="form.genero = 'masculino'">Graduado</button>
                  <button type="button" :aria-pressed="form.genero === 'femenino'" @click="form.genero = 'femenino'">Graduada</button>
                  <button type="button" :aria-pressed="form.genero === 'neutro'" @click="form.genero = 'neutro'">Neutro</button>
                </div>
              </div>
              <div class="campo">
                <label for="titulo">Título</label>
                <input id="titulo" v-model="form.titulo" class="input" maxlength="80" placeholder="Bachiller en Humanidades" />
              </div>
              <div class="campo">
                <label for="promo">Promoción</label>
                <input id="promo" v-model="form.promocion" class="input" maxlength="40" placeholder="Promoción 2026" />
              </div>
            </div>
          </section>

          <!-- MENSAJE -->
          <section v-show="tab === 'mensaje'">
            <h2 class="tarjeta__titulo">Tu mensaje</h2>
            <p class="tarjeta__desc">Unas palabras para tus invitados y el lema que cierra la invitación.</p>
            <div class="campos">
              <div class="campo campo--ancho">
                <label for="mensaje">Mensaje</label>
                <textarea id="mensaje" v-model="form.mensaje" class="input" rows="6" maxlength="700" />
                <span class="ayuda">{{ form.mensaje.length }}/700</span>
              </div>
              <div class="campo campo--ancho">
                <label for="lema">Lema / frase final</label>
                <input id="lema" v-model="form.lema" class="input" maxlength="160" :placeholder="colegio?.lema ?? ''" />
              </div>
            </div>
          </section>

          <!-- EVENTO -->
          <section v-show="tab === 'evento'">
            <h2 class="tarjeta__titulo">Fecha y vestimenta</h2>
            <p class="tarjeta__desc">La fecha se usa para la cuenta regresiva (hora de Bolivia).</p>
            <div class="campos">
              <div class="campo">
                <label for="fecha">Fecha y hora de inicio</label>
                <input id="fecha" v-model="fechaLocal" class="input" type="datetime-local" />
              </div>
              <div class="campo">
                <label for="dc">Dress code</label>
                <input id="dc" v-model="form.dress_code_titulo" class="input" maxlength="40" placeholder="Formal / Gala" />
              </div>
              <div class="campo campo--ancho">
                <label for="dcd">Detalle del dress code</label>
                <textarea id="dcd" v-model="form.dress_code_detalle" class="input" rows="2" maxlength="240" />
              </div>
              <div class="campo campo--ancho">
                <span class="etiqueta">Colores sugeridos</span>
                <div class="fila">
                  <span v-for="(_, i) in form.dress_code_colores" :key="i" class="color-item">
                    <input v-model="form.dress_code_colores[i]" type="color" :aria-label="`Color ${i + 1}`" />
                    <button type="button" aria-label="Quitar color" @click="quitarColor(i)">×</button>
                  </span>
                  <button v-if="form.dress_code_colores.length < 6" type="button" class="btn btn--linea btn--chico" @click="agregarColor">
                    <Icono nombre="mas" /> Color
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- PROGRAMA -->
          <section v-show="tab === 'programa'">
            <h2 class="tarjeta__titulo">Programa del día</h2>
            <p class="tarjeta__desc">Cada momento aparece en la línea de tiempo con su botón de ubicación.</p>
            <EditorPrograma v-model="programa" />
          </section>

          <!-- CONFIRMACIÓN -->
          <section v-show="tab === 'confirmacion'">
            <h2 class="tarjeta__titulo">Confirmación de asistencia</h2>
            <p class="tarjeta__desc">
              Las confirmaciones siempre se guardan en tu panel. Si agregas un WhatsApp, además se abrirá un chat contigo.
            </p>
            <div class="campos">
              <div class="campo">
                <label for="wa">WhatsApp</label>
                <div class="input-grupo">
                  <span class="input-grupo__prefijo">+</span>
                  <input id="wa" v-model="form.whatsapp" class="input" inputmode="numeric" maxlength="15" placeholder="59170000000" />
                </div>
                <span class="ayuda">Con código de país, sin espacios (Bolivia: 591…).</span>
              </div>
              <div class="campo">
                <label for="limite">Confirmar hasta</label>
                <input id="limite" v-model="form.fecha_limite" class="input" type="date" />
              </div>
            </div>
          </section>

          <!-- PUBLICAR -->
          <section v-show="tab === 'publicar'">
            <h2 class="tarjeta__titulo">Dirección y publicación</h2>
            <p class="tarjeta__desc">Mientras esté en borrador, solo tú ves la invitación con el enlace de vista previa.</p>
            <div class="campos">
              <div class="campo campo--ancho">
                <label for="slug">Dirección de tu invitación</label>
                <div class="input-grupo">
                  <span class="input-grupo__prefijo">{{ (LANDING_URL || 'invitacion').replace(/^https?:\/\//, '') }}/</span>
                  <input
                    id="slug"
                    v-model="form.slug"
                    class="input"
                    :class="{ 'input--error': estadoSlug === 'ocupado' || estadoSlug === 'invalido' }"
                    maxlength="60"
                    @input="normalizarSlug"
                  />
                </div>
                <span v-if="estadoSlug === 'ocupado'" class="ayuda ayuda--error">Esa dirección no está disponible.</span>
                <span v-else-if="estadoSlug === 'invalido'" class="ayuda ayuda--error">Usa de 3 a 60 letras minúsculas, números y guiones.</span>
                <span v-else-if="estadoSlug === 'revisando'" class="ayuda">Revisando…</span>
                <span v-else-if="form.slug !== inv.slug" class="ayuda ayuda--ok">¡Disponible! Guarda para aplicarla.</span>
              </div>
            </div>

            <div v-if="pendientes.length" class="alerta alerta--info mt">
              <strong>Antes de publicar, revisa:</strong>
              <ul class="pendientes">
                <li v-for="p in pendientes" :key="p">{{ p }}</li>
              </ul>
            </div>

            <div v-if="urlPublica" class="enlaces mt">
              <div class="enlace-fila">
                <span class="etiqueta">Enlace público</span>
                <span class="mono">{{ urlPublica }}</span>
                <button type="button" class="btn btn--linea btn--chico" :disabled="!inv.publicada" @click="copiar(urlPublica)"><Icono nombre="copiar" /> Copiar</button>
              </div>
              <div class="enlace-fila">
                <span class="etiqueta">Vista previa (privada)</span>
                <span class="mono">{{ urlPrevia }}</span>
                <button type="button" class="btn btn--linea btn--chico" @click="copiar(urlPrevia)"><Icono nombre="copiar" /> Copiar</button>
              </div>
            </div>

            <div class="fila mt">
              <button v-if="!inv.publicada" type="button" class="btn btn--primario" :disabled="guardando" @click="publicar">
                <Icono nombre="ojo" /> Guardar y publicar
              </button>
              <button v-else type="button" class="btn btn--peligro" :disabled="guardando" @click="despublicar">
                <Icono nombre="ojoNo" /> Ocultar invitación
              </button>
            </div>
          </section>
        </div>
      </form>
    </template>
  </div>
</template>

<style scoped>
.color-item { position: relative; display: inline-flex; }
.color-item input { width: 44px; height: 44px; padding: 2px; border: 1px solid var(--borde); border-radius: 50%; background: #fff; cursor: pointer; }
.color-item input::-webkit-color-swatch-wrapper { padding: 0; }
.color-item input::-webkit-color-swatch { border: 0; border-radius: 50%; }
.color-item button { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 50%; border: 0; background: var(--negro); color: #fff; font-size: 0.8rem; line-height: 1; cursor: pointer; }
.pendientes { margin: 0.4rem 0 0; padding-left: 1.2rem; }
.enlaces { display: flex; flex-direction: column; gap: 0.6rem; }
.enlace-fila { display: grid; grid-template-columns: 170px minmax(0, 1fr) auto; align-items: center; gap: 0.8rem; padding: 0.7rem 0.9rem; border: 1px solid var(--borde); border-radius: 10px; background: #fcfbfa; }
@media (max-width: 640px) { .enlace-fila { grid-template-columns: 1fr; } }
</style>
