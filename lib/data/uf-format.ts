// ============================================================
// UF FORMAT — funciones puras de formateo (client-safe)
// Sin dependencias de servidor. Seguro importar desde Client Components.
// ============================================================

/**
 * Formatea un valor en UF a string con 2 decimales.
 * Ej: formatUF(36500.12) → "36.500,12"
 */
export function formatUF(valor: number): string {
  return valor.toLocaleString('es-CL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Convierte UF → CLP usando el valor UF provisto.
 */
export function ufToCLP(uf: number, valorUF: number): number {
  return Math.round(uf * valorUF)
}

/**
 * Formatea CLP como string moneda sin decimales.
 * Ej: formatCLP(85000000) → "$85.000.000"
 */
export function formatCLP(clp: number): string {
  return clp.toLocaleString('es-CL', {
    style:                'currency',
    currency:             'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}
