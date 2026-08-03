/** Pesos colombianos con puntos de mil y sin decimales: 48.000 */
export const pesos = (cop: number) => cop.toLocaleString("es-CO");

/** Peso de la bolsa. 0 g = no aplica (equipos, métodos de la barra). */
export const gramos = (g: number) => (g > 0 ? `${g} g` : null);

/** Altitud con punto de mil y unidad: 1.850 msnm */
export const altitud = (m: number) => `${m.toLocaleString("es-CO")} msnm`;
