import { useEffect, useState } from 'react';

const calcular = (objetivo: number) => {
  const diff = objetivo - Date.now();
  if (diff <= 0) return { dias: 0, horas: 0, min: 0, seg: 0, fin: true };
  return {
    dias: Math.floor(diff / 86_400_000),
    horas: Math.floor((diff / 3_600_000) % 24),
    min: Math.floor((diff / 60_000) % 60),
    seg: Math.floor((diff / 1000) % 60),
    fin: false,
  };
};

const Unidad = ({ valor, label }: { valor: number; label: string }) => (
  <div className="cuenta__unidad">
    <div className="cuenta__caja">{String(valor).padStart(2, '0')}</div>
    <span className="cuenta__txt">{label}</span>
  </div>
);

const Countdown = ({ fecha }: { fecha: string }) => {
  const objetivo = Date.parse(fecha);
  const [t, setT] = useState(() => calcular(objetivo));

  useEffect(() => {
    const id = setInterval(() => setT(calcular(objetivo)), 1000);
    return () => clearInterval(id);
  }, [objetivo]);

  return (
    <div className="cuenta">
      {t.fin ? (
        <p className="cuenta__label">¡Hoy es el gran día! 🎓</p>
      ) : (
        <>
          <p className="cuenta__label">Faltan</p>
          <div className="cuenta__fila">
            <Unidad valor={t.dias} label="Días" />
            <Unidad valor={t.horas} label="Horas" />
            <Unidad valor={t.min} label="Min" />
            <Unidad valor={t.seg} label="Seg" />
          </div>
        </>
      )}
    </div>
  );
};

export default Countdown;
