// ============================================================
// CORRELATIVO — número de cotización persistente
// Dev: archivo .cotizaciones-seq.json en la raíz del proyecto
// Prod: migrar a tabla cotizacion en PostgreSQL (ver schema_pg.sql)
// ============================================================

import fs   from 'fs'
import path from 'path'

const SEQ_FILE = path.join(process.cwd(), '.cotizaciones-seq.json')

interface Seq { ultimo: number; año: number }

function leerSeq(): Seq {
  try {
    return JSON.parse(fs.readFileSync(SEQ_FILE, 'utf8'))
  } catch {
    return { ultimo: 0, año: new Date().getFullYear() }
  }
}

/**
 * Genera y persiste el siguiente número correlativo.
 * Formato: "COT-2026-0001"
 * El contador se reinicia cada año.
 */
export function siguienteNumeroCotizacion(): string {
  const seq   = leerSeq()
  const anio  = new Date().getFullYear()
  const ultimo = seq.año === anio ? seq.ultimo + 1 : 1

  fs.writeFileSync(SEQ_FILE, JSON.stringify({ ultimo, año: anio }), 'utf8')

  return `COT-${anio}-${String(ultimo).padStart(4, '0')}`
}
