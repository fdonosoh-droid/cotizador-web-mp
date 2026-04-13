// ============================================================
// API Route — POST /api/cotizacion/salvar-excel
// 1. Agrega la entrada al .cotizaciones-historial.json (si no existe)
// 2. Regenera Historial_cotizaciones.csv desde el JSON completo
//    (sin módulos externos, sin bloqueos de archivo)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import fs                            from 'fs'
import path                          from 'path'

export const runtime = 'nodejs'

const IS_PROD   = process.env.NODE_ENV === 'production'
const ROOT      = process.cwd()

const HIST_FILE = IS_PROD
  ? '/tmp/.cotizaciones-historial.json'
  : path.join(ROOT, '.cotizaciones-historial.json')

const CSV_PATH  = IS_PROD
  ? '/tmp/Historial_cotizaciones.csv'
  : path.join(ROOT, 'Historial_cotizaciones.csv')

interface HistorialEntry {
  numero:       string
  fechaISO:     string
  fechaDisplay: string
  proyecto:     string
  comuna:       string
  numeroUnidad: number | null
  tipoUnidad:   string
  broker:       string
  corredor:     string
  valorVentaUF: number
  creditoHipUF: number
  piePct:       number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfPayload?:  any
}

// ── Genera CSV UTF-8 con BOM (compatible con Excel) ──────────
function generarCSV(entries: HistorialEntry[]): string {
  const escape = (v: string | number | null | undefined): string => {
    const s = v === null || v === undefined ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const headers = [
    'N° Cotización', 'Fecha', 'Proyecto', 'Comuna',
    'N° Unidad', 'Tipo Unidad', 'Broker/Cliente',
    'Valor Venta UF', 'Crédito Hip. UF', 'Pie %', 'Corredor',
  ]

  const filas = entries.map((e) => {
    const d   = new Date(e.fechaISO)
    const dia = String(d.getDate()).padStart(2, '0')
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const ani = d.getFullYear()
    // corredor: campo propio → fallback a pdfPayload.broker.empresa (entradas antiguas)
    const corredor = e.corredor || e.pdfPayload?.broker?.empresa || ''
    return [
      e.numero,
      `${dia}-${mes}-${ani}`,
      e.proyecto      || '',
      e.comuna        || '',
      e.numeroUnidad  ?? '',
      e.tipoUnidad    || '',
      e.broker        || '',
      Math.round((e.valorVentaUF || 0) * 100) / 100,
      Math.round((e.creditoHipUF || 0) * 100) / 100,
      Number(((e.piePct || 0) * 100).toFixed(0)),
      corredor,
    ].map(escape).join(',')
  })

  const BOM = '\uFEFF'   // Excel lo necesita para leer UTF-8 correctamente
  return BOM + [headers.join(','), ...filas].join('\r\n')
}

export async function POST(req: NextRequest) {
  // ── 1. Leer body ───────────────────────────────────────────
  let body: {
    numero:       string
    fecha:        string
    proyecto:     string
    comuna:       string
    numeroUnidad: number | null
    tipoUnidad:   string
    broker:       string
    valorVentaUF: number
    creditoHipUF: number
    piePct:       number
    corredor:     string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Body inválido' }, { status: 400 })
  }

  const { numero, fecha } = body

  // ── 2. Leer JSON actual ────────────────────────────────────
  let entries: HistorialEntry[] = []
  try {
    entries = JSON.parse(fs.readFileSync(HIST_FILE, 'utf8')) as HistorialEntry[]
  } catch {
    entries = []
  }

  // ── 3. Agregar entrada solo si no existe ───────────────────
  let jsonActualizado = false
  if (!entries.some((e) => e.numero === numero)) {
    const [dd, mm, yyyy] = fecha.split('-')
    const fechaISO = new Date(`${yyyy}-${mm}-${dd}T12:00:00.000Z`).toISOString()

    entries.unshift({
      numero,
      fechaISO,
      fechaDisplay: fecha,
      proyecto:     body.proyecto,
      comuna:       body.comuna,
      numeroUnidad: body.numeroUnidad ?? null,
      tipoUnidad:   body.tipoUnidad,
      broker:       body.broker,
      corredor:     body.corredor ?? '',
      valorVentaUF: body.valorVentaUF,
      creditoHipUF: body.creditoHipUF,
      piePct:       body.piePct,
    })

    try {
      fs.writeFileSync(HIST_FILE, JSON.stringify(entries, null, 2), 'utf8')
      jsonActualizado = true
      console.log('[salvar-excel] JSON guardado:', numero, '— total:', entries.length)
    } catch (err) {
      console.error('[salvar-excel] Error escribiendo JSON:', err)
      return NextResponse.json({ ok: false, error: 'No se pudo guardar en historial JSON' }, { status: 500 })
    }
  } else {
    console.log('[salvar-excel] Entrada ya existía:', numero)
  }

  // ── 4. Regenerar CSV desde el JSON completo ────────────────
  let csvOk    = false
  let csvError = ''
  try {
    const csv = generarCSV(entries)
    fs.writeFileSync(CSV_PATH, csv, 'utf8')
    csvOk = true
    console.log('[salvar-excel] CSV escrito:', CSV_PATH, `(${entries.length} registros)`)
  } catch (err: unknown) {
    csvError = err instanceof Error ? err.message : String(err)
    console.error('[salvar-excel] Error escribiendo CSV:', csvError)
  }

  return NextResponse.json({
    ok:            true,
    jsonActualizado,
    csvOk,
    csvError:      csvOk ? null : csvError,
    totalEntradas: entries.length,
  })
}
