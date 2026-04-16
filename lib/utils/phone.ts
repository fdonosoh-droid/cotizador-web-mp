export function formatPhone(raw: string): { formatted: string; error: string | null } {
  const digits = raw.replace(/\D/g, '')
  const local = digits.startsWith('56') ? digits.slice(2) : digits
  if (local.length < 8) {
    return { formatted: raw, error: 'Teléfono inválido: mínimo 8 dígitos' }
  }
  const formatted = `+56${local[0]} ${local.slice(1, 5)} ${local.slice(5, 9)}`
  return { formatted, error: null }
}
