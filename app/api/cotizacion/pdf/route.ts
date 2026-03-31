// ============================================================
// API Route — POST /api/cotizacion/pdf
// Genera el PDF en el servidor y lo devuelve como descarga
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import fs from 'fs'
import path from 'path'
import { CotizacionPDF } from '@/components/cotizacion/CotizacionPDF'
import type { CotizacionPDFProps } from '@/components/cotizacion/CotizacionPDF'

function getLogoBase64(): string | null {
  const logoPath = path.join(process.cwd(), 'public', 'logo.png')
  if (!fs.existsSync(logoPath)) return null
  return `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
}

export async function POST(req: NextRequest) {
  try {
    const body: CotizacionPDFProps = await req.json()
    const { renderToBuffer } = await import('@react-pdf/renderer')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = createElement(CotizacionPDF as React.ComponentType<any>, { ...body, logoBase64: getLogoBase64() })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer: Buffer  = await renderToBuffer(element as any)

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
