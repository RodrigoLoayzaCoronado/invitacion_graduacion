import type { CSSProperties } from 'react';
import { useInvitacion } from '../data/contexto';
import { fechaLarga } from '../lib/formato';
import Countdown from './Countdown';
import Separador from './Separador';

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

const ETIQUETA_GENERO = { masculino: 'Graduado', femenino: 'Graduada', neutro: '' } as const;

const Header = () => {
  const { invitacion: inv, colegio } = useInvitacion();
  const etiqueta = [ETIQUETA_GENERO[inv.genero], inv.promocion].filter(Boolean).join(' · ');

  return (
    <header className="hero">
      {etiqueta && <p className="eyebrow reveal">{etiqueta}</p>}

      {inv.foto_url ? (
        <div className="retrato reveal" style={d(100)}>
          <img className="retrato__foto" src={inv.foto_url} alt={`${inv.nombres} ${inv.apellidos}`} />
          {colegio.escudo_url && <img className="retrato__escudo" src={colegio.escudo_url} alt={`Escudo ${colegio.nombre}`} />}
        </div>
      ) : (
        colegio.escudo_url && (
          <div className="escudo-marco reveal" style={d(100)}>
            <img src={colegio.escudo_url} alt={`Escudo ${colegio.nombre}`} />
          </div>
        )
      )}

      <p
        className="f-sans reveal"
        style={{ fontSize: '0.75rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--texto-suave)', margin: '0 0 1rem', ...d(150) }}
      >
        Con alegría te invito a mi graduación
      </p>

      <h1 className="hero__nombre reveal" style={d(200)}>
        {inv.nombres}
      </h1>
      {inv.apellidos && (
        <p className="hero__apellidos reveal" style={d(300)}>
          {inv.apellidos}
        </p>
      )}

      <div className="reveal" style={d(400)}>
        <span className="banda">{colegio.nombre}</span>
        {colegio.ciudad && <span className="banda__sub">{colegio.ciudad}</span>}
      </div>

      {inv.titulo && (
        <p className="hero__frase reveal" style={d(500)}>
          {inv.titulo}
        </p>
      )}

      {inv.fecha_evento && (
        <>
          <Separador />
          <p className="texto reveal" style={{ margin: '0 0 0.4rem' }}>
            {fechaLarga(inv.fecha_evento)}
          </p>
          <div className="reveal" style={{ marginTop: '1.2rem' }}>
            <Countdown fecha={inv.fecha_evento} />
          </div>
        </>
      )}
    </header>
  );
};

export default Header;
