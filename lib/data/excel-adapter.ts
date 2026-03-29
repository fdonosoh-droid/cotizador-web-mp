// ============================================================
// EXCEL ADAPTER — lee INPUT_FILES.xlsx con SheetJS
// Solo se ejecuta en el servidor (Server Components / API routes)
// ============================================================

import * as XLSX from 'xlsx'
import path from 'path'
import type { IStockRepository } from './repository'
import type {
  StockRow,
  CondicionComercialRow,
  ProyectoRow,
  UnidadCotizable,
} from './types'

// ---------- helpers ----------------------------------------------------------

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '' || v === '#N/A') return null
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v)
  return isFinite(n) ? n : null
}

function parseStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

/** Convierte dormitorios crudo en num + display */
function parseDormitorios(raw: unknown): { dormitoriosNum: number | null; dormitoriosDisplay: string | null } {
  const s = parseStr(raw)
  if (!s || s === '#N/A') return { dormitoriosNum: null, dormitoriosDisplay: null }
  // Casos: '0', '1', '2', '3', '4', '1-1/2', '2-1/2', 'BO', 'EST'
  const num = parseFloat(s.replace('-1/2', '.5').replace(',', '.'))
  return {
    dormitoriosNum: isFinite(num) ? num : null,
    dormitoriosDisplay: s,
  }
}

// ---------- carga lazy del workbook -----------------------------------------

let _workbook: XLSX.WorkBook | null = null

function getWorkbook(): XLSX.WorkBook {
  if (_workbook) return _workbook
  const filePath = path.join(process.cwd(), 'INPUT_FILES.xlsx')
  _workbook = XLSX.readFile(filePath, { cellDates: true, dense: false })
  return _workbook
}

// ---------- parsers por hoja -------------------------------------------------

function loadStock(): StockRow[] {
  const wb = getWorkbook()
  const ws = wb.Sheets['STOCK NUEVOS']
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })
  return raw.map((r) => {
    const dorm = parseDormitorios(r['DORMITORIOS'])
    return {
      alianza:            parseStr(r['ALIANZA']),
      nemotecnico:        parseStr(r['NEMOTECNICO']),
      nombreProyecto:     parseStr(r['NOMBRE PROYECTO']),
      tipoEntrega:        parseStr(r['TIPO ENTREGA']),
      periodoEntrega:     parseStr(r['PERIODO ENTREGA']),
      direccion:          parseStr(r['DIRECCION']),
      comuna:             parseStr(r['COMUNA']),
      estadoStock:        parseStr(r['ESTADO STOCK']),
      tipoUnidad:         parseStr(r['TIPO UNIDAD']),
      programa:           parseStr(r['PROGRAMA']),
      pisoProducto:       parseNum(r['PISO PRODUCTO']),
      numeroUnidad:       parseNum(r['NUMERO UNIDAD']),
      orientacion:        parseStr(r['ORIENTACION']) || null,
      dormitorios:        parseStr(r['DORMITORIOS']) || null,
      dormitoriosNum:     dorm.dormitoriosNum,
      dormitoriosDisplay: dorm.dormitoriosDisplay,
      banos:              parseNum(r['BA\u00d1OS']),
      precioLista:        parseNum(r['PRECIO LISTA']) ?? 0,
      superficieTerreno:  parseNum(r['SUPERFICIE TERRENO']),
      superficieUtil:     parseNum(r['SUPERFICIE UTIL']),
      superficieTerraza:  parseNum(r['SUPERFICIE TERRAZA']),
      superficieTotal:    parseNum(r['SUPERFICIE TOTAL']),
      bienesConjuntos:    parseStr(r['BIENES CONJUNTOS']) || null,
    }
  })
}

function loadCondiciones(): CondicionComercialRow[] {
  const wb = getWorkbook()
  const ws = wb.Sheets['CONDICIONES_COMERCIALES']
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })
  return raw.map((r) => ({
    alianza:                parseStr(r['ALIANZA']),
    nemotecnico:            parseStr(r['NEMOTECNICO']),
    nombreProyecto:         parseStr(r['NOMBRE PROYECTO']),
    estadoProyecto:         parseStr(r['ESTADO PROYECTO']),
    tipoUnidad:             parseStr(r['TIPO UNIDAD']),
    programa:               parseStr(r['PROGRAMA']),
    reserva:                parseNum(r['RESERVA']) ?? 0,
    descuento:              parseNum(r['DESCUENTO']) ?? 0,
    bonoPie:                parseNum(r['BONO PIE']) ?? 0,
    cuotasPie:              parseNum(r['CUOTAS PIE']) ?? 0,
    piePeriodoConstruccion: parseNum(r['PIE PER\u00cdODO CONSTRUCCI\u00d3N']) ?? 0,
    cuoton:                 parseNum(r['CUOT\u00d3N']) ?? 0,
    pieCreditoDirecto:      parseNum(r['PIE CR\u00c9DITO DIRECTO']) ?? 0,
  }))
}

