import type { PropertyFormData, PropertyEvalOutput } from './types/property-evaluation';
import type { EvalParams, UFData } from './types/evaluation';
import { defaultParams, formatPercent } from './evaluation-engine';

const num = (v: number | ''): number => (v === '' ? 0 : Number(v));

function calcIngresoEvaluable(
  rentaLiquida: number | '', ingresosVariables: number | '', otrosIngresos: number | '', params: EvalParams
): number {
  return num(rentaLiquida) + num(ingresosVariables) * params.porcentajeVariableConsiderado + (params.considerarOtrosIngresos ? num(otrosIngresos) : 0);
}

function calcCarga(c: number | '', t: number | '', p: number | '', o: number | ''): number {
  return num(c) + num(t) + num(p) + num(o);
}

function calcDividendo(credito: number, params: EvalParams): number {
  const i = params.tasaAnual / 12;
  const n = params.plazoMeses;
  if (credito <= 0) return 0;
  return credito * (i / (1 - Math.pow(1 + i, -n)));
}

export function evaluarPropiedad(data: PropertyFormData, uf: UFData, params: EvalParams = defaultParams): PropertyEvalOutput {
  const razones: string[] = [];
  let resultado: 'apto' | 'apto_con_condiciones' | 'no_apto' = 'apto';

  // Property calculations (UF)
  const valorUF = data.valorPropiedadUF;
  const bonoPieUF = valorUF * (data.bonoPiePct / 100);
  const descuentoUF = valorUF * (data.descuentoPct / 100);

  let pieAportadoUF: number;
  if (data.pieMontoManualCLP !== '' && num(data.pieMontoManualCLP) > 0) {
    pieAportadoUF = num(data.pieMontoManualCLP) / uf.valor;
  } else {
    pieAportadoUF = valorUF * (data.piePct / 100);
  }

  const financiamientoUF = Math.max(0, valorUF - bonoPieUF - descuentoUF - pieAportadoUF);
  const financiamientoCLP = financiamientoUF * uf.valor;

  // Solo financial
  const ingresoEvaluable = calcIngresoEvaluable(data.rentaLiquida, data.ingresosVariables, data.otrosIngresos, params);
  const cargaSinHipotecario = calcCarga(data.cuotasCreditos, data.pagoTarjetas, data.pensiones, data.otrasObligaciones);
  const dividendoEstimado = calcDividendo(financiamientoCLP, params);
  const rciSinHipotecario = ingresoEvaluable > 0 ? cargaSinHipotecario / ingresoEvaluable : 1;
  const rciConHipotecario = ingresoEvaluable > 0 ? (cargaSinHipotecario + dividendoEstimado) / ingresoEvaluable : 1;
  const dividendoRentaRatio = ingresoEvaluable > 0 ? dividendoEstimado / ingresoEvaluable : 1;

  // Combinado
  let combinado: Partial<PropertyEvalOutput> = {};
  if (data.tieneComplementario) {
    const ingComp = calcIngresoEvaluable(data.comp_rentaLiquida, data.comp_ingresosVariables, data.comp_otrosIngresos, params);
    const cargaComp = calcCarga(data.comp_cuotasCreditos, data.comp_pagoTarjetas, data.comp_pensiones, data.comp_otrasObligaciones);
    const ingComb = ingresoEvaluable + ingComp;
    const cargaComb = cargaSinHipotecario + cargaComp;
    const divComb = calcDividendo(financiamientoCLP, params);
    const rciComb = ingComb > 0 ? (cargaComb + divComb) / ingComb : 1;
    combinado = {
      ingresoEvaluableCombinado: ingComb,
      cargaSinHipotecarioCombinada: cargaComb,
      dividendoEstimadoCombinado: divComb,
      rciConHipotecarioCombinado: rciComb,
    };
  }

  // Rules
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
  if (financiamientoUF <= 0) {
    razones.push('El financiamiento requerido es cero o negativo (pie y bonos cubren el valor)');
  } else {
    const useRci = data.tieneComplementario && combinado.rciConHipotecarioCombinado != null ? combinado.rciConHipotecarioCombinado : rciConHipotecario;
    const useDivRatio = data.tieneComplementario && combinado.dividendoEstimadoCombinado != null && combinado.ingresoEvaluableCombinado != null
      ? combinado.dividendoEstimadoCombinado / combinado.ingresoEvaluableCombinado
      : dividendoRentaRatio;

    if (useDivRatio > params.dividendoRentaMaximo + params.dividendoRentaTolerancia) {
      resultado = 'no_apto';
      razones.push(`Dividendo/Renta (${formatPercent(useDivRatio)}) supera rechazo (>${formatPercent(params.dividendoRentaMaximo + params.dividendoRentaTolerancia)})`);
    } else if (useDivRatio > params.dividendoRentaMaximo) {
      if (resultado !== 'no_apto') resultado = 'apto_con_condiciones';
      razones.push(`Dividendo/Renta (${formatPercent(useDivRatio)}) en zona de tolerancia`);
    }

    if (useRci > params.cargaTotalRentaMaximo + params.cargaTotalRentaTolerancia) {
      resultado = 'no_apto';
      razones.push(`Carga total/Renta (${formatPercent(useRci)}) supera rechazo (>${formatPercent(params.cargaTotalRentaMaximo + params.cargaTotalRentaTolerancia)})`);
    } else if (useRci > params.cargaTotalRentaMaximo) {
      if (resultado !== 'no_apto') resultado = 'apto_con_condiciones';
      razones.push(`Carga total/Renta (${formatPercent(useRci)}) en zona de tolerancia`);
    }

    const ltvActual = financiamientoUF / valorUF;
    if (ltvActual > params.ltvMaximo) {
      if (resultado !== 'no_apto') resultado = 'apto_con_condiciones';
      razones.push(`LTV (${formatPercent(ltvActual)}) supera máximo (${formatPercent(params.ltvMaximo)}). Se requiere mayor pie`);
    }
  }

  if (resultado === 'apto' && razones.length === 0) {
    razones.push('Cumple todos los criterios de evaluación para esta propiedad');
  }

  return {
    resultado, razones,
    valorPropiedadUF: valorUF, bonoPieUF, descuentoUF, pieAportadoUF, financiamientoUF,
    ingresoEvaluable, cargaSinHipotecario, dividendoEstimado, rciSinHipotecario, rciConHipotecario,
    ...combinado,
    ufUsada: uf,
  };
}
