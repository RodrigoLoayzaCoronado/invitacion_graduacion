<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import ModalBase from '../components/ModalBase.vue';
import Icono from '../components/Icono.vue';
import { gestionarUsuarios, LANDING_URL, mensajeDeError, supabase } from '../lib/supabase';
import { ROL_TEXTO, type Colegio, type Perfil, type Rol } from '../lib/tipos';
import { useSesion } from '../composables/useSesion';
import { useAvisos } from '../composables/useAvisos';

type InvResumen = { id: string; alumno_id: string; slug: string; publicada: boolean; foto_url: string | null };

const { estado, esSuperadmin } = useSesion();
const avisos = useAvisos();

const perfiles = ref<Perfil[]>([]);
const invitaciones = ref<Record<string, InvResumen>>({});
const asistentes = ref<Record<string, number>>({});
const colegios = ref<Colegio[]>([]);
const cargando = ref(true);

const filtro = reactive({ texto: '', colegio: '', rol: '' as '' | Rol });

const nombreColegio = (id: string | null) => colegios.value.find((c) => c.id === id)?.nombre ?? '—';

const lista = computed(() => {
  const t = filtro.texto.trim().toLowerCase();
  return perfiles.value
    .filter((p) => p.id !== estado.perfil?.id)
    .filter((p) => (esSuperadmin.value ? true : p.rol === 'alumno'))
    .filter((p) => !filtro.colegio || p.colegio_id === filtro.colegio)
    .filter((p) => !filtro.rol || p.rol === filtro.rol)
    .filter((p) => !t || p.nombre.toLowerCase().includes(t) || p.email.toLowerCase().includes(t));
});

async function cargar() {
  cargando.value = true;
  const [per, inv, conf, col] = await Promise.all([
    supabase.from('perfiles').select('id, rol, nombre, email, colegio_id, created_at').order('nombre'),
    supabase.from('invitaciones').select('id, alumno_id, slug, publicada, foto_url'),
    supabase.from('confirmaciones').select('invitacion_id, personas'),
    supabase.from('colegios').select('*').order('nombre'),
  ]);
  const err = per.error ?? inv.error ?? conf.error ?? col.error;
  if (err) avisos.error(await mensajeDeError(err));

  perfiles.value = (per.data as Perfil[]) ?? [];
  invitaciones.value = Object.fromEntries(((inv.data as InvResumen[]) ?? []).map((i) => [i.alumno_id, i]));
  const a: Record<string, number> = {};
  for (const c of conf.data ?? []) a[c.invitacion_id] = (a[c.invitacion_id] ?? 0) + c.personas;
  asistentes.value = a;
  colegios.value = (col.data as Colegio[]) ?? [];
  cargando.value = false;
}
onMounted(cargar);

// ---------- crear ----------
const creando = ref(false);
const enviando = ref(false);
const nuevo = reactive({
  rol: 'alumno' as 'alumno' | 'profesor',
  nombres: '',
  apellidos: '',
  email: '',
  colegio_id: '',
  promocion: new Date().getFullYear(),
  modo: 'correo' as 'correo' | 'clave',
  clave: '',
});
const resultado = ref<{ email: string; clave?: string; modo: string; slug?: string; nombre: string } | null>(null);

const generarClave = () => {
  const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = crypto.getRandomValues(new Uint32Array(10));
  nuevo.clave = Array.from(r, (n) => abc[n % abc.length]).join('');
};

function abrirCrear() {
  Object.assign(nuevo, {
    rol: 'alumno',
    nombres: '',
    apellidos: '',
    email: '',
    colegio_id: esSuperadmin.value ? (filtro.colegio || colegios.value[0]?.id || '') : (estado.perfil?.colegio_id ?? ''),
    promocion: new Date().getFullYear(),
    modo: 'correo',
    clave: '',
  });
  creando.value = true;
}

async function crear() {
  enviando.value = true;
  try {
    const r = await gestionarUsuarios<{ usuario: { nombre: string }; invitacion: { slug: string } | null }>({
      accion: 'crear',
      ...nuevo,
    });
    resultado.value = {
      email: nuevo.email.trim().toLowerCase(),
      clave: nuevo.modo === 'clave' ? nuevo.clave : undefined,
      modo: nuevo.modo,
      slug: r.invitacion?.slug,
      nombre: r.usuario.nombre,
    };
    creando.value = false;
    await cargar();
  } catch (e) {
    avisos.error((e as Error).message);
  } finally {
    enviando.value = false;
  }
}

