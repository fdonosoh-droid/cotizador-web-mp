// ============================================================
// API Route — POST /api/cotizacion/salvar-excel
// Lee el historial JSON y escribe Historial_cotizaciones.xlsx en disco
// ============================================================
import { NextResponse } from 'next/server'
import fs   from 'fs'
import path from 'path'

const HIST_FILE = path.join(process.cwd(), '.cotizaciones-historial.json')
const XLSX_PATH = path.join(process.cwd(), 'Historial_cotizaciones.xlsx')

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

export async function POST() {
  try {
    // 1. Leer historial JSON
    let entries: HistorialEntry[] = []
    try {
      entries = JSON.parse(fs.readFileSync(HIST_FILE, 'utf8')) as HistorialEntry[]
    } catch {
      entries = []
    }

    console.log('[salvar-excel] Entradas leídas:', entries.length, '| CWD:', process.cwd())

    // 2. Construir workbook (igual que /api/cotizacion/export que ya funciona)
    const XLSX = await import('xlsx')

    const filas = entries.map((e) => {
      const d   = new Date(e.fechaISO)
      const dia = String(d.getDate()).padStart(2, '0')
      const mes = String(d.getMonth() + 1).padStart(2, '0')
      const ani = d.getFullYear()
      return {
        'N° Cotización':   e.numero,
        'Fecha':           `${dia}-${mes}-${ani}`,
        'Proyecto':        e.proyecto,
        'Comuna':          e.comuna,
        'N° Unidad':       e.numeroUnidad ?? '',
        'Tipo Unidad':     e.tipoUnidad,
        'Broker/Cliente':  e.broker,
        'Valor Venta UF':  Math.round(e.valorVentaUF * 100) / 100,
        'Crédito Hip. UF': Math.round(e.creditoHipUF * 100) / 100,
        'Pie %':           Number((e.piePct * 100).toFixed(0)),
        'Corredor':        e.corredor ?? '',
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

    // 3. Escribir en disco
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    fs.writeFileSync(XLSX_PATH, buf)

    console.log('[salvar-excel] Archivo escrito:', XLSX_PATH, `(${entries.length} registros)`)
    return NextResponse.json({ ok: true, registros: entries.length })
  } catch (err) {
    console.error('[salvar-excel] Error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
