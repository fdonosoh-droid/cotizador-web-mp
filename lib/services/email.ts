// ============================================================
// SERVICIO EMAIL — envío de cotización por SMTP via nodemailer
// Requiere en .env.local:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
// ============================================================

import nodemailer from 'nodemailer'
import type { CotizacionPDFProps } from '@/components/cotizacion/CotizacionPDF'

// ── Transporter lazy ─────────────────────────────────────────

let _transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter

  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error(
      '[email] Faltan variables SMTP. Define SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS en .env.local',
    )
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  return _transporter
}

// ── Tipos ─────────────────────────────────────────────────────

export interface EnviarCotizacionInput {
  props:         CotizacionPDFProps   // datos completos de la cotización
  pdfBuffer:     Buffer               // PDF ya generado
  emailCliente?: string               // destinatario adicional (opcional)
}

// ── Función principal ─────────────────────────────────────────

export async function enviarCotizacion(input: EnviarCotizacionInput): Promise<void> {
  const { props, pdfBuffer, emailCliente } = input

  const from    = process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? 'noreply@cotizador.cl'
  const subject = `Cotización ${props.numero} — ${props.unidad.nombreProyecto}`

  const to: string[] = [props.broker.email]
  if (emailCliente?.trim()) to.push(emailCliente.trim())

  const html = buildHtml(props)
  const filename = `cotizacion-${props.numero}.pdf`

  await getTransporter().sendMail({
    from,
    to: to.join(', '),
    subject,
    html,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  })
}

// ── HTML del cuerpo ───────────────────────────────────────────

function buildHtml(p: CotizacionPDFProps): string {
  const r        = p.resultado
  const uf       = (v: number) => v.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const clp      = (v: number) => `$${Math.round(v).toLocaleString('es-CL')}`
  const pct      = (v: number) => `${(v * 100).toFixed(1)}%`

  const escRows = r.escenarios.map((e) => `
    <tr>
      <td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:center">CAE ${pct(e.cae)}</td>
      <td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right">${clp(e.cuotaMensualCLP)}/mes</td>
      <td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right;color:${e.flujoMensualCLP >= 0 ? '#15803d' : '#dc2626'}">${clp(e.flujoMensualCLP)}/mes</td>
      <td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right">${pct(e.roi5Anios)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden">

  <!-- Header -->
  <div style="background:#1d4ed8;padding:24px 32px">
    <h1 style="color:#fff;margin:0;font-size:20px">Cotización ${p.numero}</h1>
    <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">${p.fecha} · ${p.unidad.nombreProyecto}</p>
  </div>

  <!-- Body -->
  <div style="padding:24px 32px">
    <p style="color:#374151;margin:0 0 16px">
      Estimado/a <strong>${p.broker.nombre}</strong>,<br>
      adjuntamos la cotización para la siguiente unidad:
    </p>

    <!-- Resumen unidad -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
      <tr style="background:#eff6ff">
        <th colspan="2" style="padding:8px 12px;text-align:left;color:#1e40af;border:1px solid #e5e7eb">
          ${p.unidad.nombreProyecto} — ${p.unidad.comuna}
        </th>
      </tr>
      <tr>
        <td style="padding:6px 12px;border:1px solid #e5e7eb;color:#6b7280">Unidad / Tipo</td>
        <td style="padding:6px 12px;border:1px solid #e5e7eb">${p.unidad.numeroUnidad ?? '—'} · ${p.unidad.tipoUnidad}</td>
      </tr>
      <tr style="background:#f9fafb">
        <td style="padding:6px 12px;border:1px solid #e5e7eb;color:#6b7280">Valor de Venta</td>
        <td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:600">${uf(r.valorVentaUF)} UF</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;border:1px solid #e5e7eb;color:#6b7280">Pie (${pct(r.piePct)})</td>
        <td style="padding:6px 12px;border:1px solid #e5e7eb">${uf(r.pieTotalUF)} UF</td>
      </tr>
      <tr style="background:#f9fafb">
        <td style="padding:6px 12px;border:1px solid #e5e7eb;color:#6b7280">Crédito Hipotecario</td>
        <td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:600">${uf(r.creditoHipFinalUF)} UF</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;border:1px solid #e5e7eb;color:#6b7280">Cap Rate (Esc.1)</td>
        <td style="padding:6px 12px;border:1px solid #e5e7eb">${pct(r.escenarios[0].capRate)}</td>
      </tr>
    </table>

    <!-- Escenarios CAE -->
    <h3 style="color:#1e40af;font-size:14px;margin:0 0 8px">Escenarios CAE</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
      <thead>
        <tr style="background:#eff6ff">
          <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:center">Escenario</th>
          <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right">Cuota</th>
          <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right">Flujo mensual</th>
          <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right">ROI 5 años</th>
        </tr>
      </thead>
      <tbody>${escRows}</tbody>
    </table>

    <p style="color:#6b7280;font-size:12px;margin:0">
      El documento completo se adjunta en PDF a este correo.<br>
      Esta cotización fue generada automáticamente y tiene fines informativos.
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#f3f4f6;padding:16px 32px;border-top:1px solid #e5e7eb">
    <p style="color:#9ca3af;font-size:11px;margin:0">
      Cotizador Mercado Primario · ${p.broker.empresa ? p.broker.empresa + ' · ' : ''}${p.broker.email}
    </p>
  </div>

</div>
</body>
</html>`
}
