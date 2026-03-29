// ============================================================
// DATA LAYER INDEX — exporta el adaptador activo
// Cambiar a PgAdapter cuando se migre a PostgreSQL
// ============================================================

import { ExcelAdapter } from './excel-adapter'
import type { IStockRepository } from './repository'

// Singleton del repositorio activo
export const stockRepository: IStockRepository = new ExcelAdapter()

// Re-export types for convenience
export type { IStockRepository } from './repository'
export type {
  StockRow,
  CondicionComercialRow,
  ProyectoRow,
  UnidadCotizable,
  UFRow,
} from './types'
