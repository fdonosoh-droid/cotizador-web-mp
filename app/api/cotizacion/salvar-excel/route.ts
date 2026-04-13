// ============================================================
// API Route — POST /api/cotizacion/salvar-excel
// 1. Agrega la entrada al .cotizaciones-historial.json (si no existe)
// 2. Intenta regenerar Historial_cotizaciones.xlsx con el script externo
//    → Si xlsx está abierto en Excel (EBUSY) devuelve aviso, no error fatal
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { execSync }                  from 'child_process'
import fs                            from 'fs'
import path                          from 'path'

export const runtime = 'nodejs'

const ROOT      = process.cwd()
const HIST_FILE = path.join(ROOT, '.cotizaciones-historial.json')
const SCRIPT    = path.join(ROOT, 'scripts', 'update-historial-xlsx.js')

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

    const entry: HistorialEntry = {
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
    }

    entries.unshift(entry)
    try {
      fs.writeFileSync(HIST_FILE, JSON.stringify(entries, null, 2), 'utf8')
      jsonActualizado = true
      console.log('[salvar-excel] Entrada guardada en JSON:', numero, '— total:', entries.length)
    } catch (jsonErr) {
      console.error('[salvar-excel] Error escribiendo JSON:', jsonErr)
      return NextResponse.json(
        { ok: false, error: 'No se pudo guardar en historial JSON' },
        { status: 500 },
      )
    }
  } else {
    console.log('[salvar-excel] Entrada ya existía:', numero)
  }

  // ── 4. Regenerar xlsx (no fatal si falla) ──────────────────
  let xlsxOk    = false
  let xlsxError = ''
  try {
    const output = execSync(`node "${SCRIPT}"`, {
      cwd:      ROOT,
      encoding: 'utf8',
      timeout:  15000,
    })
    console.log('[salvar-excel] xlsx actualizado:', output.trim())
    xlsxOk = true
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('EBUSY')) {
      xlsxError = 'El archivo Historial_cotizaciones.xlsx está abierto en Excel. Ciérralo para actualizar el archivo.'
    } else {
      xlsxError = msg
    }
    console.error('[salvar-excel] xlsx error (no fatal):', xlsxError)
  }

  return NextResponse.json({
    ok:             true,
    jsonActualizado,
    xlsxOk,
    xlsxError:      xlsxOk ? null : xlsxError,
    totalEntradas:  entries.length,
  })
}
