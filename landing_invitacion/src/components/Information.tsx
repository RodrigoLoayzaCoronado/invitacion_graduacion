import type { ReactNode } from 'react';
import { useInvitacion } from '../data/contexto';
import { fechaLarga, hhmm, horaCorta } from '../lib/formato';
import { Calendario, Corbata, Esquina, Pin, Reloj } from './Iconos';

type Detalle = { icono: ReactNode; label: string; valor: string; nota?: ReactNode; destacado?: boolean };

const Information = () => {
  const { invitacion: inv, colegio, programa } = useInvitacion();

  const inicio = inv.fecha_evento ? horaCorta(inv.fecha_evento) : programa[0] ? hhmm(programa[0].hora) : null;

  const detalles: Detalle[] = [];
  if (inv.fecha_evento) detalles.push({ icono: <Calendario />, label: 'Fecha', valor: fechaLarga(inv.fecha_evento) });
  if (inicio) detalles.push({ icono: <Reloj />, label: 'Inicio', valor: `${inicio} hrs` });
  if (colegio.ciudad) detalles.push({ icono: <Pin />, label: 'Ciudad', valor: colegio.ciudad });
  if (inv.dress_code_titulo || inv.dress_code_detalle) {
    detalles.push({
      icono: <Corbata />,
      label: 'Dress Code',
      valor: inv.dress_code_titulo,
      destacado: true,
      nota: (
        <>
          {inv.dress_code_detalle}
          {inv.dress_code_colores.length > 0 && (
            <span className="colores" aria-hidden="true">
              {inv.dress_code_colores.map((c, i) => (
                <span key={i} style={{ background: c }} />
              ))}
            </span>
          )}
        </>
      ),
    });
  }

  if (!detalles.length) return null;

  return (
    <section className="seccion">
      <p className="eyebrow reveal">Detalles del evento</p>
      <h2 className="titulo-seccion reveal">Todo lo que debes saber</h2>

      <div className="tarjeta tarjeta--grano reveal">
        <Esquina className="esquina esquina--a" />
        <Esquina className="esquina esquina--b" />
        <ul className="detalles">
          {detalles.map((d) => (
            <li key={d.label} className={`detalle ${d.destacado ? 'detalle--destacado' : ''}`}>
              <span className="detalle__icono">{d.icono}</span>
              <span>
                <span className="detalle__label">{d.label}</span>
                <span className="detalle__valor">{d.valor}</span>
                {d.nota && <span className="detalle__nota">{d.nota}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Information;
