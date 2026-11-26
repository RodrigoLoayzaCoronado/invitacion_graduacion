import { useState, type FormEvent } from 'react';
import { useInvitacion } from '../data/contexto';
import { diaMes, fechaLarga } from '../lib/formato';
import { guardarConfirmacion } from '../services/confirmaciones';
import { Whatsapp } from './Iconos';

const OPCIONES = [1, 2, 3, 4, 5];

// Confirmación de asistencia: se guarda en el panel del graduado y,
// si configuró WhatsApp, además abre el chat con el mensaje armado.
const Confirm = () => {
  const { invitacion: inv, vista_previa } = useInvitacion();
  const [nombre, setNombre] = useState('');
  const [personas, setPersonas] = useState(1);
  const [mensaje, setMensaje] = useState('');
  const [estado, setEstado] = useState<'form' | 'enviando' | 'listo' | 'error'>('form');

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || estado === 'enviando' || vista_previa) return;

    // WhatsApp se abre ANTES del await para que el navegador no lo bloquee como popup
    if (inv.whatsapp) {
      const texto =
        `*Confirmación de asistencia — Graduación de ${inv.apodo || inv.nombres}* 🎓\n\n` +
        `👤 *Nombre:* ${nombre.trim()}\n` +
        `👥 *Personas:* ${personas}\n` +
        `📝 *Mensaje:* ${mensaje.trim() || 'Sin mensaje adicional'}` +
        (inv.fecha_evento ? `\n\n¡Nos vemos el ${fechaLarga(inv.fecha_evento)}!` : '');
      window.open(`https://wa.me/${inv.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank');
    }

    setEstado('enviando');
    try {
      await guardarConfirmacion(inv.id, { nombre: nombre.trim(), personas, mensaje: mensaje.trim() });
      setEstado('listo');
    } catch {
      setEstado('error');
    }
  };

  return (
    <section className="seccion">
      <p className="eyebrow reveal">Confirma tu asistencia</p>
      <h2 className="titulo-seccion reveal">¿Me acompañas?</h2>

      <div className="tarjeta tarjeta--grano confirmar reveal">
        {estado === 'listo' ? (
          <div className="confirmar__gracias">
            <p className="titulo-seccion" style={{ margin: 0, fontSize: '2.4rem' }}>¡Gracias, {nombre.split(' ')[0]}!</p>
            <p className="confirmar__intro" style={{ margin: 0 }}>Tu confirmación quedó registrada. ¡Te espero!</p>
            <button
              type="button"
              className="btn btn--linea"
              style={{ marginTop: '1.2rem' }}
              onClick={() => {
                setEstado('form');
                setNombre('');
                setMensaje('');
                setPersonas(1);
              }}
            >
              Confirmar otra persona
            </button>
          </div>
        ) : (
          <>
            <p className="confirmar__intro">
              Tu presencia hará este día aún más especial. Confírmame para organizar todo con cariño.
            </p>

            <form className="form" onSubmit={enviar}>
              <div className="campo">
                <label htmlFor="rsvp-nombre">Nombre completo *</label>
                <input
                  id="rsvp-nombre"
                  className="input"
                  value={nombre}
                  maxLength={60}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: María Fernanda Pérez"
                  required
                />
              </div>

              <div className="campo">
                <label id="rsvp-personas">Número de personas</label>
                <div className="selector" role="group" aria-labelledby="rsvp-personas">
                  {OPCIONES.map((n) => (
                    <button key={n} type="button" aria-pressed={personas === n} onClick={() => setPersonas(n)}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="campo">
                <label htmlFor="rsvp-mensaje">Mensaje (opcional)</label>
                <textarea
                  id="rsvp-mensaje"
                  className="input"
                  rows={2}
                  maxLength={200}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="¿Algún comentario?"
                />
              </div>

              <button type="submit" className="btn btn--rojo btn--bloque" disabled={!nombre.trim() || estado === 'enviando' || vista_previa}>
                {inv.whatsapp && <Whatsapp />}
                {estado === 'enviando' ? 'Enviando…' : inv.whatsapp ? 'Confirmar por WhatsApp' : 'Confirmar asistencia'}
              </button>
              {estado === 'error' && (
                <p className="muro__contador muro__contador--error" style={{ textAlign: 'center' }}>
                  No se pudo registrar tu confirmación. Intenta de nuevo.
                </p>
              )}
            </form>

            {vista_previa && <p className="nota-previa">Disponible cuando la invitación esté publicada.</p>}
            {inv.fecha_limite && <p className="confirmar__limite">Confirma antes del {diaMes(inv.fecha_limite)}</p>}
          </>
        )}
      </div>

      <div className="adornos" aria-hidden="true">
        <span>✦</span>
        <span style={{ color: 'var(--negro)' }}>✧</span>
        <span>✦</span>
      </div>
    </section>
  );
};

export default Confirm;
