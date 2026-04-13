// ============================================================
// API Route — POST /api/cotizacion/salvar-excel
// 1. Agrega la entrada al .cotizaciones-historial.json (si no existe)
// 2. Regenera Historial_cotizaciones.xlsx
//    Dev:  via script Node.js externo (evita problemas Turbopack)
//    Prod: inline con require('xlsx') — no hay Turbopack en Vercel
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import fs                            from 'fs'
import path                          from 'path'

export const runtime = 'nodejs'

const IS_PROD   = process.env.NODE_ENV === 'production'
const ROOT      = process.cwd()

// En Vercel /var/task es read-only → usar /tmp
const HIST_FILE = IS_PROD
  ? '/tmp/.cotizaciones-historial.json'
  : path.join(ROOT, '.cotizaciones-historial.json')

const XLSX_PATH = IS_PROD
  ? '/tmp/Historial_cotizaciones.xlsx'
  : path.join(ROOT, 'Historial_cotizaciones.xlsx')

const SCRIPT = path.join(ROOT, 'scripts', 'update-historial-xlsx.js')

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

  // ── 4. Regenerar xlsx ──────────────────────────────────────
  let xlsxOk    = false
  let xlsxError = ''

  if (IS_PROD) {
    // En producción: xlsx directo con require (sin Turbopack)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const XLSX = require('xlsx') as typeof import('xlsx')
      const filas = entries.map((e) => {
        const d   = new Date(e.fechaISO)
        const dia = String(d.getDate()).padStart(2, '0')
        const mes = String(d.getMonth() + 1).padStart(2, '0')
        const ani = d.getFullYear()
        return {
          'N° Cotización':   e.numero,
          'Fecha':           `${dia}-${mes}-${ani}`,
          'Proyecto':        e.proyecto      || '',
          'Comuna':          e.comuna        || '',
          'N° Unidad':       e.numeroUnidad  ?? '',
          'Tipo Unidad':     e.tipoUnidad    || '',
          'Broker/Cliente':  e.broker        || '',
          'Valor Venta UF':  Math.round((e.valorVentaUF || 0) * 100) / 100,
          'Crédito Hip. UF': Math.round((e.creditoHipUF || 0) * 100) / 100,
          'Pie %':           Number(((e.piePct || 0) * 100).toFixed(0)),
          'Corredor':        e.corredor || '',
        }
      })
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(filas)
      ws['!cols'] = [
        { wch: 18 }, { wch: 14 }, { wch: 30 }, { wch: 16 },
        { wch: 10 }, { wch: 14 }, { wch: 25 }, { wch: 15 },
        { wch: 15 }, { wch: 7  }, { wch: 25 },
      ]
      XLSX.utils.book_append_sheet(wb, ws, 'Historial')
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
      fs.writeFileSync(XLSX_PATH, buf)
      xlsxOk = true
      console.log('[salvar-excel] xlsx escrito (prod):', XLSX_PATH)
    } catch (err: unknown) {
      xlsxError = err instanceof Error ? err.message : String(err)
      console.error('[salvar-excel] xlsx error (prod):', xlsxError)
    }
  } else {
    // En desarrollo: script externo (evita incompatibilidades Turbopack)
    try {
      const { execSync } = await import('child_process')
      const output = execSync(`node "${SCRIPT}"`, {
        cwd:      ROOT,
        encoding: 'utf8',
        timeout:  15000,
      })
      console.log('[salvar-excel] xlsx actualizado (dev):', output.trim())
      xlsxOk = true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      xlsxError = msg.includes('EBUSY')
        ? 'El archivo Historial_cotizaciones.xlsx está abierto en Excel. Ciérralo para actualizar el archivo.'
        : msg
      console.error('[salvar-excel] xlsx error (dev):', xlsxError)
    }
  }

  return NextResponse.json({
    ok:            true,
    jsonActualizado,
    xlsxOk,
    xlsxError:     xlsxOk ? null : xlsxError,
    totalEntradas: entries.length,
  })
}
