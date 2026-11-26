const ZONA = 'America/La_Paz';

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Sábado 12 de diciembre, 2026" */
export const fechaLarga = (iso: string) => {
  const p = new Intl.DateTimeFormat('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONA })
    .formatToParts(new Date(iso))
    .reduce<Record<string, string>>((acc, x) => ({ ...acc, [x.type]: x.value }), {});
  return `${mayuscula(p.weekday)} ${p.day} de ${p.month}, ${p.year}`;
};

/** "17:00" */
export const horaCorta = (iso: string) =>
  new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA }).format(new Date(iso));

/** "5 de diciembre" a partir de "2026-12-05" */
export const diaMes = (fecha: string) =>
  new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${fecha}T00:00:00Z`));

/** "17:00:00" -> "17:00" */
export const hhmm = (hora: string) => hora.slice(0, 5);

/** Aplica los colores del colegio como variables CSS de la landing. */
export function aplicarColores(primario: string, secundario: string) {
  const hex = /^#[0-9a-f]{6}$/i;
  if (!hex.test(primario) || !hex.test(secundario)) return;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(primario.slice(i, i + 2), 16));
  const oscuro = `rgb(${Math.round(r * 0.68)}, ${Math.round(g * 0.68)}, ${Math.round(b * 0.68)})`;
  const root = document.documentElement.style;
  root.setProperty('--rojo', primario);
  root.setProperty('--rojo-rgb', `${r}, ${g}, ${b}`);
  root.setProperty('--rojo-osc', oscuro);
  root.setProperty('--negro', secundario);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', secundario);
}
