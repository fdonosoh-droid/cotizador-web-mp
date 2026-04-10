// ============================================================
// CORRELATIVO — número de cotización persistente
// Dev (DATA_SOURCE=excel): archivo .cotizaciones-seq.json
// Prod (DATA_SOURCE=postgres): tabla `correlativo` en PostgreSQL
//
// Formato: "COT-2026-0001" — reinicio automático cada año
// Garantía de unicidad en prod: INSERT ... ON CONFLICT DO UPDATE
// ============================================================
import fs   from 'fs'
import path from 'path'

// En Vercel (producción) process.cwd() apunta a /var/task que es
// read-only. Usamos /tmp que sí permite escritura. En desarrollo
// seguimos usando la raíz del proyecto para mantener el archivo visible.
const SEQ_FILE =
    process.env.NODE_ENV === 'production'
    ? '/tmp/.cotizaciones-seq.json'
      : path.join(process.cwd(), '.cotizaciones-seq.json')

// ── Implementación DEV — archivo JSON ───────────────────────────
interface Seq { ultimo: number; año: number }

function leerSeq(): Seq {
    try {
          return JSON.parse(fs.readFileSync(SEQ_FILE, 'utf8'))
    } catch {
          return { ultimo: 0, año: new Date().getFullYear() }
    }
}

function siguienteJSON(): string {
    const seq  = leerSeq()
    const anio = new Date().getFullYear()
    const ultimo = seq.año === anio ? seq.ultimo + 1 : 1
    fs.writeFileSync(SEQ_FILE, JSON.stringify({ ultimo, año: anio }), 'utf8')
    return `COT-${anio}-${String(ultimo).padStart(4, '0')}`
}

// ── Implementación PROD — PostgreSQL ────────────────────────────
//
// La clave incluye el año → el contador se reinicia automáticamente
// cuando el año cambia (INSERT crea fila nueva desde 1).
//
// La operación es atómica: dos instancias concurrentes nunca
// obtendrán el mismo valor gracias al bloqueo de fila de PG.
async function siguientePG(): Promise<string> {
    // Importación dinámica para no contaminar bundle cliente
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getDb } = require('@/lib/db/client') as typeof import('@/lib/db/client')
    const sql = getDb()
    const anio  = new Date().getFullYear()
    const clave = `cotizacion_${anio}`

  const rows = await sql<{ valor: number }[]>`
      INSERT INTO correlativo (clave, valor)
          VALUES (${clave}, 1)
              ON CONFLICT (clave) DO UPDATE
                    SET valor = correlativo.valor + 1
                        RETURNING valor
                          `
    const numero = rows[0].valor
    return `COT-${anio}-${String(numero).padStart(4, '0')}`
}

// ── Punto de entrada ────────────────────────────────────────────
/**
 * Genera y persiste el siguiente número correlativo de cotización.
 * Formato: "COT-2026-0001" — reinicio automático cada año.
 */
export async function siguienteNumeroCotizacion(): Promise<string> {
    if ((process.env.DATA_SOURCE ?? 'excel') === 'postgres') {
          return siguientePG()
    }
    return siguienteJSON()
}
