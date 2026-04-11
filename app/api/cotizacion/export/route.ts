// ============================================================
// API Route — GET /api/cotizacion/export
// Exporta el historial de cotizaciones a .xlsx
// ============================================================

import { NextResponse } from 'next/server'
import { listarCotizaciones } from '@/lib/services/historial'

export async function GET() {
  try {
    const rows = await listarCotizaciones()

    const XLSX = await import('xlsx')
    const wb   = XLSX.utils.book_new()

    const data = rows.map((r) => ({
      'N° Cotización':   r.numero,
      'Fecha':           r.fecha,
      'Proyecto':        r.proyecto,
      'Comuna':          r.comuna,
      'N° Unidad':       r.numeroUnidad ?? '',
      'Tipo Unidad':     r.tipoUnidad,
      'Broker/Cliente':  r.broker,
      'Valor Venta UF':  r.valorVentaUF,
      'Crédito Hip. UF': r.creditoHipUF,
      'Pie %':           Number((r.piePct * 100).toFixed(0)),
      'Corredor':        r.corredor ?? '',
    }))

    const ws = XLSX.utils.json_to_sheet(data)

    // Anchos de columna
    ws['!cols'] = [
      { wch: 18 }, { wch: 22 }, { wch: 30 }, { wch: 16 },
      { wch: 10 }, { wch: 14 }, { wch: 25 }, { wch: 15 },
      { wch: 15 }, { wch: 7  }, { wch: 25 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Historial')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Historial_cotizaciones.xlsx"',
      },
    })
  } catch (err) {
    console.error('[EXPORT] Error:', err)
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 })
  }
}
