// ============================================================
// MOTOR DE CÁLCULO — COTIZADOR MERCADO PRIMARIO
// Fórmulas extraídas directamente de INPUT_FILES.xlsx → hoja COTIZADOR
// Verificadas celda a celda (ver MAESTRO_DESARROLLO_COTIZADOR.md Etapa 3)
// ============================================================

import { CONSTANTES } from '@/lib/config/cotizadorConfig'

// ---------- tipos entrada/salida -----------------------------------------

export interface InputCotizacion {
  /** Unidad principal (departamento) */
  precioListaDepto:   number   // UF
  descuentoPct:       number   // decimal: 0.05 = 5%  (condición comercial)
  descuentoAdicionalPct: number  // decimal: extra negociado; se acumula al anterior (P3.A3)
  bonoPiePct:         number   // decimal: 0.10 = 10%
  reservaCLP:         number   // pesos chilenos

  /** Bienes conjuntos obligatorios (estac/bodega) — precio sin descuento */
  preciosConjuntos:   number[] // UF, puede ser []

  /** Parámetros de la cotización */
  piePct:             number   // decimal: 0.10 = 10%
  upfrontPct:         number   // decimal: % del valor venta que se paga en promesa (variable por inmob, P4.2)
  plazoAnios:         number   // 20 | 25 | 30
  tasasCAE:           [number, number, number]  // ej. [0.04, 0.045, 0.05]
  valorUF:            number   // CLP por 1 UF

  /** Modalidades especiales (P3.C1–P3.C3) */
  cuotonPct:                 number   // decimal — pago único adicional a la inmobiliaria (P3.C2)
  piePeriodoConstruccionPct: number   // decimal — pie adicional en cuotas decrecientes (P3.C1)
  pieCreditoDirectoPct:      number   // decimal — % financiado directamente por inmobiliaria (P3.C3)
  cuotasPieN:                number   // cantidad de cuotas del saldo de pie (editables en UI)

  /** Evaluación de inversión — un arriendo estimado por escenario CAE */
  arriendosMensualesCLP: [number, number, number]
  plusvaliaAnual:        number   // decimal, default 0.02
}

/** Resultado de un escenario CAE */
export interface EscenarioCAE {
  cae:                number   // decimal
  arriendoMensualCLP: number   // arriendo estimado para este escenario
  cuotaMensualCLP:    number
  cuotaMensualUF:     number
  flujoMensualCLP:    number   // arriendo - cuota
  flujoAcumuladoCLP:  number   // flujo * 11 * 5
  capRate:            number   // (arriendo*11/uf) / tasacion
  roi5Anios:          number   // decimal
  roiAnual:           number   // decimal
}

export interface ResultadoCotizacion {
  // ── A. Precios lista ─────────────────────────────────────
  precioListaDepto:    number  // UF
  precioListaOtros:    number  // UF (sum bienes conjuntos)
  precioListaTotal:    number  // UF

  /** Valor UF usado en el cálculo (para conversiones en UI) */
  valorUF:             number

  // ── B. Con descuento ─────────────────────────────────────
  precioDescDepto:     number  // UF  (depto * (1-desc))
  precioDescOtros:     number  // UF  (sin descuento)
  valorVentaUF:        number  // UF  total post-descuento  [E39]
  valorVentaCLP:       number

  // ── C. Pie ───────────────────────────────────────────────
  piePct:              number
  upfrontPct:          number  // % upfront (variable por inmob)
  pieTotalUF:          number  // valorVenta * piePct       [E40]
  reservaUF:           number  // reservaCLP / valorUF      [E41]
  upfrontUF:           number  // valorVenta * upfrontPct   [E42]
  saldoPieUF:          number  // pieTotalUF - reserva - upfront [E43]
  saldoPieCLP:         number
  cuotasPieN:          number  // cantidad de cuotas del pie saldo
  valorCuotaPieUF:     number  // saldoPie / cuotasPieN     [E58]
  valorCuotaPieCLP:    number

  // ── C2. Modalidades especiales (P3.C1–P3.C3) ─────────────
  /** CUOTÓN: pago único adicional a la inmobiliaria en promesa/escritura (P3.C2) */
  cuotonUF:                   number
  cuotonCLP:                  number
  /** PIE PERÍODO CONSTRUCCIÓN: pie adicional en cuotas decrecientes durante construcción (P3.C1) */
  piePeriodoConstruccionUF:   number
  piePeriodoConstruccionCLP:  number
  /** PIE CRÉDITO DIRECTO: % del valor financiado directamente por la inmobiliaria (P3.C3) */
  pieCreditoDirectoUF:        number
  pieCreditoDirectoCLP:       number
  /** Pie total pagado a la inmobiliaria (incluye extras) — base para creditoHipFinal */
  totalPieInmobUF:            number