function loadProyectos(): ProyectoRow[] {
  const wb = getWorkbook()
  const ws = wb.Sheets['PROYECTOS']
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })
  return raw.map((r) => ({
    alianza:        parseStr(r['ALIANZA']),
    nombreProyecto: parseStr(r['NOMBRE PROYECTO']),
    nemotecnico:    parseStr(r['NEMOTECNICO']),
    comuna:         parseStr(r['COMUNA']),
    direccion:      parseStr(r['DIRECCION']),
    tipoEntrega:    parseStr(r['TIPO ENTREGA']),
    periodoEntrega: parseStr(r['PERIODO ENTREGA']),
  }))
}

function loadUF(): { fecha: Date; valor: number }[] {
  const wb = getWorkbook()
  const ws = wb.Sheets['UF']
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })
  return raw
    .map((r) => ({
      fecha: r['FECHA'] instanceof Date ? r['FECHA'] : new Date(parseStr(r['FECHA'])),
      valor: parseNum(r['VALOR']) ?? 0,
    }))
    .filter((r) => r.valor > 0)
}

// ---------- cached data -------------------------------------------------------

let _stock: StockRow[] | null = null
let _condiciones: CondicionComercialRow[] | null = null
let _proyectos: ProyectoRow[] | null = null
let _uf: { fecha: Date; valor: number }[] | null = null

function stock(): StockRow[] {
  if (!_stock) _stock = loadStock()
  return _stock
}
function condiciones(): CondicionComercialRow[] {
  if (!_condiciones) _condiciones = loadCondiciones()
  return _condiciones
}
function proyectos(): ProyectoRow[] {
  if (!_proyectos) _proyectos = loadProyectos()
  return _proyectos
}
function uf(): { fecha: Date; valor: number }[] {
  if (!_uf) _uf = loadUF()
  return _uf
}

// ---------- distinct helper --------------------------------------------------

function distinct<T>(arr: T[]): T[] {
  return [...new Set(arr)].sort()
}

// ---------- ExcelAdapter -----------------------------------------------------

export class ExcelAdapter implements IStockRepository {
  async getComunas(): Promise<string[]> {
    return distinct(proyectos().map((p) => p.comuna).filter(Boolean))
  }

  async getEntregas(comuna: string): Promise<string[]> {
    return distinct(
      proyectos()
        .filter((p) => p.comuna === comuna)
        .map((p) => p.tipoEntrega)
        .filter(Boolean),
    )
  }

  async getInmobiliarias(comuna: string, entrega: string): Promise<string[]> {
    return distinct(
      proyectos()
        .filter((p) => p.comuna === comuna && p.tipoEntrega === entrega)
        .map((p) => p.alianza)
        .filter(Boolean),
    )
  }

  async getProyectos(
    comuna: string,
    entrega: string,
    inmobiliaria: string,
  ): Promise<ProyectoRow[]> {
    return proyectos()
      .filter(
        (p) =>
          p.comuna === comuna &&
          p.tipoEntrega === entrega &&
          p.alianza === inmobiliaria,
      )
      .sort((a, b) => a.nombreProyecto.localeCompare(b.nombreProyecto))
  }

  async getUnidades(nemotecnico: string): Promise<UnidadCotizable[]> {
    const stockRows = stock().filter(
      (s) => s.nemotecnico === nemotecnico && s.estadoStock === 'Disponible',
    )

    // Build a lookup map for condiciones: key = `${nemotecnico}|${tipoUnidad}|${programa}`
    const condMap = new Map<string, CondicionComercialRow>()
    for (const c of condiciones()) {
      const key = `${c.nemotecnico}|${c.tipoUnidad}|${c.programa}`
      condMap.set(key, c)
    }

    return stockRows.map((s) => {
      const key = `${s.nemotecnico}|${s.tipoUnidad}|${s.programa}`
      const cond = condMap.get(key)
      return {
        ...s,
        reserva:                cond?.reserva               ?? 0,
        descuento:              cond?.descuento              ?? 0,
        bonoPie:                cond?.bonoPie                ?? 0,
        cuotasPie:              cond?.cuotasPie              ?? 0,
        piePeriodoConstruccion: cond?.piePeriodoConstruccion ?? 0,
        cuoton:                 cond?.cuoton                 ?? 0,
        pieCreditoDirecto:      cond?.pieCreditoDirecto      ?? 0,
      }
    })
  }

  async getUFdelDia(): Promise<number> {
    const rows = uf()
    if (rows.length === 0) return 0
    // Buscar valor de hoy; si no existe, tomar el más reciente
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayRow = rows.find((r) => {
      const d = new Date(r.fecha)
      d.setHours(0, 0, 0, 0)
      return d.getTime() === today.getTime()
    })
    if (todayRow) return todayRow.valor
    // Fallback: último valor disponible
    return rows[rows.length - 1].valor
  }
}
