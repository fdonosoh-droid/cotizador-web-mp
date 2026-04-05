// ============================================================
// DATA LAYER INDEX — exporta el adaptador activo
// Selección: variable de entorno DATA_SOURCE
//   DATA_SOURCE=excel    → ExcelAdapter (default, desarrollo)
//   DATA_SOURCE=postgres → PgAdapter (producción)
// ============================================================
// IMPORTANTE: PgAdapter se carga con require() dinámico para
// que el bundler de Next.js no lo incluya en el bundle cliente.
// El módulo 'postgres' usa APIs de Node.js (fs, net, tls) que
// no existen en el browser.
// ============================================================

import type { IStockRepository } from './repository'

function createRepository(): IStockRepository {
  const source = process.env.DATA_SOURCE ?? 'excel'
  if (source === 'postgres') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PgAdapter } = require('./pg-adapter') as typeof import('./pg-adapter')
    return new PgAdapter()
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ExcelAdapter } = require('./excel-adapter') as typeof import('./excel-adapter')
  return new ExcelAdapter()
}

// Singleton del repositorio activo
export const stockRepository: IStockRepository = createRepository()

// Re-export types for convenience
export type { IStockRepository } from './repository'
export type {
  StockRow,
  CondicionComercialRow,
  ProyectoRow,
  UnidadCotizable,
  UFRow,
  ReglaInmobiliariaRow,
  ParametroCalculoRow,
} from './types'
