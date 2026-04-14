import fs   from 'fs'
import path from 'path'

// ── Tipos ────────────────────────────────────────────────────────
export interface PerfilamientoEntry {
  id:                        string
  fecha:                     string   // ISO 8601
  fechaDisplay:              string   // "13-04-2026 17:32"

  // Comprador
  nombre:                    string
  rut:                       string

  // Resultado evaluación
  resultado:                 'apto' | 'apto_con_condiciones' | 'no_apto'
  razones:                   string[]

  // Capacidad calculada (CLP)
  ingresoEvaluable:          number
  dividendoMaximo:           number
  creditoMaximo:             number
  pieDisponible:             number

  // Rangos de búsqueda (UF)
  rangoConservadorUF:        number
  rangoOptimistaUF:          number

  // Co-solicitante
  tieneComplementario:       boolean
  comp_nombre?:              string
  dividendoMaximoCombinado?: number
  creditoMaximoCombinado?:   number

  // Vínculo (se rellena cuando cotiza desde este perfilamiento)
  numeroCotizacion?:         string
}

export interface PerfilamientoResumen {
  id:                 string
  fechaDisplay:       string
  nombre:             string
  rut:                string
  resultado:          PerfilamientoEntry['resultado']
  rangoConservadorUF: number
  rangoOptimistaUF:   number
  tieneComplementario: boolean
  numeroCotizacion?:  string
}

// ── Paths ─────────────────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production'
const BASE   = isProd ? '/tmp' : process.cwd()

const JSON_PATH = path.join(BASE, '.perfilamientos-historial.json')
const CSV_PATH  = path.join(BASE, 'Historial_perfilamientos.csv')

// ── ID generator (sin dependencia externa) ────────────────────────
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// ── Fecha helpers ─────────────────────────────────────────────────
function toDisplay(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}-${mm}-${yy} ${hh}:${mi}`
}

// ── JSON helpers ──────────────────────────────────────────────────
function leerJSON(): PerfilamientoEntry[] {
  try {
    if (!fs.existsSync(JSON_PATH)) return []
    const raw = fs.readFileSync(JSON_PATH, 'utf-8').trim()
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function escribirJSON(entries: PerfilamientoEntry[]): void {
  fs.writeFileSync(JSON_PATH, JSON.stringify(entries, null, 2), 'utf-8')
}

// ── CSV ───────────────────────────────────────────────────────────
function esc(v: string | number | boolean | undefined): string {
  const s = String(v ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

const LABEL_RESULTADO: Record<PerfilamientoEntry['resultado'], string> = {
  apto:                 'Apto',
  apto_con_condiciones: 'Apto con condiciones',
  no_apto:              'No apto',
}

function escribirCSV(entries: PerfilamientoEntry[]): void {
  const headers = [
    'ID', 'Fecha', 'Nombre', 'RUT', 'Resultado',
    'Ingreso Evaluable', 'Dividendo Máx', 'Crédito Máx', 'Pie Disponible',
    'Rango Cons. UF', 'Rango Opt. UF',
    'Co-solicitante', 'Comp. Nombre',
    'Cotización vinculada',
  ].join(',')

  const filas = entries.map(e => [
    esc(e.id),
    esc(e.fechaDisplay),
    esc(e.nombre),
    esc(e.rut),
    esc(LABEL_RESULTADO[e.resultado]),
    esc(Math.round(e.ingresoEvaluable)),
    esc(Math.round(e.dividendoMaximo)),
    esc(Math.round(e.creditoMaximo)),
    esc(Math.round(e.pieDisponible)),
    esc(Math.round(e.rangoConservadorUF)),
    esc(Math.round(e.rangoOptimistaUF)),
    esc(e.tieneComplementario ? 'Sí' : 'No'),
    esc(e.comp_nombre ?? ''),
    esc(e.numeroCotizacion ?? ''),
  ].join(','))

  const contenido = '\uFEFF' + headers + '\n' + filas.join('\n')
  fs.writeFileSync(CSV_PATH, contenido, 'utf-8')
}

// ── API pública ───────────────────────────────────────────────────

/**
 * Guarda un nuevo perfilamiento. Retorna el id asignado.
 */
export function guardarPerfilamiento(
  data: Omit<PerfilamientoEntry, 'id' | 'fecha' | 'fechaDisplay'>
): string {
  const entries = leerJSON()
  const fecha = new Date().toISOString()
  const entry: PerfilamientoEntry = {
    id: genId(),
    fecha,
    fechaDisplay: toDisplay(fecha),
    ...data,
  }
  entries.push(entry)
  escribirJSON(entries)
  escribirCSV(entries)
  return entry.id
}

/**
 * Vincula un perfilamiento con el número de cotización generado.
 */
export function vincularCotizacion(id: string, numeroCotizacion: string): void {
  const entries = leerJSON()
  const idx = entries.findIndex(e => e.id === id)
  if (idx === -1) return
  entries[idx].numeroCotizacion = numeroCotizacion
  escribirJSON(entries)
  escribirCSV(entries)
}

/**
 * Devuelve resumen de todos los perfilamientos (más recientes primero).
 */
export function listarPerfilamientos(): PerfilamientoResumen[] {
  return leerJSON()
    .slice()
    .reverse()
    .map(e => ({
      id:                  e.id,
      fechaDisplay:        e.fechaDisplay,
      nombre:              e.nombre,
      rut:                 e.rut,
      resultado:           e.resultado,
      rangoConservadorUF:  e.rangoConservadorUF,
      rangoOptimistaUF:    e.rangoOptimistaUF,
      tieneComplementario: e.tieneComplementario,
      numeroCotizacion:    e.numeroCotizacion,
    }))
}

/**
 * Devuelve todas las entradas completas para exportación.
 */
export function listarPerfilamientosCompletos(): PerfilamientoEntry[] {
  return leerJSON().slice().reverse()
}
