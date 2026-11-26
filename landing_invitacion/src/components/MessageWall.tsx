import { useEffect, useState, type FormEvent } from 'react';
import { useInvitacion } from '../data/contexto';
import { agregarMensaje, suscribirMensajes, type MensajeMuro } from '../services/mensajes';
import { Esquina } from './Iconos';

const MAX_PALABRAS = 25;
const PROFUNDIDAD = 4;
const ASOMO = 18;

const contarPalabras = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

const altoTarjeta = (texto: string) => {
  const n = contarPalabras(texto);
  if (n <= 10) return 220;
  if (n <= 20) return 255;
  return 295;
};

const clavePropio = (invitacionId: string) => `graduacion_mensaje_propio_${invitacionId}`;

const cargarPropio = (invitacionId: string): MensajeMuro | null => {
  try {
    const raw = localStorage.getItem(clavePropio(invitacionId));
    return raw ? (JSON.parse(raw) as MensajeMuro) : null;
  } catch {
    return null;
  }
};

const MessageWall = () => {
  const { invitacion: inv, vista_previa } = useInvitacion();
  const [mensajes, setMensajes] = useState<MensajeMuro[]>([]);
  const [propio, setPropio] = useState(() => cargarPropio(inv.id));
  const [nombre, setNombre] = useState('');
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [indice, setIndice] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(false);

  const palabras = contarPalabras(texto);
  const excedido = palabras > MAX_PALABRAS;

  useEffect(
    () =>
      suscribirMensajes(
        inv.id,
        (m) => {
          setMensajes(m);
          setCargando(false);
        },
        () => {
          setErrorCarga(true);
          setCargando(false);
        },
      ),
    [inv.id],
  );

  const idx = mensajes.length ? indice % mensajes.length : 0;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || excedido || propio || enviando || vista_previa) return;
    setEnviando(true);
    setErrorEnvio(false);
    try {
      const nuevo = await agregarMensaje(inv.id, { nombre: nombre.trim() || 'Anónimo', texto: texto.trim() });
      setPropio(nuevo);
      try {
        localStorage.setItem(clavePropio(inv.id), JSON.stringify(nuevo));
      } catch {
        /* ignorar */
      }
      setTexto('');
      setNombre('');
      setIndice(0);
      setAbierto(true);
    } catch {
      setErrorEnvio(true);
    } finally {
      setEnviando(false);
    }
  };

  const siguiente = () => setIndice((i) => (i + 1) % mensajes.length);
  const anterior = () => setIndice((i) => (i - 1 + mensajes.length) % mensajes.length);

  const prof = Math.min(mensajes.length, PROFUNDIDAD);
  const altoPila = mensajes.length ? altoTarjeta(mensajes[idx].texto) + (prof - 1) * ASOMO + 10 : 0;

  return (
    <section className="seccion">
      <p className="eyebrow reveal">Libro de firmas</p>
      <h2 className="titulo-seccion reveal">Unas palabras para {inv.apodo || inv.nombres.split(' ')[0]}</h2>

      {propio ? (
        <div className="tarjeta tarjeta--grano muro__enviado reveal">
          <p className="muro__enviado-label">Ya dejaste tu mensaje</p>
          <p className="nota__texto">{propio.texto}</p>
          <p className="nota__autor">— {propio.nombre}</p>
        </div>
      ) : (
        <form className="form reveal" onSubmit={enviar}>
          <input
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            maxLength={40}
            aria-label="Tu nombre"
          />
          <textarea
            className={`input ${excedido ? 'input--error' : ''}`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={`Escribe tu mensaje (máx. ${MAX_PALABRAS} palabras)`}
            rows={3}
            aria-label="Tu mensaje"
          />
          <div className="muro__pie">
            <span className={`muro__contador ${excedido ? 'muro__contador--error' : ''}`}>
              {palabras}/{MAX_PALABRAS} palabras
            </span>
            <button type="submit" className="btn btn--rojo" disabled={!texto.trim() || excedido || enviando || vista_previa}>
              {enviando ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
          {vista_previa && <p className="nota-previa">Disponible cuando la invitación esté publicada.</p>}
          {errorEnvio && <p className="muro__contador muro__contador--error">No se pudo enviar tu mensaje. Intenta de nuevo.</p>}
        </form>
      )}

      <div className="acordeon reveal">
        <button type="button" className="acordeon__btn" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
          <span>Ver mensajes {mensajes.length > 0 && `(${mensajes.length})`}</span>
          <span className={`acordeon__flecha ${abierto ? 'abierta' : ''}`}>▾</span>
        </button>

        <div className="acordeon__cuerpo" style={{ gridTemplateRows: abierto ? '1fr' : '0fr' }}>
          <div>
            <div className="acordeon__interior">
              {cargando ? (
                <p className="vacio">Cargando…</p>
              ) : errorCarga ? (
                <p className="vacio">No se pudieron cargar los mensajes.</p>
              ) : mensajes.length === 0 ? (
                <p className="vacio">Aún no hay mensajes… ¡sé el primero!</p>
              ) : (
                <>
                  <div className="pila" style={{ height: altoPila }}>
                    {Array.from({ length: prof }, (_, d) => {
                      const real = (idx + d) % mensajes.length;
                      const m = mensajes[real];
                      const signo = d % 2 === 0 ? 1 : -1;
                      return (
                        <div
                          key={m.id}
                          className="nota"
                          onClick={() => d !== 0 && setIndice(real)}
                          style={{
                            top: (prof - 1 - d) * ASOMO,
                            height: altoTarjeta(m.texto),
                            transform: `rotate(${d === 0 ? 0 : signo * d * 1.8}deg) scale(${1 - d * 0.035})`,
                            opacity: Math.max(1 - d * 0.18, 0.35),
                            zIndex: PROFUNDIDAD - d,
                            cursor: d !== 0 ? 'pointer' : 'default',
                          }}
                        >
                          <div className="tarjeta tarjeta--grano" style={{ height: '100%' }}>
                            <Esquina className="esquina esquina--a" />
                            <Esquina className="esquina esquina--b" />
                            <div className="nota__cuerpo">
                              <span className="nota__avatar">{(m.nombre || 'A').charAt(0).toUpperCase()}</span>
                              <p className="nota__texto">“{m.texto}”</p>
                              <p className="nota__autor">{m.nombre}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {mensajes.length > 1 && (
                    <div className="pila__nav">
                      <button type="button" onClick={anterior} aria-label="Mensaje anterior">‹</button>
                      <span>
                        {idx + 1} / {mensajes.length}
                      </span>
                      <button type="button" onClick={siguiente} aria-label="Mensaje siguiente">›</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MessageWall;