// ---------- contraseña ----------
const cambiandoClave = ref<Perfil | null>(null);
const nuevaClave = ref('');
async function cambiarClave() {
  if (!cambiandoClave.value) return;
  enviando.value = true;
  try {
    await gestionarUsuarios({ accion: 'cambiar_clave', usuario_id: cambiandoClave.value.id, clave: nuevaClave.value });
    avisos.ok(`Contraseña actualizada para ${cambiandoClave.value.nombre}. Compártela de forma privada.`);
    cambiandoClave.value = null;
  } catch (e) {
    avisos.error((e as Error).message);
  } finally {
    enviando.value = false;
  }
}

// ---------- eliminar ----------
async function eliminar(p: Perfil) {
  const extra = p.rol === 'alumno' ? ' Se borrarán también su invitación, confirmaciones y mensajes.' : '';
  if (!confirm(`¿Eliminar a ${p.nombre}?${extra} Esta acción no se puede deshacer.`)) return;
  try {
    await gestionarUsuarios({ accion: 'eliminar', usuario_id: p.id });
    avisos.ok('Usuario eliminado.');
    await cargar();
  } catch (e) {
    avisos.error((e as Error).message);
  }
}

// ---------- publicar / despublicar ----------
async function alternarPublicada(inv: InvResumen) {
  const { error } = await supabase.from('invitaciones').update({ publicada: !inv.publicada }).eq('id', inv.id);
  if (error) return avisos.error(await mensajeDeError(error));
  inv.publicada = !inv.publicada;
  avisos.ok(inv.publicada ? 'Invitación publicada.' : 'Invitación oculta al público.');
}

const copiar = async (t: string) => {
  await navigator.clipboard.writeText(t);
  avisos.info('Copiado al portapapeles.');
};

const textoCredenciales = computed(() => {
  const r = resultado.value;
  if (!r) return '';
  const panel = location.origin;
  return r.clave
    ? `Hola ${r.nombre}, ya tienes acceso al panel de tu invitación de graduación.\nIngresa en: ${panel}\nCorreo: ${r.email}\nContraseña temporal: ${r.clave}\nTe recomendamos cambiarla al ingresar.`
    : `Hola ${r.nombre}, te enviamos un correo a ${r.email} para que crees tu contraseña y entres al panel: ${panel}`;
});
</script>

