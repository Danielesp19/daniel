/**
 * La taza de la marca, vista de frente: plato, cuerpo, asa y el vapor saliendo.
 *
 * Reemplazó al grano de café que había. Un grano es la materia prima; lo que
 * vende Daniel es la taza servida —el arte latte—, y a 20 px la silueta de una
 * taza se reconoce de inmediato mientras que el grano se leía como un punto.
 *
 * El vapor sube en bucle muy despacio y solo al pasar el mouse: quieto, el
 * icono no distrae; al tocarlo, la taza "está caliente".
 *
 * Vive en su propio archivo porque la usan los DOS sitios donde aparece la
 * firma: la barra de la portada y la cabecera que entra al bajar. La portada
 * llevaba otra taza distinta —la genérica de vaso para llevar, dos trazos— y
 * tener dos tazas diferentes en la misma pantalla hacía que la marca se
 * viera descuidada. El tamaño y el color los pone quien la usa; el dibujo es
 * uno solo.
 */
export default function Taza() {
  return (
    <span className="marca-taza" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* El vapor va primero para que quede por detrás de la taza. */}
        <g className="marca-vapor">
          <path d="M9.5 5.6c-.9-1 .3-1.7-.5-2.8" />
          <path d="M13 5.6c-.9-1 .3-1.7-.5-2.8" />
        </g>
        {/* Cuerpo: cónico, como una taza de capuchino. */}
        <path d="M4.4 9h13l-1 6.2a3.4 3.4 0 0 1-3.35 2.8h-4.3A3.4 3.4 0 0 1 5.4 15.2Z" />
        {/* Asa */}
        <path d="M17.2 10.6h1.4a2.2 2.2 0 0 1 0 4.4h-1.8" />
        {/* Plato */}
        <path d="M3.2 20.4h15.6" />
      </svg>
    </span>
  );
}
