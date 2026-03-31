// ============================================================
// UF SERVICE — valor UF del día (SERVER ONLY)
// No importar desde Client Components — usa stockRepository.
// Para formateo en cliente: importar desde uf-format.ts
//
// Fuente en producción: API CMF Chile (requiere CMF_API_KEY)
// Fallback: repositorio activo (Excel en dev, PostgreSQL en prod)
// ============================================================

import { stockRepository } from './index'

// Re-exporta funciones de formato para compatibilidad con imports existentes
export { formatUF, formatCLP, ufToCLP } from './uf-format'

let _cachedUF: { valor: number; fecha: string } | null = null

// ── CMF API ─────────────────────────────────────────────────
// Endpoint: GET /sf/v1.0/uf/posteriores/{yyyy}/{mm}/dias/{dd}
// Respuesta: { "UFs": [{ "Fecha": "DD-MM-YYYY", "Valor": "36.798,49" }] }
// Formato numérico chileno: punto = miles, coma = decimal

async function fetchUFfromCMF(): Promise<number | null> {
  const apiKey = process.env.CMF_API_KEY
  if (!apiKey) return null

  const today = new Date()
  const yyyy  = today.getFullYear()
  const mm    = String(today.getMonth() + 1).padStart(2, '0')
  const dd    = String(today.getDate()).padStart(2, '0')

  try {
    const url = `https://api.cmfchile.cl/api-sbifws/sf/v1.0/uf/posteriores/${yyyy}/${mm}/dias/${dd}?apikey=${apiKey}&formato=json`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null

    const data = await res.json()
    const raw  = data?.UFs?.[0]?.Valor as string | undefined
    if (!raw) return null

    // "36.798,49" → 36798.49
    const valor = parseFloat(raw.replace(/\./g, '').replace(',', '.'))
    return isFinite(valor) && valor > 0 ? valor : null
  } catch {
    return null
  }
}

// ── Getter principal ─────────────────────────────────────────

/**
 * Retorna el valor UF del día.
 * Prioridad: CMF API (si CMF_API_KEY está configurada) → repositorio.
 * Cachea en memoria por día (se limpia al reiniciar el servidor).
 */
export async function getUFdelDia(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)

  if (_cachedUF && _cachedUF.fecha === today) {
    return _cachedUF.valor
  }

  const cmfValor = await fetchUFfromCMF()
  const valor    = cmfValor ?? await stockRepository.getUFdelDia()

  if (valor > 0) {
    _cachedUF = { valor, fecha: today }
  }
  return valor
}
