import type { CSSProperties } from 'react';
import { useInvitacion } from '../data/contexto';
import type { IconoMomento } from '../data/tipos';
import { hhmm } from '../lib/formato';
import { Birrete, Camara, Copa, Iglesia, Musica, Pin } from './Iconos';

const ICONOS: Record<IconoMomento, typeof Birrete> = {
  iglesia: Iglesia,
  birrete: Birrete,
  copa: Copa,
  musica: Musica,
  foto: Camara,
};

const Programa = () => {
  const { programa } = useInvitacion();
  if (!programa.length) return null;

  return (
    <section className="seccion">
      <p className="eyebrow reveal">Programa</p>
      <h2 className="titulo-seccion reveal">Un día para recordar</h2>

      <div className="programa">
        {programa.map((m, i) => {
          const Icono = ICONOS[m.icono] ?? Birrete;
          return (
            <article key={m.id} className="momento reveal" style={{ '--d': `${i * 120}ms` } as CSSProperties}>
              <span className="momento__icono">
                <Icono />
              </span>
              <div className="tarjeta momento__card">
                <span className="momento__hora">{hhmm(m.hora)} HRS</span>
                <h3 className="momento__titulo">{m.titulo}</h3>
                {m.lugar && <p className="momento__lugar">{m.lugar}</p>}
                {m.direccion && <p className="momento__dir">{m.direccion}</p>}
                {m.mapa_url && (
                  <a className="btn btn--linea" href={m.mapa_url} target="_blank" rel="noreferrer" style={{ marginTop: m.direccion ? 0 : '0.9rem' }}>
                    <Pin /> Ver ubicación
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default Programa;
