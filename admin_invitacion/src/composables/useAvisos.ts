import { reactive } from 'vue';

export type Aviso = { id: number; tipo: 'ok' | 'error' | 'info'; texto: string };

const avisos = reactive<Aviso[]>([]);
let siguiente = 0;

function avisar(tipo: Aviso['tipo'], texto: string, ms = 4000) {
  const id = siguiente++;
  avisos.push({ id, tipo, texto });
  setTimeout(() => cerrar(id), ms);
}

function cerrar(id: number) {
  const i = avisos.findIndex((a) => a.id === id);
  if (i >= 0) avisos.splice(i, 1);
}

export function useAvisos() {
  return {
    avisos,
    cerrar,
    ok: (t: string) => avisar('ok', t),
    error: (t: string) => avisar('error', t, 6500),
    info: (t: string) => avisar('info', t),
  };
}
