import { useInvitacion } from '../data/contexto';
import { Esquina } from './Iconos';

const Mensaje = () => {
  const { invitacion: inv } = useInvitacion();
  if (!inv.mensaje.trim()) return null;

  return (
    <section className="seccion">
      <p className="eyebrow reveal">Unas palabras</p>
      <h2 className="titulo-seccion reveal">Gracias por ser parte</h2>

      <div className="tarjeta tarjeta--grano mensaje reveal">
        <Esquina className="esquina esquina--a" />
        <Esquina className="esquina esquina--b" />
        <span className="mensaje__comillas" aria-hidden="true">“</span>
        <p className="mensaje__texto" style={{ whiteSpace: 'pre-line' }}>{inv.mensaje}</p>
        <p className="mensaje__firma">{inv.apodo || inv.nombres.split(' ')[0]}</p>
      </div>
    </section>
  );
};

export default Mensaje;
