/**
 * Script standalone — actualiza Historial_cotizaciones.xlsx
 * Lee .cotizaciones-historial.json y escribe el xlsx completo.
 * Se ejecuta como proceso hijo desde la API route para evitar
 * incompatibilidades de módulos con Next.js/Turbopack.
 *
 * Uso: node scripts/update-historial-xlsx.js
 */

const path  = require('path')
const fs    = require('fs')
const XLSX  = require('xlsx')

const ROOT      = path.resolve(__dirname, '..')
const HIST_FILE = path.join(ROOT, '.cotizaciones-historial.json')
const XLSX_PATH = path.join(ROOT, 'Historial_cotizaciones.xlsx')

// ── Leer historial JSON ─────────────────────────────────────
let entries = []
try {
  entries = JSON.parse(fs.readFileSync(HIST_FILE, 'utf8'))
} catch (e) {
  console.error('[xlsx-script] No se pudo leer', HIST_FILE, e.message)
  process.exit(1)
}

console.log('[xlsx-script] Entradas en JSON:', entries.length)

// ── Construir filas ─────────────────────────────────────────
const filas = entries.map((e) => {
  const d   = new Date(e.fechaISO)
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ani = d.getFullYear()
  // corredor: campo propio → fallback a pdfPayload.broker.empresa (entradas antiguas)
  const corredor = e.corredor || (e.pdfPayload && e.pdfPayload.broker && e.pdfPayload.broker.empresa) || ''
  return {
    'N° Cotización':   e.numero,
    'Fecha':           `${dia}-${mes}-${ani}`,
    'Proyecto':        e.proyecto      || '',
    'Comuna':          e.comuna        || '',
    'N° Unidad':       e.numeroUnidad  ?? '',
    'Tipo Unidad':     e.tipoUnidad    || '',
    'Broker/Cliente':  e.broker        || '',
    'Valor Venta UF':  Math.round((e.valorVentaUF  || 0) * 100) / 100,
    'Crédito Hip. UF': Math.round((e.creditoHipUF  || 0) * 100) / 100,
    'Pie %':           Number(((e.piePct || 0) * 100).toFixed(0)),
    'Corredor':        corredor,
  }
})

// ── Construir workbook ──────────────────────────────────────
const wb = XLSX.utils.book_new()
const ws = XLSX.utils.json_to_sheet(filas)

ws['!cols'] = [
  { wch: 18 }, // N° Cotización
  { wch: 14 }, // Fecha
  { wch: 30 }, // Proyecto
  { wch: 16 }, // Comuna
  { wch: 10 }, // N° Unidad
  { wch: 14 }, // Tipo Unidad
  { wch: 25 }, // Broker/Cliente
  { wch: 15 }, // Valor Venta UF
  { wch: 15 }, // Crédito Hip. UF
  { wch: 7  }, // Pie %
  { wch: 25 }, // Corredor
]

XLSX.utils.book_append_sheet(wb, ws, 'Historial')

// ── Escribir en disco ───────────────────────────────────────
try {
  XLSX.writeFile(wb, XLSX_PATH)
  console.log('[xlsx-script] Archivo escrito:', XLSX_PATH, `(${filas.length} registros)`)
} catch (e) {
  if (e.code === 'EBUSY') {
    console.error('[xlsx-script] ERROR: El archivo está abierto en Excel. Ciérralo antes de continuar.')
  } else {
    console.error('[xlsx-script] Error escribiendo:', e.message)
  }
  process.exit(1)
}
