import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Birrete } from './Iconos';

// Configuración de los birretes flotantes (equivalente a los SVG del Layout original)
const CONFIG = {
  MAX_BIRRETES: 3,
  MIN_INTERVALO: 3500,
  MAX_INTERVALO: 7000,
  MIN_VIDA: 4000,
  MAX_VIDA: 6500,
};

const COLORES_CONFETI = ['var(--rojo)', 'var(--rojo)', 'var(--negro)', '#9a9a9a', '#d6d6d6', '#f4d40b'];

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

type BirreteFlotante = { id: number; x: number; y: number; size: number; rot: number; op: number; vida: number };

const Confeti = ({ cantidad = 34, destellos = 14 }) => {
  const piezas = useMemo(
    () =>
      Array.from({ length: cantidad }, (_, i) => ({
        id: i,
        left: rand(0, 100),
        w: rand(4, 8),
        h: rand(8, 14),
        dur: rand(11, 22),
        delay: rand(0, 18),
        dx: rand(-60, 60),
        r: rand(180, 720),
        o: rand(0.25, 0.6),
        color: COLORES_CONFETI[i % COLORES_CONFETI.length],
      })),
    [cantidad],
  );

  const brillos = useMemo(
    () =>
      Array.from({ length: destellos }, (_, i) => ({
        id: i,
        left: rand(0, 100),
        top: rand(0, 100),
        size: rand(6, 13),
        dur: rand(2.5, 5),
        delay: rand(0, 6),
      })),
    [destellos],
  );

  return (
    <>
      {piezas.map((p) => (
        <span
          key={`c${p.id}`}
          className="confeti"
          style={
            {
              left: `${p.left}%`,
              width: p.w,
              height: p.h,
              background: p.color,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              '--dx': `${p.dx}px`,
              '--r': `${p.r}deg`,
              '--o': p.o,
            } as CSSProperties
          }
        />
      ))}
      {brillos.map((b) => (
        <span
          key={`d${b.id}`}
          className="destello"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: b.size,
            height: b.size,
            animationDuration: `${b.dur}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </>
  );
};

const Layout = ({ children }: { children: ReactNode }) => {
  const [birretes, setBirretes] = useState<BirreteFlotante[]>([]);

  useEffect(() => {
    let id = 0;
    let timer: ReturnType<typeof setTimeout>;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const crear = () => {
      const nuevo: BirreteFlotante = {
        id: id++,
        x: rand(8, 92),
        y: rand(15, 90),
        size: rand(28, 60),
        rot: rand(-25, 25),
        op: rand(0.08, 0.18),
        vida: rand(CONFIG.MIN_VIDA, CONFIG.MAX_VIDA),
      };
      setBirretes((prev) => [...prev.slice(-(CONFIG.MAX_BIRRETES - 1)), nuevo]);
      timers.push(setTimeout(() => setBirretes((prev) => prev.filter((b) => b.id !== nuevo.id)), nuevo.vida));
    };

    const programar = () => {
      timer = setTimeout(() => {
        crear();
        programar();
      }, rand(CONFIG.MIN_INTERVALO, CONFIG.MAX_INTERVALO));
    };

    timer = setTimeout(() => {
      crear();
      programar();
    }, 2000);

    return () => {
      clearTimeout(timer);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="layout">
      <div className="fondo" aria-hidden="true">
        <div className="fondo__base" />
        <div className="fondo__puntos" />
        <div className="fondo__brillo" />
        <Confeti />
      </div>

      {birretes.map((b) => (
        <div
          key={b.id}
          className="birrete-flotante"
          aria-hidden="true"
          style={
            {
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: b.size,
              height: b.size,
              '--r': `${b.rot}deg`,
              '--o': b.op,
              '--t': `${b.vida}ms`,
            } as CSSProperties
          }
        >
          <Birrete width="100%" height="100%" />
        </div>
      ))}

      <div className="contenido">{children}</div>
    </div>
  );
};

export default Layout;
