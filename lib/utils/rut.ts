// ============================================================
// RUT utils — validación y formateo RUT chileno
// ============================================================

/** Limpia un RUT dejando solo dígitos y 'k'/'K' */
export function cleanRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase()
}

/** Calcula dígito verificador de un RUT (sin dígito) */
function calcDV(rutNum: string): string {
  let sum = 0
  let factor = 2
  for (let i = rutNum.length - 1; i >= 0; i--) {
    sum += parseInt(rutNum[i], 10) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const dv = 11 - (sum % 11)
  if (dv === 11) return '0'
  if (dv === 10) return 'K'
  return String(dv)
}

/**
 * Valida un RUT chileno.
 * Acepta formatos: "12.345.678-9", "12345678-9", "123456789"
 */
export function validateRut(rut: string): boolean {
  const clean = cleanRut(rut)
  if (clean.length < 2) return false
  const body = clean.slice(0, -1)
  const dv   = clean.slice(-1)
  if (!/^\d+$/.test(body)) return false
  return calcDV(body) === dv
}

/**
 * Formatea un RUT limpio al formato "12.345.678-9"
 */
export function formatRut(rut: string): string {
  const clean = cleanRut(rut)
  if (clean.length < 2) return rut
  const body = clean.slice(0, -1)
  const dv   = clean.slice(-1)
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted}-${dv}`
}
