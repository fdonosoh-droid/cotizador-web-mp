// ============================================================
// API Route — POST /api/cotizacion/email
// Genera el PDF y lo envía por email al broker (+ cliente opcional)
// Body: CotizacionPDFProps + emailCliente?: string
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import fs from 'fs'
import path from 'path'
import { CotizacionPDF } from '@/components/cotizacion/CotizacionPDF'
import type { CotizacionPDFProps } from '@/components/cotizacion/CotizacionPDF'
import { enviarCotizacion } from '@/lib/services/email'

function getLogoBase64(): string | null {
  const logoPath = path.join(process.cwd(), 'public', 'logo.png')
  if (!fs.existsSync(logoPath)) return null
  return `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
}

interface RequestBody extends CotizacionPDFProps {
  emailCliente?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json()
    const { emailCliente, ...pdfProps } = body
    const { renderToBuffer } = await import('@react-pdf/renderer')

    // Generar PDF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element   = createElement(CotizacionPDF as React.ComponentType<any>, { ...pdfProps, logoBase64: getLogoBase64() })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(element as any) as Buffer

    // Enviar email
    await enviarCotizacion({ props: pdfProps, pdfBuffer, emailCliente })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[email] Error enviando cotización:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
