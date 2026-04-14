// ============================================================
// API Route — GET /api/perfilamiento/export
// Exporta el historial de perfilamientos a .xlsx
// ============================================================

import { NextResponse } from 'next/server'
import { listarPerfilamientosCompletos } from '@/lib/perfilamiento/historial-perfilamiento'

const LABEL_RESULTADO: Record<string, string> = {
  apto:                 'Apto',
  apto_con_condiciones: 'Apto con condiciones',
  no_apto:              'No apto',
}

export async function GET() {
  try {
    const rows = listarPerfilamientosCompletos()

    const XLSX = await import('xlsx')
    const wb   = XLSX.utils.book_new()

    const data = rows.map(r => ({
      'ID':                   r.id,
      'Fecha':                r.fechaDisplay,
      'Nombre':               r.nombre,
      'RUT':                  r.rut,
      'Resultado':            LABEL_RESULTADO[r.resultado] ?? r.resultado,
      'Razones':              r.razones.join(' | '),
      'Ingreso Evaluable':    Math.round(r.ingresoEvaluable),
      'Dividendo Máx (CLP)':  Math.round(r.dividendoMaximo),
      'Crédito Máx (CLP)':    Math.round(r.creditoMaximo),
      'Pie Disponible (CLP)': Math.round(r.pieDisponible),
      'Rango Cons. (UF)':     Math.round(r.rangoConservadorUF),
      'Rango Opt. (UF)':      Math.round(r.rangoOptimistaUF),
      'Co-solicitante':       r.tieneComplementario ? 'Sí' : 'No',
      'Nombre Co-sol.':       r.comp_nombre ?? '',
      'Cotización vinculada': r.numeroCotizacion ?? '',
    }))

    const ws = XLSX.utils.json_to_sheet(data)

    ws['!cols'] = [
      { wch: 14 }, { wch: 18 }, { wch: 24 }, { wch: 14 },
      { wch: 22 }, { wch: 40 }, { wch: 18 }, { wch: 20 },
      { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 16 },
      { wch: 14 }, { wch: 20 }, { wch: 20 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Perfilamientos')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Historial_perfilamientos.xlsx"',
      },
    })
  } catch (err) {
    console.error('[PERFILAMIENTO EXPORT] Error:', err)
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 })
  }
}
