import type { FormData, EvalParams, EvaluationOutput, ResultadoEvaluacion, UFData } from './types/evaluation';

// ── Default Parameters ──────────────────────────────────────────
export const defaultParams: EvalParams = {
  porcentajeVariableConsiderado: 0.5,
  considerarOtrosIngresos: true,
  dividendoRentaMaximo: 0.30,       // 30%
  dividendoRentaTolerancia: 0.05,   // 5%
  cargaTotalRentaMaximo: 0.50,      // 50%
  cargaTotalRentaTolerancia: 0.05,  // 5%
  tasaAnual: 0.045,
  plazoMeses: 240,
  ltvMaximo: 0.80,
  pieMinimoPorcentaje: 0.20,
  rechazarConMorosidad: true,
  edadMaxima: 65,
  antiguedadMinimaMeses: 12,
  redondeo: 0,
};

// ── Formatters ─────────────────────────────────────────────────
export function formatCLP(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('es-CL');
}

export function formatUF(amount: number): string {
  return amount.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' UF';
}

export function clpToUf(clp: number, ufVal: number): number {
  return clp / ufVal;
}

export function ufToClp(uf: number, ufVal: number): number {
  return uf * ufVal;
}

export function formatPercent(v: number): string {
  return (v * 100).toFixed(1) + '%';
}

// ── Helpers ────────────────────────────────────────────────────
const num = (v: number | ''): number => (v === '' ? 0 : Number(v));

function calcIngresoEvaluable(
  rentaLiquida: number | '',
  ingresosVariables: number | '',
  otrosIngresos: number | '',
  params: EvalParams
): number {
  const fijo = num(rentaLiquida);
  const variable = num(ingresosVariables) * params.porcentajeVariableConsiderado;
  const otros = params.considerarOtrosIngresos ? num(otrosIngresos) : 0;
  return fijo + variable + otros;
}

function calcCarga(
  cuotasCreditos: number | '',
  pagoTarjetas: number | '',
  pensiones: number | '',
  otrasObligaciones: number | ''
): number {
  return num(cuotasCreditos) + num(pagoTarjetas) + num(pensiones) + num(otrasObligaciones);
}

function calcCreditoMaximo(dividendoMax: number, params: EvalParams): number {
  if (dividendoMax <= 0) return 0;
  const i = params.tasaAnual / 12;
  const n = params.plazoMeses;
  return dividendoMax * ((1 - Math.pow(1 + i, -n)) / i);
}

/**
 * Calcula el dividendo máximo respetando AMBOS ratios:
 * 1) Dividendo/Renta ≤ dividendoRentaMaximo (30%)
 * 2) (Deudas + Dividendo)/Renta ≤ cargaTotalRentaMaximo (50%)
 * El dividendo máximo es el menor de ambos topes.
 */
function calcDividendoMaximo(ingreso: number, carga: number, params: EvalParams): number {
  if (ingreso <= 0) return 0;
  const topePorDividendo = ingreso * params.dividendoRentaMaximo;
  const topePorCargaTotal = ingreso * params.cargaTotalRentaMaximo - carga;
  return Math.max(0, Math.min(topePorDividendo, topePorCargaTotal));
}

