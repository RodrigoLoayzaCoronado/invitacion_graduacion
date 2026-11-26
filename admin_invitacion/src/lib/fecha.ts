// Bolivia usa UTC-4 todo el año (sin horario de verano), por eso el desfase fijo.
const OFFSET = '-04:00';
const OFFSET_MS = 4 * 60 * 60 * 1000;

/** ISO de la base de datos -> valor para <input type="datetime-local"> en hora de Bolivia */
export const isoAInputLocal = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() - OFFSET_MS).toISOString().slice(0, 16) : '';

/** Valor de <input type="datetime-local"> (hora de Bolivia) -> ISO con zona */
export const inputLocalAIso = (v: string) => (v ? `${v}:00${OFFSET}` : null);

export const formatearFecha = (iso: string) =>
  new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(new Date(iso));
