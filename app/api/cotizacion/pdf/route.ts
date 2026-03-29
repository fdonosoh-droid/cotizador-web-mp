// ============================================================
// API Route — POST /api/cotizacion/pdf
// Genera el PDF en el servidor y lo devuelve como descarga
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToBuffer } = require('@react-pdf/renderer')
import { createElement } from 'react'
import { CotizacionPDF } from '@/components/cotizacion/CotizacionPDF'
import type { CotizacionPDFProps } from '@/components/cotizacion/CotizacionPDF'

export async function POST(req: NextRequest) {
  try {
    const body: CotizacionPDFProps = await req.json()

    const element = createElement(CotizacionPDF as React.ComponentType<CotizacionPDFProps>, body)
    const buffer: Buffer  = await renderToBuffer(element)

    const filename = `cotizacion-${body.numero}.pdf`
    const uint8 = new Uint8Array(buffer)

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(uint8.byteLength),
      },
    })
  } catch (err) {
    console.error('[PDF] Error generando PDF:', err)
    return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 })
  }
}
