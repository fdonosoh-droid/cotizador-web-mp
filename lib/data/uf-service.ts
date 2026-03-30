// ============================================================
// UF SERVICE — valor UF del día (SERVER ONLY)
// No importar desde Client Components — usa stockRepository.
// Para formateo en cliente: importar desde uf-format.ts
// ============================================================

import { stockRepository } from './index'

// Re-exporta funciones de formato para compatibilidad con imports existentes
export { formatUF, formatCLP, ufToCLP } from './uf-format'

let _cachedUF: { valor: number; fecha: string } | null = null

/**
 * Retorna el valor UF del día.
 * Cachea en memoria por día (se limpia al reiniciar el servidor).
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
