import { useEffect } from 'react';
import { useInvitacion } from '../data/contexto';

// Pantalla de apertura: el invitado toca el sello para "abrir" la invitación
const Sobre = ({ abierto, onAbrir }: { abierto: boolean; onAbrir: () => void }) => {
  const { invitacion: inv, colegio } = useInvitacion();
  const sello = inv.foto_url ?? colegio.escudo_url;

  useEffect(() => {
    document.body.classList.toggle('bloqueado', !abierto);
    return () => document.body.classList.remove('bloqueado');
  }, [abierto]);

  return (
    <div className={`sobre ${abierto ? 'abierto' : ''}`} aria-hidden={abierto}>
      <button type="button" className="sobre__btn" onClick={onAbrir}>
        <span className="sobre__hint">{inv.promocion}</span>
        {sello && (
          <span className="sobre__sello">
            <img src={sello} alt="" style={inv.foto_url ? { objectFit: 'cover' } : undefined} />
          </span>
        )}
        <span className="sobre__titulo">Tienes una invitación</span>
        <span className="sobre__hint">Toca para abrir</span>
      </button>
    </div>
  );
};

export default Sobre;
