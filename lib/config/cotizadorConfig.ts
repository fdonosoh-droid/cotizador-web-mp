// ============================================================
// COTIZADOR CONFIG — constantes y parámetros configurables
// Fuente: scripts/schema.sql → tabla parametro_cotizador (seed)
//         + hoja aux de INPUT_FILES.xlsx
// ============================================================

/** Tasas CAE disponibles (decimal). Ej: 0.04 = 4%
 *  P5.1: 4.00%, 4.50%, 5.00%, 5.50% — editables por el broker */
export const CAE_OPTIONS: { valor: number; etiqueta: string; default: boolean }[] = [
  { valor: 0.040, etiqueta: '4.0%', default: true  },
  { valor: 0.045, etiqueta: '4.5%', default: true  },
  { valor: 0.050, etiqueta: '5.0%', default: true  },
  { valor: 0.055, etiqueta: '5.5%', default: false },
]

/** Porcentajes de pie disponibles (decimal). Ej: 0.10 = 10% */
export const PIE_OPTIONS: { valor: number; etiqueta: string; default: boolean }[] = [
  { valor: 0.00, etiqueta: '0%',  default: false },
  { valor: 0.05, etiqueta: '5%',  default: false },
  { valor: 0.10, etiqueta: '10%', default: true  },
  { valor: 0.15, etiqueta: '15%', default: false },
  { valor: 0.20, etiqueta: '20%', default: false },
  { valor: 0.25, etiqueta: '25%', default: false },
  { valor: 0.30, etiqueta: '30%', default: false },
  { valor: 0.35, etiqueta: '35%', default: false },
  { valor: 0.40, etiqueta: '40%', default: false },
]

/** Plazos hipotecarios disponibles (años) — P5.2: fijados por bancos, no por inmobiliaria */
export const PLAZO_OPTIONS: { valor: number; etiqueta: string; default: boolean }[] = [
  { valor: 20, etiqueta: '20 años', default: false },
  { valor: 25, etiqueta: '25 años', default: false },
  { valor: 30, etiqueta: '30 años', default: true  },
]

/** Constantes del modelo de cálculo (extraídas de fórmulas del COTIZADOR Excel) */
export const CONSTANTES = {
  /** Upfront a la Promesa default: 2% del precio de venta (variable por inmob — P4.2) */
  UPFRONT_PCT:          0.02,
  /** Meses de arriendo por año (1 mes vacío asumido) */
  MESES_ARRIENDO_ANIO:  11,
  /** Haircut sobre precio de venta al año 5 */
  HAIRCUT_VENTA:        0.95,
  /** Factor LTV aplicado a la amortización a 60 meses */
  FACTOR_LTV:           0.67,
  /** Plusvalía anual estimada default */
  PLUSVALIA_DEFAULT:    0.02,
} as const

/** Valores default preseleccionados en la UI */
export const DEFAULTS = {
  cae:     CAE_OPTIONS.filter(o => o.default).map(o => o.valor) as [number, number, number],
  pie:     PIE_OPTIONS.find(o => o.default)!.valor,
  plazo:   PLAZO_OPTIONS.find(o => o.default)!.valor,
  upfront: CONSTANTES.UPFRONT_PCT,  // 2% — editable en UI (P4.2)
} as const
