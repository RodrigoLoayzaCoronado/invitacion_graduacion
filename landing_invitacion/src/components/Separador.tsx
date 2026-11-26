const Separador = ({ tricolor = false }: { tricolor?: boolean }) =>
  tricolor ? (
    <div className="tricolor" aria-hidden="true" style={{ margin: '2.2rem auto' }}>
      <span />
      <span />
      <span />
    </div>
  ) : (
    <div className="separador" aria-hidden="true">
      <span className="separador__linea" />
      <span className="separador__rombo" />
      <span className="separador__linea" />
    </div>
  );

export default Separador;
