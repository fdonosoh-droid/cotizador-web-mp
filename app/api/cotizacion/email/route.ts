// ============================================================
// API Route — POST /api/cotizacion/email
// Genera el PDF y lo envía por email al broker (+ cliente opcional)
// Body: CotizacionPDFProps + emailCliente?: string
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToBuffer } = require('@react-pdf/renderer')
import { createElement } from 'react'
import { CotizacionPDF } from '@/components/cotizacion/CotizacionPDF'
import type { CotizacionPDFProps } from '@/components/cotizacion/CotizacionPDF'
import { enviarCotizacion } from '@/lib/services/email'

interface RequestBody extends CotizacionPDFProps {
  emailCliente?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json()
    const { emailCliente, ...pdfProps } = body

    // Generar PDF
    const element   = createElement(CotizacionPDF as React.ComponentType<CotizacionPDFProps>, pdfProps)
    const pdfBuffer = await renderToBuffer(element) as Buffer

    // Enviar email
    await enviarCotizacion({ props: pdfProps, pdfBuffer, emailCliente })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[email] Error enviando cotización:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
