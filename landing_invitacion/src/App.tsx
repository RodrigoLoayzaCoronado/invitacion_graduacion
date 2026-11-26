import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Sobre from './components/Sobre';
import Header from './components/Header';
import Mensaje from './components/Mensaje';
import Programa from './components/Programa';
import Information from './components/Information';
import Confirm from './components/Confirm';
import MessageWall from './components/MessageWall';
import Separador from './components/Separador';
import InvitacionProvider from './data/InvitacionProvider';
import { useCargarInvitacion, useInvitacion } from './data/contexto';
import './styles/invitacion.css';

// Activa la animación .reveal cuando cada bloque entra en pantalla
const useReveal = (activo: boolean) => {
  useEffect(() => {
    if (!activo) return;
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [activo]);
};

const Invitacion = () => {
  const { invitacion: inv, colegio, vista_previa } = useInvitacion();
  const [abierto, setAbierto] = useState(false);
  useReveal(abierto);

  return (
    <>
      <Sobre abierto={abierto} onAbrir={() => setAbierto(true)} />
      <Layout>
        <Header />
        <Separador tricolor />
        <Mensaje />
        <Programa />
        <Information />
        <Confirm />
        <MessageWall />

        <footer className="footer">
          {colegio.escudo_url && <img className="footer__escudo" src={colegio.escudo_url} alt="" />}
          {(inv.lema || colegio.lema) && <p className="footer__lema">{inv.lema || colegio.lema}</p>}
          <div className="banderas">
            <span className="bandera" role="img" aria-label="Bandera de Bolivia">
              <span style={{ background: '#d52b1e' }} />
              <span style={{ background: '#f9e300' }} />
              <span style={{ background: '#007934' }} />
            </span>
            <span className="bandera" role="img" aria-label="Bandera de Alemania">
              <span style={{ background: '#000000' }} />
              <span style={{ background: '#dd0000' }} />
              <span style={{ background: '#ffce00' }} />
            </span>
          </div>
          <p className="footer__credito">© {new Date().getFullYear()} · Diseñado y desarrollado por NOVAMARK</p>
        </footer>
      </Layout>
      {vista_previa && <div className="vista-previa">Vista previa · aún no publicada</div>}
    </>
  );
};

function App() {
  const estado = useCargarInvitacion();

  if (estado.tipo === 'cargando') {
    return (
      <div className="estado-pagina" aria-busy="true">
        <span className="spinner" />
      </div>
    );
  }

  if (estado.tipo !== 'ok') {
    return (
      <div className="estado-pagina">
        <h1>{estado.tipo === 'error' ? 'Algo salió mal' : 'Invitación no encontrada'}</h1>
        <p>
          {estado.tipo === 'error'
            ? 'No pudimos cargar la invitación. Revisa tu conexión e intenta de nuevo.'
            : 'Revisa que el enlace esté completo o pide uno nuevo a quien te invitó.'}
        </p>
      </div>
    );
  }

  return (
    <InvitacionProvider datos={estado.datos}>
      <Invitacion />
    </InvitacionProvider>
  );
}

export default App;
