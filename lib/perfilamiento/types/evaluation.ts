// Types for Chilean Mortgage Evaluation System

export interface FormData {
  // Personal
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  edad: number | '';
  estadoCivil: string;
  dependientes: number | '';

  // Laboral
  tipoContrato: string;
  antiguedadMeses: number | '';

  // Ingresos
  rentaLiquida: number | '';
  ingresosVariables: number | '';
  otrosIngresos: number | '';

  // Deudas
  cuotasCreditos: number | '';
  pagoTarjetas: number | '';
  pensiones: number | '';
  otrasObligaciones: number | '';

  // Ahorro
  pieDisponible: number | '';

  // Morosidad
  morosidad: boolean;
  notasMorosidad: string;

  // Complementario
  tieneComplementario: boolean;
  comp_nombre: string;
  comp_rut: string;
  comp_relacion: string;
  comp_rentaLiquida: number | '';
  comp_ingresosVariables: number | '';
  comp_otrosIngresos: number | '';
  comp_cuotasCreditos: number | '';
  comp_pagoTarjetas: number | '';
  comp_pensiones: number | '';
  comp_otrasObligaciones: number | '';
  comp_pieDisponible: number | '';

  // Moneda
  moneda: 'CLP' | 'UF' | 'ambas';
}

export const initialFormData: FormData = {
  nombre: '', rut: '', email: '', telefono: '', edad: '', estadoCivil: 'soltero', dependientes: '',
  tipoContrato: 'dependiente', antiguedadMeses: '',
  rentaLiquida: '', ingresosVariables: '', otrosIngresos: '',
  cuotasCreditos: '', pagoTarjetas: '', pensiones: '', otrasObligaciones: '',
  pieDisponible: '',
  morosidad: false, notasMorosidad: '',
  tieneComplementario: false,
  comp_nombre: '', comp_rut: '', comp_relacion: 'conyuge',
  comp_rentaLiquida: '', comp_ingresosVariables: '', comp_otrosIngresos: '',
  comp_cuotasCreditos: '', comp_pagoTarjetas: '', comp_pensiones: '', comp_otrasObligaciones: '',
  comp_pieDisponible: '',
  moneda: 'ambas',
};

export interface EvalParams {
  porcentajeVariableConsiderado: number;
  considerarOtrosIngresos: boolean;
  // Ratio 1: Dividendo / Renta Evaluable
  dividendoRentaMaximo: number;       // 0.30 = 30%
  dividendoRentaTolerancia: number;   // 0.05 = 5%
  // Ratio 2: Carga Financiera Total (deudas + dividendo) / Renta Evaluable
  cargaTotalRentaMaximo: number;      // 0.50 = 50%
  cargaTotalRentaTolerancia: number;  // 0.05 = 5%
  tasaAnual: number;
  plazoMeses: number;
  ltvMaximo: number;
  pieMinimoPorcentaje: number;
  rechazarConMorosidad: boolean;
  edadMaxima: number;
  antiguedadMinimaMeses: number;
  redondeo: number;
}

export type ResultadoEvaluacion = 'apto' | 'apto_con_condiciones' | 'no_apto';

export interface UFData {
  valor: number;
  fecha: string;
  fuente: string;
}

export interface EvaluationOutput {
  resultado: ResultadoEvaluacion;
  razones: string[];

  ingresoEvaluable: number;
  cargaSinHipotecario: number;
  rciSinHipotecario: number;

  dividendoMaximo: number;
  dividendoRentaRatio: number;        // dividendo / renta
  cargaTotalRentaRatio: number;       // (deudas + dividendo) / renta
  creditoMaximo: number;
  propiedadMaxPorPie: number;
  propiedadMaxPorLtv: number;
  propiedadMaxFinal: number;
  /** pie + crédito máximo: capacidad total de compra */
  propiedadMaxCapacidad: number;

  // Combinado (if complementario)
  ingresoEvaluableCombinado?: number;
  cargaSinHipotecarioCombinada?: number;
  rciSinHipotecarioCombinado?: number;
  dividendoMaximoCombinado?: number;
  creditoMaximoCombinado?: number;
  propiedadMaxPorPieCombinada?: number;
  propiedadMaxPorLtvCombinada?: number;
  propiedadMaxFinalCombinada?: number;
  /** pie total (ambos) + crédito combinado */
  propiedadMaxCapacidadCombinada?: number;

  ufUsada: UFData;
  params: EvalParams;
}
