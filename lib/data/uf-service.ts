// ============================================================
// UF SERVICE — valor UF del día
// Fase 1 (dev): lee hoja UF de INPUT_FILES.xlsx via ExcelAdapter
// Fase 2 (prod): API CMF con fallback a último valor en BD
// ============================================================

import { stockRepository } from './index'

let _cachedUF: { valor: number; fecha: string } | null = null

/**
 * Retorna el valor UF del día.
 * Cachea el resultado en memoria (se limpia al reiniciar el servidor).
 */
export async function getUFdelDia(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)

  if (_cachedUF && _cachedUF.fecha === today) {
    return _cachedUF.valor
  }

  const valor = await stockRepository.getUFdelDia()
  _cachedUF = { valor, fecha: today }
  return valor
}

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
 * Redondea al peso más cercano.
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
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}
