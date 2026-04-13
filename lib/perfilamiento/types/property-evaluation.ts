import type { FormData } from './evaluation';

// Property-specific evaluation form extends the base form
export interface PropertyFormData extends FormData {
  // Property details
  ubicacion: string;
  tipologia: string;
  valorPropiedadUF: number;

  // Adjustments
  bonoPiePct: number;      // 0-30
  descuentoPct: number;    // 0-30
  piePct: number;          // default 20, adjustable
  pieMontoManualCLP: number | ''; // optional manual CLP override
}

export const initialPropertyFormData: PropertyFormData = {
  nombre: '', rut: '', edad: '', estadoCivil: 'soltero', dependientes: '',
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
  // Property-specific
  ubicacion: '',
  tipologia: 'departamento',
  valorPropiedadUF: 0,
  bonoPiePct: 0,
  descuentoPct: 0,
  piePct: 20,
  pieMontoManualCLP: '',
};

export interface PropertyEvalOutput {
  resultado: 'apto' | 'apto_con_condiciones' | 'no_apto';
  razones: string[];

  // Property breakdown (all in UF)
  valorPropiedadUF: number;
  bonoPieUF: number;
  descuentoUF: number;
  pieAportadoUF: number;
  financiamientoUF: number;

  // Financial (CLP)
  ingresoEvaluable: number;
  cargaSinHipotecario: number;
  dividendoEstimado: number;
  rciSinHipotecario: number;
  rciConHipotecario: number;

  // Combined (if complementario)
  ingresoEvaluableCombinado?: number;
  cargaSinHipotecarioCombinada?: number;
  dividendoEstimadoCombinado?: number;
  rciConHipotecarioCombinado?: number;

  ufUsada: { valor: number; fecha: string; fuente: string };
}
