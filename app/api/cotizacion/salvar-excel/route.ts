// ============================================================
// API Route — POST /api/cotizacion/salvar-excel
// Ejecuta scripts/update-historial-xlsx.js como proceso hijo
// para evitar incompatibilidades de módulos con Next.js/Turbopack
// ============================================================
import { NextResponse }  from 'next/server'
import { execSync }      from 'child_process'
import path              from 'path'

export const runtime = 'nodejs'

const SCRIPT = path.join(process.cwd(), 'scripts', 'update-historial-xlsx.js')

export async function POST() {
  try {
    console.log('[salvar-excel] Ejecutando script:', SCRIPT)
    const output = execSync(`node "${SCRIPT}"`, {
      cwd:      process.cwd(),
      encoding: 'utf8',
      timeout:  15000,
    })
    console.log('[salvar-excel] Output:', output.trim())
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[salvar-excel] Error:', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
