// ============================================================
// ISTOCK REPOSITORY — interfaz del repositorio de datos
// Implementaciones: ExcelAdapter (dev) | PgAdapter (prod)
// ============================================================

import type { ProyectoRow, UnidadCotizable, ReglaInmobiliariaRow, ParametroCalculoRow } from './types'

export interface IStockRepository {
  /** Paso 1 de la cascada: comunas disponibles */
  getComunas(): Promise<string[]>

  /** Paso 2: tipos de entrega para una comuna */
  getEntregas(comuna: string): Promise<string[]>

  /** Paso 3: inmobiliarias que tienen proyectos en comuna + entrega */
  getInmobiliarias(comuna: string, entrega: string): Promise<string[]>

  /** Paso 4: proyectos filtrados por los 3 parámetros anteriores */
  getProyectos(
    comuna: string,
    entrega: string,
    inmobiliaria: string,
  ): Promise<ProyectoRow[]>

  /** Paso 5: unidades cotizables de un proyecto (join stock + condiciones) */
  getUnidades(nemotecnico: string): Promise<UnidadCotizable[]>

  /**
   * Paso 5b: bienes conjuntos obligatorios de una unidad.
   * Parsea el campo bienesConjuntos ("B - 64", "E - 50") y retorna
   * las unidades asociadas (Bodega/Estacionamiento) con su precio lista.
   */
  getBienesConjuntos(
    nemotecnico: string,
    bienesConjuntosRaw: string,
  ): Promise<UnidadCotizable[]>

  /** Valor UF del día (o el último disponible si hoy no está en la BD) */
  getUFdelDia(): Promise<number>

  /** Reglas de cálculo por inmobiliaria (hoja REGLAS_INMOBILIARIAS) */
  getReglasInmobiliarias(): Promise<ReglaInmobiliariaRow[]>

  /** Parámetros del motor de cálculo (hoja PARAMETROS_CALCULO) */
  getParametrosCalculo(): Promise<ParametroCalculoRow[]>
}