  // ── D. Crédito hipotecario & tasación ────────────────────
  descuentoAdicionalPct: number // descuento extra negociado (P3.A3)
  bonoPieUF:           number  // valorVenta * bonoPie%      (aporte inmobiliaria al banco)
  saldoAporteInmobUF:  number  // igual a bonoPieUF          [E48]
  tasacionUF:          number  // valorVenta + bonoPie        [P3.B4]
  tasacionCLP:         number
  creditoHipBaseUF:    number  // valorVenta*(1-pie)         (referencia)
  creditoHipFinalUF:   number  // tasacion - totalPieInmob   [P5.3]
  creditoHipFinalCLP:  number

  // ── E. Escenarios CAE (3 columnas) ───────────────────────
  escenarios:          [EscenarioCAE, EscenarioCAE, EscenarioCAE]

  // ── F. Evaluación común (usa valores de los 3 escenarios) ─
  plusvaliaAcumulada:  number
  precioVentaAnio5CLP: number  // valorVentaCLP*(1+plus)^5*0.95 [E82]
  piePagadoCLP:        number  // pieTotalUF * valorUF
  // capRate está por escenario en EscenarioCAE
}

// ---------- función PMT (equivalente Excel) ------------------------------

/**
 * Calcula la cuota de una anualidad.
 * @param tasa  tasa mensual (cae / 12)
 * @param n     número de periodos (meses)
 * @param pv    valor presente (positivo)
 * @returns     cuota mensual (positivo = pago)
 */
function pmt(tasa: number, n: number, pv: number): number {
  if (tasa === 0) return pv / n
  return (pv * tasa) / (1 - Math.pow(1 + tasa, -n))
}

// ---------- motor principal -----------------------------------------------