// ── Main Evaluation ────────────────────────────────────────────
export function evaluar(data: FormData, params: EvalParams = defaultParams, ufData?: UFData): EvaluationOutput {
  const uf = ufData ?? { valor: 0, fecha: new Date().toISOString(), fuente: 'no especificada' };
  const razones: string[] = [];
  let resultado: ResultadoEvaluacion = 'apto';

  // ── Solo ──
  const ingresoEvaluable = calcIngresoEvaluable(data.rentaLiquida, data.ingresosVariables, data.otrosIngresos, params);
  const cargaSinHipotecario = calcCarga(data.cuotasCreditos, data.pagoTarjetas, data.pensiones, data.otrasObligaciones);
  const rciSinHipotecario = ingresoEvaluable > 0 ? cargaSinHipotecario / ingresoEvaluable : 1;

  const dividendoMaximo = calcDividendoMaximo(ingresoEvaluable, cargaSinHipotecario, params);
  const creditoMaximo = calcCreditoMaximo(dividendoMaximo, params);
  const pieDisp = num(data.pieDisponible);

  const propiedadMaxPorPie = params.pieMinimoPorcentaje > 0 ? pieDisp / params.pieMinimoPorcentaje : 0;
  const propiedadMaxPorLtv = params.ltvMaximo > 0 ? creditoMaximo / params.ltvMaximo : 0;
  const propiedadMaxFinal = Math.min(propiedadMaxPorPie, propiedadMaxPorLtv);
  // Capacidad total: pie ingresado + crédito máximo (90% financiamiento hipotecario)
  const propiedadMaxCapacidad = pieDisp + creditoMaximo;

  const dividendoRentaRatio = ingresoEvaluable > 0 ? dividendoMaximo / ingresoEvaluable : 1;
  const cargaTotalRentaRatio = ingresoEvaluable > 0 ? (cargaSinHipotecario + dividendoMaximo) / ingresoEvaluable : 1;

  // ── Combinado ──
  let combinado: Partial<EvaluationOutput> = {};
  if (data.tieneComplementario) {
    const ingComp = calcIngresoEvaluable(data.comp_rentaLiquida, data.comp_ingresosVariables, data.comp_otrosIngresos, params);
    const cargaComp = calcCarga(data.comp_cuotasCreditos, data.comp_pagoTarjetas, data.comp_pensiones, data.comp_otrasObligaciones);

    const ingComb = ingresoEvaluable + ingComp;
    const cargaComb = cargaSinHipotecario + cargaComp;
    const rciComb = ingComb > 0 ? cargaComb / ingComb : 1;

    const divMaxComb = calcDividendoMaximo(ingComb, cargaComb, params);
    const credMaxComb = calcCreditoMaximo(divMaxComb, params);
    const pieComb = pieDisp + num(data.comp_pieDisponible);

    const propMaxPieComb = params.pieMinimoPorcentaje > 0 ? pieComb / params.pieMinimoPorcentaje : 0;
    const propMaxLtvComb = params.ltvMaximo > 0 ? credMaxComb / params.ltvMaximo : 0;
    const propMaxComb = Math.min(propMaxPieComb, propMaxLtvComb);

    combinado = {
      ingresoEvaluableCombinado: ingComb,
      cargaSinHipotecarioCombinada: cargaComb,
      rciSinHipotecarioCombinado: rciComb,
      dividendoMaximoCombinado: divMaxComb,
      creditoMaximoCombinado: credMaxComb,
      propiedadMaxPorPieCombinada: propMaxPieComb,
      propiedadMaxPorLtvCombinada: propMaxLtvComb,
      propiedadMaxFinalCombinada: propMaxComb,
      propiedadMaxCapacidadCombinada: pieComb + credMaxComb,
    };
  }

  // ── Rules ──
  if (data.morosidad && params.rechazarConMorosidad) {
    resultado = 'no_apto';
    razones.push('Presenta morosidades vigentes');
  }
  if (num(data.edad) > params.edadMaxima) {
    resultado = 'no_apto';
    razones.push(`Edad (${num(data.edad)}) supera máximo de ${params.edadMaxima} años`);
  }
  if (num(data.antiguedadMeses) < params.antiguedadMinimaMeses) {
    razones.push(`Antigüedad laboral (${num(data.antiguedadMeses)} meses) inferior al mínimo de ${params.antiguedadMinimaMeses} meses`);
    if (resultado !== 'no_apto') resultado = 'apto_con_condiciones';
  }

  if (rciSinHipotecario > params.cargaTotalRentaMaximo) {
    resultado = 'no_apto';
    razones.push(`Carga financiera actual (${formatPercent(rciSinHipotecario)}) ya supera el umbral máximo de carga total (${formatPercent(params.cargaTotalRentaMaximo)})`);
  }

  if (dividendoMaximo <= 0) {
    resultado = 'no_apto';
    razones.push('Sin capacidad de pago para dividendo hipotecario');
  }
  if (pieDisp <= 0) {
    resultado = 'no_apto';
    razones.push('No dispone de pie/ahorro para la compra');
  }

  if (resultado === 'apto') {
    if (dividendoRentaRatio > params.dividendoRentaMaximo) {
      resultado = 'no_apto';
      razones.push(`Dividendo/Renta (${formatPercent(dividendoRentaRatio)}) supera máximo (${formatPercent(params.dividendoRentaMaximo)})`);
    } else if (dividendoRentaRatio > params.dividendoRentaMaximo - params.dividendoRentaTolerancia) {
      resultado = 'apto_con_condiciones';
      razones.push(`Dividendo/Renta (${formatPercent(dividendoRentaRatio)}) en zona de tolerancia`);
    }

    if (cargaTotalRentaRatio > params.cargaTotalRentaMaximo) {
      resultado = 'no_apto';
      razones.push(`Carga total/Renta (${formatPercent(cargaTotalRentaRatio)}) supera máximo (${formatPercent(params.cargaTotalRentaMaximo)})`);
    } else if (cargaTotalRentaRatio > params.cargaTotalRentaMaximo - params.cargaTotalRentaTolerancia) {
      if (resultado !== 'no_apto') resultado = 'apto_con_condiciones';
      razones.push(`Carga total/Renta (${formatPercent(cargaTotalRentaRatio)}) en zona de tolerancia`);
    }
  }

  if (resultado === 'apto' && razones.length === 0) {
    razones.push('Cumple todos los criterios de evaluación');
  }

  return {
    resultado, razones,
    ingresoEvaluable, cargaSinHipotecario, rciSinHipotecario,
    dividendoMaximo, dividendoRentaRatio, cargaTotalRentaRatio,
    creditoMaximo, propiedadMaxPorPie, propiedadMaxPorLtv, propiedadMaxFinal, propiedadMaxCapacidad,
    ...combinado,
    ufUsada: uf,
    params,
  };
}
