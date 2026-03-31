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

async function generarPDF(props: CotizacionPDFProps): Promise<Uint8Array> {
  const { renderToBuffer } = await import('@react-pdf/renderer')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(CotizacionPDF as React.ComponentType<any>, { ...props, logoBase64: getLogoBase64() })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer: Buffer = await renderToBuffer(element as any)
  return new Uint8Array(buffer)
}

/** POST — genera PDF desde payload en body */
export async function POST(req: NextRequest) {
  try {
    const body: CotizacionPDFProps = await req.json()
    const uint8 = await generarPDF(body)
    return new NextResponse(Buffer.from(uint8), {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="cotizacion-${body.numero}.pdf"`,
        'Content-Length':      String(uint8.byteLength),
      },
    })
  } catch (err) {
    console.error('[PDF] Error generando PDF:', err)
    return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 })
  }
}

/** GET /api/cotizacion/pdf?numero=COT-2026-0001 — regenera PDF del historial */
export async function GET(req: NextRequest) {
  try {
    const numero = req.nextUrl.searchParams.get('numero')
    if (!numero) return NextResponse.json({ error: 'Falta parámetro numero' }, { status: 400 })

    const { getCotizacionPayload } = await import('@/lib/services/historial')
    const payload = await getCotizacionPayload(numero)
    if (!payload) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })

    const props: CotizacionPDFProps = {
      numero,
      fecha:                payload.fecha,
      broker:               payload.broker,
      unidad:               payload.unidad,
      unidadesAdicionales:  payload.unidadesAdicionales,
      resultado:            payload.resultado,
      arriendoMensualCLP:   payload.arriendoMensualCLP,
      plusvaliaAnual:       payload.plusvaliaAnual,
    }
    const uint8 = await generarPDF(props)
    return new NextResponse(Buffer.from(uint8), {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="cotizacion-${numero}.pdf"`,
        'Content-Length':      String(uint8.byteLength),
      },
    })
  } catch (err) {
    console.error('[PDF] Error regenerando PDF del historial:', err)
    return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 })
  }
}
