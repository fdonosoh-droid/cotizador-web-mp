// ============================================================
// API Route — POST /api/cotizacion/salvar-excel
// 1. Agrega la entrada al .cotizaciones-historial.json (si no existe)
// 2. Ejecuta scripts/update-historial-xlsx.js via child_process
//    (evita incompatibilidades xlsx con Next.js/Turbopack)
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
  try {
    // ── 1. Leer body ─────────────────────────────────────────
    const body = await req.json() as {
      numero:       string
      fecha:        string   // 'DD-MM-YYYY'
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

    const { numero, fecha } = body

    // ── 2. Leer JSON actual ──────────────────────────────────
    let entries: HistorialEntry[] = []
    try {
      entries = JSON.parse(fs.readFileSync(HIST_FILE, 'utf8')) as HistorialEntry[]
    } catch {
      entries = []
    }

    // ── 3. Agregar entrada solo si no existe ─────────────────
    if (!entries.some((e) => e.numero === numero)) {
      // Convertir fecha 'DD-MM-YYYY' → ISO
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

      entries.unshift(entry)   // más recientes primero
      fs.writeFileSync(HIST_FILE, JSON.stringify(entries, null, 2), 'utf8')
      console.log('[salvar-excel] Entrada agregada al JSON:', numero)
    } else {
      console.log('[salvar-excel] Entrada ya existía en JSON:', numero)
    }

    // ── 4. Regenerar xlsx con el script externo ───────────────
    console.log('[salvar-excel] Ejecutando script:', SCRIPT)
    const output = execSync(`node "${SCRIPT}"`, {
      cwd:      ROOT,
      encoding: 'utf8',
      timeout:  15000,
    })
    console.log('[salvar-excel] Script output:', output.trim())

    return NextResponse.json({ ok: true, entries: entries.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[salvar-excel] Error:', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