<template>
  <div>
    <div class="cabecera">
      <div>
        <p class="cabecera__eyebrow">{{ esSuperadmin ? 'Superadmin' : nombreColegio(estado.perfil?.colegio_id ?? null) }}</p>
        <h1>{{ esSuperadmin ? 'Usuarios' : 'Alumnos' }}</h1>
      </div>
      <div class="cabecera__acciones">
        <button type="button" class="btn btn--primario" :disabled="esSuperadmin && !colegios.length" @click="abrirCrear">
          <Icono nombre="mas" /> {{ esSuperadmin ? 'Nuevo usuario' : 'Nuevo alumno' }}
        </button>
      </div>
    </div>

    <div class="filtros">
      <input v-model="filtro.texto" class="input" type="search" placeholder="Buscar por nombre o correo" />
      <select v-if="esSuperadmin" v-model="filtro.colegio" class="input">
        <option value="">Todos los colegios</option>
        <option v-for="c in colegios" :key="c.id" :value="c.id">{{ c.nombre }}</option>
      </select>
      <select v-if="esSuperadmin" v-model="filtro.rol" class="input">
        <option value="">Todos los roles</option>
        <option value="profesor">Profesores</option>
        <option value="alumno">Alumnos</option>
      </select>
    </div>

    <div class="tarjeta">
      <div v-if="cargando" class="cargando"><span class="spinner" /></div>
      <div v-else-if="!lista.length" class="vacio">
        <strong>No hay usuarios para mostrar</strong>
        {{ esSuperadmin && !colegios.length ? 'Primero crea un colegio.' : 'Crea el primero con el botón de arriba.' }}
      </div>
      <div v-else class="tabla-envoltura">
        <table class="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th v-if="esSuperadmin">Rol</th>
              <th v-if="esSuperadmin" class="oculto-movil">Colegio</th>
              <th>Invitación</th>
              <th class="oculto-movil">Asistentes</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in lista" :key="p.id">
              <td>
                <div class="persona">
                  <img v-if="invitaciones[p.id]?.foto_url" :src="invitaciones[p.id]!.foto_url!" alt="" />
                  <span v-else class="persona__inicial">{{ p.nombre.charAt(0) }}</span>
                  <div>
                    <strong>{{ p.nombre }}</strong>
                    <span class="sub">{{ p.email }}</span>
                  </div>
                </div>
              </td>
              <td v-if="esSuperadmin"><span class="chip" :class="p.rol === 'profesor' ? 'chip--rojo' : 'chip--neutro'">{{ ROL_TEXTO[p.rol] }}</span></td>
              <td v-if="esSuperadmin" class="oculto-movil">{{ nombreColegio(p.colegio_id) }}</td>
              <td>
                <template v-if="invitaciones[p.id]">
                  <button
                    type="button"
                    class="chip chip-btn"
                    :class="invitaciones[p.id]!.publicada ? 'chip--ok' : 'chip--borrador'"
                    :title="invitaciones[p.id]!.publicada ? 'Clic para ocultar' : 'Clic para publicar'"
                    @click="alternarPublicada(invitaciones[p.id]!)"
                  >
                    {{ invitaciones[p.id]!.publicada ? 'Publicada' : 'Borrador' }}
                  </button>
                  <span class="sub mono ruta">/{{ invitaciones[p.id]!.slug }}</span>
                </template>
                <span v-else class="sub">—</span>
              </td>
              <td class="oculto-movil">{{ invitaciones[p.id] ? (asistentes[invitaciones[p.id]!.id] ?? 0) : '—' }}</td>
              <td>
                <div class="tabla__acciones">
                  <template v-if="invitaciones[p.id]">
                    <RouterLink class="btn btn--linea btn--chico" :to="{ name: 'invitacion', params: { id: invitaciones[p.id]!.id } }" title="Editar invitación">
                      <Icono nombre="editar" />
                    </RouterLink>
                    <RouterLink class="btn btn--linea btn--chico" :to="{ name: 'confirmaciones', params: { id: invitaciones[p.id]!.id } }" title="Confirmaciones">
                      <Icono nombre="confirmaciones" />
                    </RouterLink>
                    <RouterLink class="btn btn--linea btn--chico" :to="{ name: 'mensajes', params: { id: invitaciones[p.id]!.id } }" title="Libro de firmas">
                      <Icono nombre="mensajes" />
                    </RouterLink>
                    <a
                      v-if="LANDING_URL && invitaciones[p.id]!.publicada"
                      class="btn btn--linea btn--chico"
                      :href="`${LANDING_URL}/${invitaciones[p.id]!.slug}`"
                      target="_blank"
                      rel="noreferrer"
                      title="Ver invitación"
                    >
                      <Icono nombre="externo" />
                    </a>
                  </template>
                  <button type="button" class="btn btn--linea btn--chico" title="Cambiar contraseña" @click="(cambiandoClave = p), (nuevaClave = '')">
                    <Icono nombre="llave" />
                  </button>
                  <button type="button" class="btn btn--peligro btn--chico" title="Eliminar" @click="eliminar(p)">
                    <Icono nombre="borrar" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Crear usuario -->
    <ModalBase v-if="creando" :titulo="esSuperadmin ? 'Nuevo usuario' : 'Nuevo alumno'" @cerrar="creando = false">
      <form id="form-nuevo" class="campos" @submit.prevent="crear">
        <div v-if="esSuperadmin" class="campo campo--ancho">
          <span class="etiqueta">Rol</span>
          <div class="segmento">
            <button type="button" :aria-pressed="nuevo.rol === 'alumno'" @click="nuevo.rol = 'alumno'">Alumno</button>
            <button type="button" :aria-pressed="nuevo.rol === 'profesor'" @click="nuevo.rol = 'profesor'">Profesor</button>
          </div>
        </div>
        <div v-if="esSuperadmin" class="campo campo--ancho">
          <label for="n-col">Colegio</label>
          <select id="n-col" v-model="nuevo.colegio_id" class="input" required>
            <option v-for="c in colegios" :key="c.id" :value="c.id">{{ c.nombre }}</option>
          </select>
        </div>
        <div class="campo">
          <label for="n-nom">Nombres</label>
          <input id="n-nom" v-model="nuevo.nombres" class="input" required minlength="2" maxlength="60" />
        </div>
        <div class="campo">
          <label for="n-ape">Apellidos</label>
          <input id="n-ape" v-model="nuevo.apellidos" class="input" maxlength="60" :required="nuevo.rol === 'alumno'" />
        </div>
        <div class="campo" :class="{ 'campo--ancho': nuevo.rol !== 'alumno' }">
          <label for="n-mail">Correo</label>
          <input id="n-mail" v-model="nuevo.email" class="input" type="email" required />
        </div>
        <div v-if="nuevo.rol === 'alumno'" class="campo">
          <label for="n-promo">Promoción</label>
          <input id="n-promo" v-model.number="nuevo.promocion" class="input" type="number" min="2000" max="2100" required />
        </div>
        <div class="campo campo--ancho">
          <span class="etiqueta">Acceso</span>
          <div class="segmento">
            <button type="button" :aria-pressed="nuevo.modo === 'correo'" @click="nuevo.modo = 'correo'">Enviar invitación por correo</button>
            <button type="button" :aria-pressed="nuevo.modo === 'clave'" @click="(nuevo.modo = 'clave'), nuevo.clave || generarClave()">Contraseña temporal</button>
          </div>
          <span v-if="nuevo.modo === 'correo'" class="ayuda">Recibirá un correo con un enlace para crear su contraseña.</span>
        </div>
        <div v-if="nuevo.modo === 'clave'" class="campo campo--ancho">
          <label for="n-clave">Contraseña temporal</label>
          <div class="fila" style="flex-wrap: nowrap">
            <input id="n-clave" v-model="nuevo.clave" class="input mono" minlength="8" required />
            <button type="button" class="btn btn--linea btn--chico" @click="generarClave">Generar</button>
          </div>
        </div>
      </form>
      <template #pie>
        <button type="button" class="btn btn--linea" @click="creando = false">Cancelar</button>
        <button type="submit" form="form-nuevo" class="btn btn--primario" :disabled="enviando">{{ enviando ? 'Creando…' : 'Crear' }}</button>
      </template>
    </ModalBase>

    <!-- Resultado -->
    <ModalBase v-if="resultado" titulo="Usuario creado" @cerrar="resultado = null">
      <div class="form">
        <div class="alerta alerta--ok">
          <strong>{{ resultado.nombre }}</strong> ya tiene acceso al panel.
          <template v-if="resultado.slug"> Su invitación quedó en borrador en <span class="mono">/{{ resultado.slug }}</span>.</template>
        </div>
        <p class="ayuda" style="margin: 0">Mensaje para compartir de forma privada:</p>
        <pre class="alerta alerta--info mono" style="margin: 0; white-space: pre-wrap">{{ textoCredenciales }}</pre>
      </div>
      <template #pie>
        <button type="button" class="btn btn--linea" @click="copiar(textoCredenciales)"><Icono nombre="copiar" /> Copiar</button>
        <button type="button" class="btn btn--primario" @click="resultado = null">Listo</button>
      </template>
    </ModalBase>

    <!-- Cambiar contraseña -->
    <ModalBase v-if="cambiandoClave" :titulo="`Nueva contraseña · ${cambiandoClave.nombre}`" @cerrar="cambiandoClave = null">
      <form id="form-clave" class="form" @submit.prevent="cambiarClave">
        <div class="campo">
          <label for="c-clave">Contraseña (mín. 8 caracteres)</label>
          <input id="c-clave" v-model="nuevaClave" class="input mono" minlength="8" required />
        </div>
      </form>
      <template #pie>
        <button type="button" class="btn btn--linea" @click="cambiandoClave = null">Cancelar</button>
        <button type="submit" form="form-clave" class="btn btn--primario" :disabled="enviando || nuevaClave.length < 8">Guardar</button>
      </template>
    </ModalBase>
  </div>
</template>

<style scoped>
.persona { display: flex; align-items: center; gap: 0.7rem; min-width: 180px; }
.persona img, .persona__inicial { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; object-fit: cover; }
.persona__inicial { display: grid; place-items: center; background: var(--negro); color: #fff; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; }
.chip-btn { border: 0; cursor: pointer; }
.ruta { word-break: normal; white-space: nowrap; margin-top: 0.25rem; }
</style>