export function calcularCotizacion(input: InputCotizacion): ResultadoCotizacion {
  const {
    precioListaDepto, descuentoPct, descuentoAdicionalPct, bonoPiePct, reservaCLP,
    preciosConjuntos, piePct, upfrontPct, plazoAnios, tasasCAE, valorUF,
    cuotonPct, piePeriodoConstruccionPct, pieCreditoDirectoPct, cuotasPieN,
    arriendosMensualesCLP, plusvaliaAnual,
  } = input

  // ── A. Precios lista ──────────────────────────────────────────────────
  const precioListaOtros = preciosConjuntos.reduce((s, p) => s + p, 0)
  const precioListaTotal = precioListaDepto + precioListaOtros

  // ── B. Descuento (solo al depto — P3.A1; acumula adicional — P3.A3) ──
  const descTotalPct     = Math.min(descuentoPct + descuentoAdicionalPct, 1)
  const precioDescDepto  = precioListaDepto * (1 - descTotalPct)
  const precioDescOtros  = precioListaOtros  // sin descuento
  const valorVentaUF     = precioDescDepto + precioDescOtros          // E39
  const valorVentaCLP    = valorVentaUF * valorUF

  // ── C. Pie ────────────────────────────────────────────────────────────
  const pieTotalUF       = valorVentaUF * piePct                       // E40
  const reservaUF        = reservaCLP / valorUF                        // E41
  const upfrontUF        = Math.round(valorVentaUF * upfrontPct * 100) / 100  // E42 — variable (P4.2)
  const saldoPieUF       = pieTotalUF - reservaUF - upfrontUF          // E43
  const saldoPieCLP      = saldoPieUF * valorUF

  // Cuotas del pie: viene del input (editable en UI, default de condición comercial)
  const valorCuotaPieUF  = cuotasPieN > 0 ? saldoPieUF / cuotasPieN : saldoPieUF  // E58
  const valorCuotaPieCLP = valorCuotaPieUF * valorUF

  // ── C2. Modalidades especiales de pie (P3.C1–P3.C3) ──────────────────
  // CUOTÓN (P3.C2): pago único adicional a la inmobiliaria en promesa/escritura
  const cuotonUF                  = Math.round(valorVentaUF * cuotonPct * 100) / 100
  const cuotonCLP                 = Math.round(cuotonUF * valorUF)
  // PIE PERÍODO CONSTRUCCIÓN (P3.C1): pie adicional en cuotas decrecientes; se suma al estándar
  const piePeriodoConstruccionUF  = Math.round(valorVentaUF * piePeriodoConstruccionPct * 100) / 100
  const piePeriodoConstruccionCLP = Math.round(piePeriodoConstruccionUF * valorUF)
  // PIE CRÉDITO DIRECTO (P3.C3): % que financia la inmobiliaria directamente al comprador
  const pieCreditoDirectoUF       = Math.round(valorVentaUF * pieCreditoDirectoPct * 100) / 100
  const pieCreditoDirectoCLP      = Math.round(pieCreditoDirectoUF * valorUF)

  // Total pie pagado a la inmobiliaria: estándar + cuotón + construcción
  // (crédito directo es financiamiento separado, no reduce el crédito hipotecario bancario)
  const totalPieInmobUF = pieTotalUF + cuotonUF + piePeriodoConstruccionUF

  // ── D. Crédito & tasación ────────────────────────────────────────────
  // P3.B4: tasación = valor de venta + aporte bono pie de la inmobiliaria
  const bonoPieUF          = Math.round(valorVentaUF * bonoPiePct * 100) / 100
  const saldoAporteInmobUF = bonoPieUF                                 // E48
  const tasacionUF         = valorVentaUF + bonoPieUF                  // P3.B4
  const tasacionCLP        = tasacionUF * valorUF
  // creditoHipBase se mantiene como referencia (valor a financiar sin bono)
  const creditoHipBaseUF   = valorVentaUF * (1 - piePct)              // E44 (referencia)
  // P5.3: el banco presta sobre la tasación, menos lo que el cliente ya pagó de pie
  const creditoHipFinalUF  = tasacionUF - totalPieInmobUF             // P5.3
  const creditoHipFinalCLP = creditoHipFinalUF * valorUF

  // ── E. Evaluación común ───────────────────────────────────────────────
  const plusvaliaAcumulada  = Math.pow(1 + plusvaliaAnual, 5) - 1     // E81
  const precioVentaAnio5CLP = valorVentaCLP * (1 + plusvaliaAcumulada) * CONSTANTES.HAIRCUT_VENTA  // E82
  const piePagadoCLP        = pieTotalUF * valorUF                    // E79 (G40)

  // ── F. 3 escenarios CAE (cada uno con su propio arriendo y cap rate) ──
  const escenarios = tasasCAE.map((cae, i): EscenarioCAE => {
    const arriendoCLP = arriendosMensualesCLP[i]
    const n = plazoAnios * 12
    const cuotaMensualCLP   = pmt(cae / 12, n, creditoHipFinalCLP)    // E66
    const cuotaMensualUF    = cuotaMensualCLP / valorUF                // E67
    const flujoMensualCLP   = arriendoCLP - cuotaMensualCLP            // E73
    const flujoAcumuladoCLP = flujoMensualCLP * CONSTANTES.MESES_ARRIENDO_ANIO * 5  // E77
    const capRate           = tasacionUF > 0
      ? (arriendoCLP * CONSTANTES.MESES_ARRIENDO_ANIO / valorUF) / tasacionUF  // E86
      : 0

    const capitalGain = precioVentaAnio5CLP - valorVentaCLP
    const equityBase  = totalPieInmobUF * valorUF
    const roi5Anios   = equityBase > 0
      ? Math.round((capitalGain + flujoAcumuladoCLP) / equityBase * 10000) / 10000
      : 0
    const roiAnual    = roi5Anios > -1
      ? Math.round((Math.pow(1 + roi5Anios, 1 / 5) - 1) * 10000) / 10000
      : -1

    return {
      cae,
      arriendoMensualCLP: arriendoCLP,
      cuotaMensualCLP:    Math.round(cuotaMensualCLP),
      cuotaMensualUF:     Math.round(cuotaMensualUF * 100) / 100,
      flujoMensualCLP:    Math.round(flujoMensualCLP),
      flujoAcumuladoCLP:  Math.round(flujoAcumuladoCLP),
      capRate:            Math.round(capRate * 10000) / 10000,
      roi5Anios,
      roiAnual,
    }
  }) as [EscenarioCAE, EscenarioCAE, EscenarioCAE]

  return {
    valorUF,
    precioListaDepto,
    precioListaOtros,
    precioListaTotal,
    precioDescDepto:              Math.round(precioDescDepto * 100) / 100,
    precioDescOtros,
    valorVentaUF:                 Math.round(valorVentaUF * 100) / 100,
    valorVentaCLP:                Math.round(valorVentaCLP),
    piePct,
    upfrontPct,
    pieTotalUF:                   Math.round(pieTotalUF * 100) / 100,
    reservaUF:                    Math.round(reservaUF * 100) / 100,
    upfrontUF,
    saldoPieUF:                   Math.round(saldoPieUF * 100) / 100,
    saldoPieCLP:                  Math.round(saldoPieCLP),
    cuotasPieN,
    valorCuotaPieUF:              Math.round(valorCuotaPieUF * 100) / 100,
    valorCuotaPieCLP:             Math.round(valorCuotaPieCLP),
    cuotonUF,
    cuotonCLP,
    piePeriodoConstruccionUF,
    piePeriodoConstruccionCLP,
    pieCreditoDirectoUF,
    pieCreditoDirectoCLP,
    totalPieInmobUF:              Math.round(totalPieInmobUF * 100) / 100,
    descuentoAdicionalPct,
    bonoPieUF,
    saldoAporteInmobUF:           Math.round(saldoAporteInmobUF * 100) / 100,
    tasacionUF:                   Math.round(tasacionUF * 100) / 100,
    tasacionCLP:                  Math.round(tasacionCLP),
    creditoHipBaseUF:             Math.round(creditoHipBaseUF * 100) / 100,
    creditoHipFinalUF:            Math.round(creditoHipFinalUF * 100) / 100,
    creditoHipFinalCLP:           Math.round(creditoHipFinalCLP),
    escenarios,
    plusvaliaAcumulada:           Math.round(plusvaliaAcumulada * 10000) / 10000,
    precioVentaAnio5CLP:          Math.round(precioVentaAnio5CLP),
    piePagadoCLP:                 Math.round(totalPieInmobUF * valorUF),
  }
}
