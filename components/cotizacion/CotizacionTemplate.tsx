'use client'
// ============================================================
// COTIZACIÓN TEMPLATE — documento imprimible / base para PDF
// Todas las secciones del Excel COTIZADOR replicadas en HTML
// ============================================================

import Image from 'next/image'
import type { ResultadoCotizacion } from '@/lib/calculators/cotizador'
import type { BrokerData } from '@/components/broker/BrokerForm'
import type { UnidadCotizable } from '@/lib/data'
import { formatCLP, formatUF } from '@/lib/data/uf-format'

export interface CotizacionTemplateProps {
  numero:    string              // ej: "COT-2026-0001"
  fecha:     string              // ej: "29 de marzo de 2026"
  broker:    BrokerData
  unidad:    UnidadCotizable
  unidadesAdicionales?: UnidadCotizable[]
  resultado: ResultadoCotizacion
  plusvaliaAnual:     number
}

export default function CotizacionTemplate({
  numero, fecha, broker, unidad, unidadesAdicionales = [], resultado, plusvaliaAnual,
}: CotizacionTemplateProps) {
  const r = resultado
  const uf = r.valorUF

  return (
    <div id="cotizacion-doc" className="cotizacion-doc bg-white text-gray-900 font-sans text-sm leading-snug">

      {/* ── ENCABEZADO ─────────────────────────────────────── */}
      <header className="cotizacion-header flex items-start justify-between border-b-2 border-blue-700 pb-4 mb-6">
        <div>
          <Image src="/logo.png" alt="VIVEPROP" width={200} height={37} className="object-contain" priority />
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-800">COTIZACIÓN</div>
          <div className="text-sm font-semibold text-blue-700">{numero}</div>
          <div className="text-xs text-gray-500 mt-1">{fecha}</div>
          <div className="text-xs text-gray-400">UF del día: {formatUF(uf)}</div>
        </div>
      </header>

      {/* ── DATOS DEL CLIENTE ─────────────────────────────── */}
      <section className="cotizacion-section mb-5">
        <SectionTitle>Cliente</SectionTitle>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          <Field label="Nombre"   value={broker.nombre} />
          <Field label="RUT"      value={broker.rut} />
          <Field label="E-mail"   value={broker.email} />
          {broker.telefono && <Field label="Teléfono" value={broker.telefono} />}
        </div>
      </section>

      {/* ── DATOS DEL CORREDOR ─────────────────────────────── */}
      <section className="cotizacion-section mb-5">
        <SectionTitle>Corredor</SectionTitle>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          <Field label="Nombre"   value={broker.empresa ?? ''} />
          <Field label="E-mail"   value={broker.emailCorredor ?? ''} />
          {broker.telefonoCorredor && <Field label="Teléfono" value={broker.telefonoCorredor} />}
        </div>
      </section>

      {/* ── DATOS DEL PROYECTO ─────────────────────────────── */}
      <section className="cotizacion-section mb-5">
        <SectionTitle>Proyecto</SectionTitle>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          <Field label="Inmobiliaria" value={unidad.alianza} />
          <Field label="Proyecto"     value={unidad.nombreProyecto} />
          <Field label="Comuna"       value={unidad.comuna} />
          <Field label="Dirección"    value={unidad.direccion} />
          <Field label="Tipo entrega" value={unidad.tipoEntrega} />
          <Field label="Entrega aprox." value={unidad.periodoEntrega} />
        </div>
      </section>

      {/* ── CARACTERÍSTICAS DE LA PROPIEDAD ─────────────────── */}
      <section className="cotizacion-section mb-5">
        <SectionTitle>Características de la propiedad</SectionTitle>
        <div className="grid grid-cols-3 gap-x-6 gap-y-1">
          <Field label="N° Unidad"   value={String(unidad.numeroUnidad ?? '—')} />
          <Field label="Piso"        value={String(unidad.pisoProducto ?? '—')} />
          <Field label="Orientación" value={unidad.orientacion ?? '—'} />
          <Field label="Tipología"   value={unidad.programa} />
          <Field label="Dormitorios" value={unidad.dormitoriosDisplay ?? '—'} />
          <Field label="Baños"       value={String(unidad.banos ?? '—')} />
          <Field label="Sup. Útil"   value={unidad.superficieUtil   ? `${Number(unidad.superficieUtil).toFixed(2)} m²`   : '—'} />
          <Field label="Sup. Terraza" value={unidad.superficieTerraza ? `${Number(unidad.superficieTerraza).toFixed(2)} m²` : '—'} />
          <Field label="Sup. Total"  value={unidad.superficieTotal  ? `${Number(unidad.superficieTotal).toFixed(2)} m²`  : '—'} />
        </div>
        {unidad.bienesConjuntos && (
          <p className="mt-2 text-xs text-orange-700 font-medium">
            ⚠ Bienes conjuntos obligatorios: {unidad.bienesConjuntos}
          </p>
        )}
      </section>

      {/* ── PRECIOS ────────────────────────────────────────── */}
      <section className="cotizacion-section mb-5">
        <SectionTitle>Valores</SectionTitle>
        <table className="cotizacion-table w-full text-sm">
          <thead>
            <tr className="bg-blue-700 text-white">
              <th className="text-left px-3 py-1.5">Concepto</th>
              <th className="text-right px-3 py-1.5">UF</th>
              <th className="text-right px-3 py-1.5">%</th>
              <th className="text-right px-3 py-1.5">$</th>
            </tr>
          </thead>
          <tbody>
            <TRow label={`Precio Lista ${unidad.tipoUnidad}${unidad.numeroUnidad ? ` N°${unidad.numeroUnidad}` : ''}`}
              uf={r.precioListaDepto}
              pct={r.precioListaTotal > 0 ? r.precioListaDepto / r.precioListaTotal : 0}
              clp={r.precioListaDepto * uf} shade />
            {unidadesAdicionales.map((u, i) => (
              <TRow key={i}
                label={`Precio Lista ${u.tipoUnidad}${u.numeroUnidad ? ` N°${u.numeroUnidad}` : ''}`}
                uf={u.precioLista}
                pct={r.precioListaTotal > 0 ? u.precioLista / r.precioListaTotal : 0}
                clp={u.precioLista * uf} />
            ))}
            <TRow label="Precio Lista Total"
              uf={r.precioListaTotal}
              pct={1}
              clp={r.precioListaTotal * uf} bold />
            {r.precioListaDepto !== r.precioDescDepto && (
              <TRow
                label={`Descuento Venta (${(r.descuentoAdicionalPct * 100).toFixed(1)}%)`}
                uf={-(r.precioListaDepto - r.precioDescDepto)}
                clp={-(r.precioListaDepto - r.precioDescDepto) * uf}
                shade negative />
            )}
            <TRow label="Valor de Venta"
              uf={r.valorVentaUF}
              pct={1}
              clp={r.valorVentaCLP} bold highlight />
          </tbody>
        </table>
      </section>

      {/* ── PLAN DE PIE ────────────────────────────────────── */}
      <section className="cotizacion-section mb-5">
        <SectionTitle>Plan de Pago — Pie ({(r.piePct * 100).toFixed(0)}%)</SectionTitle>
        <table className="cotizacion-table w-full text-sm">
          <thead>
            <tr className="bg-blue-700 text-white">
              <th className="text-left px-3 py-1.5">Concepto</th>
              <th className="text-right px-3 py-1.5">UF</th>
              <th className="text-right px-3 py-1.5">%</th>
              <th className="text-right px-3 py-1.5">$</th>
            </tr>
          </thead>
          <tbody>
            <TRow label="Pie Total"            uf={r.pieTotalUF}      pct={r.piePct}          clp={r.pieTotalUF*uf} bold shade />
            <TRow label="Reserva"              uf={r.reservaUF}       pct={r.reservaUF/r.valorVentaUF}   clp={r.reservaUF*uf} />
            <TRow label={`Upfront a la Promesa (${(r.upfrontPct*100).toFixed(0)}%)`} uf={r.upfrontUF} pct={r.upfrontPct} clp={r.upfrontUF*uf} shade />
            <TRow label={`Saldo Pie — ${r.cuotasPieN} cuotas`}
              uf={r.saldoPieUF} pct={r.saldoPieUF/r.valorVentaUF} clp={r.saldoPieCLP} />
            <TRow label="Valor cuota pie / mes"
              uf={r.valorCuotaPieUF} clp={r.valorCuotaPieCLP} shade bold />
            {r.cuotonUF > 0 && (
              <TRow label={`Cuotón — pago único a inmobiliaria (${(unidad.cuoton*100).toFixed(0)}%)`}
                uf={r.cuotonUF} pct={unidad.cuoton} clp={r.cuotonCLP} highlight />
            )}
            {r.piePeriodoConstruccionUF > 0 && (
              <TRow label={`Pie Período Construcción — cuotas decrecientes (${(unidad.piePeriodoConstruccion*100).toFixed(0)}%)`}
                uf={r.piePeriodoConstruccionUF} pct={unidad.piePeriodoConstruccion} clp={r.piePeriodoConstruccionCLP} highlight />
            )}
            {r.totalPieInmobUF !== r.pieTotalUF && (
              <TRow label="Total Pie a Inmobiliaria"
                uf={r.totalPieInmobUF} pct={r.totalPieInmobUF/r.valorVentaUF} clp={r.totalPieInmobUF*uf} bold shade />
            )}
          </tbody>
        </table>
        {r.piePeriodoConstruccionUF > 0 && (
          <p className="mt-1.5 text-xs text-amber-700">
            ⚠ Pie Período Construcción: las cuotas disminuyen mes a mes conforme avanza la obra.
            El monto indicado es el total a pagar durante el período de construcción.
          </p>
        )}
      </section>

      {/* ── CRÉDITO DIRECTO INMOBILIARIA (P3.C3) ─────────────── */}
      {r.pieCreditoDirectoUF > 0 && (
        <section className="cotizacion-section mb-5">
          <SectionTitle>Crédito Directo Inmobiliaria ({(unidad.pieCreditoDirecto*100).toFixed(0)}%)</SectionTitle>
          <table className="cotizacion-table w-full text-sm">
            <thead>
              <tr className="bg-blue-700 text-white">
                <th className="text-left px-3 py-1.5">Concepto</th>
                <th className="text-right px-3 py-1.5">UF</th>
                <th className="text-right px-3 py-1.5">%</th>
                <th className="text-right px-3 py-1.5">$</th>
              </tr>
            </thead>
            <tbody>
              <TRow label="Monto financiado por inmobiliaria"
                uf={r.pieCreditoDirectoUF} pct={unidad.pieCreditoDirecto} clp={r.pieCreditoDirectoCLP} bold shade />
            </tbody>
          </table>
          <p className="mt-1.5 text-xs text-amber-700">
            ⚠ Crédito Directo: la inmobiliaria financia este porcentaje directamente al comprador.
            El plazo y tasa de interés se acuerdan directamente con la inmobiliaria.
          </p>
        </section>
      )}

      {/* ── CRÉDITO HIPOTECARIO ─────────────────────────────── */}
      <section className="cotizacion-section mb-5">
        <SectionTitle>Crédito Hipotecario</SectionTitle>
        <table className="cotizacion-table w-full text-sm">
          <thead>
            <tr className="bg-blue-700 text-white">
              <th className="text-left px-3 py-1.5">Concepto</th>
              <th className="text-right px-3 py-1.5">UF</th>
              <th className="text-right px-3 py-1.5">%</th>
              <th className="text-right px-3 py-1.5">$</th>
            </tr>
          </thead>
          <tbody>
            <TRow label="Valor de Venta"
              uf={r.valorVentaUF} pct={r.valorVentaUF/r.tasacionUF} clp={r.valorVentaCLP} shade />
            <TRow label={`Pie (${(r.piePct*100).toFixed(0)}%)`}
              uf={r.pieTotalUF} pct={r.piePct} clp={r.pieTotalUF*uf} />
            {r.saldoAporteInmobUF > 0 && (
              <TRow label={`Aporte Inmobiliaria (${(unidad.bonoPie*100).toFixed(0)}%)`}
                uf={r.saldoAporteInmobUF} pct={unidad.bonoPie} clp={r.saldoAporteInmobUF*uf} />
            )}
            <TRow label="Tasación Banco"
              uf={r.tasacionUF} pct={1} clp={r.tasacionCLP} bold shade />
            <TRow label="Crédito Hipotecario"
              uf={r.creditoHipFinalUF} pct={r.creditoHipFinalUF/r.tasacionUF} clp={r.creditoHipFinalCLP} bold highlight />
          </tbody>
        </table>
      </section>

      {/* ── ESCENARIOS CAE ─────────────────────────────────── */}
      <section className="cotizacion-section mb-5">
        <SectionTitle>Crédito Hipotecario — {r.escenarios[0].cae > 0 ? `${r.escenarios[0].cuotaMensualCLP > 0 ? r.escenarios.length : ''}` : ''} Escenarios CAE · Plazo {resultado.escenarios[0] ? `calculado` : ''}</SectionTitle>
        <table className="cotizacion-table w-full text-sm">
          <thead>
            <tr className="bg-blue-700 text-white">
              <th className="text-left px-3 py-1.5">Concepto</th>
              {r.escenarios.map((e) => (
                <th key={e.cae} className="text-right px-3 py-1.5">CAE {(e.cae * 100).toFixed(1)}%</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <ERow label="Cuota mensual ($)" valores={r.escenarios.map((e) => formatCLP(e.cuotaMensualCLP))} shade />
            <ERow label="Cuota mensual (UF)" valores={r.escenarios.map((e) => `${formatUF(e.cuotaMensualUF)} UF`)} />
            <ERow label={`Arriendo est. mensual ($)`} valores={r.escenarios.map((e) => formatCLP(e.arriendoMensualCLP))} shade />
            <ERow label="Flujo mensual ($)" valores={r.escenarios.map((e) => formatCLP(e.flujoMensualCLP))}
              colorFn={(i) => r.escenarios[i].flujoMensualCLP >= 0 ? 'text-green-700 font-semibold' : 'text-red-600 font-semibold'} />
            <ERow label="Flujo acumulado 5 años ($)" valores={r.escenarios.map((e) => formatCLP(e.flujoAcumuladoCLP))} shade />
          </tbody>
        </table>
      </section>

      {/* ── EVALUACIÓN 5 AÑOS ──────────────────────────────── */}
      <section className="cotizacion-section mb-6">
        <SectionTitle>Evaluación a 5 Años (plusvalía {plusvaliaAnual}% anual)</SectionTitle>
        <table className="cotizacion-table w-full text-sm">
          <thead>
            <tr className="bg-blue-700 text-white">
              <th className="text-left px-3 py-1.5">Concepto</th>
              {r.escenarios.map((e) => (
                <th key={e.cae} className="text-right px-3 py-1.5">CAE {(e.cae * 100).toFixed(1)}%</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <ERow label="Precio de venta año 5 ($)" valores={r.escenarios.map(() => formatCLP(r.precioVentaAnio5CLP))} shade />
            <ERow label="Pie pagado ($)" valores={r.escenarios.map(() => formatCLP(r.piePagadoCLP))} />
            <ERow label="Flujo acumulado ($)" valores={r.escenarios.map((e) => formatCLP(e.flujoAcumuladoCLP))} shade />
            <ERow label="Cap Rate anual" valores={r.escenarios.map((e) => `${(e.capRate * 100).toFixed(1)}%`)} />
            <ERow label="ROI s/pie 5 años" valores={r.escenarios.map((e) => `${(e.roi5Anios * 100).toFixed(1)}%`)} bold />
            <ERow label="ROI anual compuesto" valores={r.escenarios.map((e) => `${(e.roiAnual * 100).toFixed(1)}%`)} shade bold />
          </tbody>
        </table>
      </section>

      {/* ── DISCLAIMER ─────────────────────────────────────── */}
      <footer className="cotizacion-footer border-t border-gray-300 pt-3 mt-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          Esta cotización ha sido elaborada para apoyarte en la evaluación de esta oportunidad inmobiliaria,
          considerando las condiciones comerciales vigentes informadas por la inmobiliaria a la fecha de emisión.
          La información aquí contenida es de carácter referencial y puede experimentar variaciones en valores,
          beneficios o condiciones comerciales según lo que finalmente defina la inmobiliaria para cada caso.
          Asimismo, los montos expresados en UF están sujetos a la variación del índice oficial publicado por el
          Banco Central de Chile, y las condiciones de financiamiento hipotecario dependerán de la evaluación y
          aprobación de la entidad financiera respectiva. Cotización emitida el {fecha}.
        </p>
      </footer>
    </div>
  )
}

// ── helpers de layout ─────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 border-b border-blue-200 pb-1 mb-2">
      {children}
    </h3>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1 text-sm">
      <span className="text-gray-500 min-w-[110px]">{label}:</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}

function TRow({
  label, uf, pct, clp, bold, shade, highlight, negative,
}: {
  label: string
  uf?: number
  pct?: number
  clp?: number
  bold?: boolean
  shade?: boolean
  highlight?: boolean  // fila especial: cuotón, pie construcción, crédito directo
  negative?: boolean
}) {
  const base = highlight ? 'bg-amber-50' : shade ? 'bg-gray-50' : 'bg-white'
  const cls  = `${base} ${bold ? 'font-semibold' : ''} ${highlight ? 'text-amber-900' : ''}`
  const sign = negative ? -1 : 1
  return (
    <tr className={cls}>
      <td className="px-3 py-1.5 text-left">{label}</td>
      <td className="px-3 py-1.5 text-right">
        {uf !== undefined ? `${formatUF(uf * sign)} UF` : ''}
      </td>
      <td className="px-3 py-1.5 text-right">
        {pct !== undefined ? `${(pct * 100).toFixed(1)}%` : ''}
      </td>
      <td className={`px-3 py-1.5 text-right ${negative ? 'text-red-600' : ''}`}>
        {clp !== undefined ? formatCLP(clp * sign) : ''}
      </td>
    </tr>
  )
}

function ERow({
  label, valores, bold, shade,
  colorFn,
}: {
  label: string
  valores: string[]
  bold?: boolean
  shade?: boolean
  colorFn?: (i: number) => string
}) {
  const base = shade ? 'bg-gray-50' : 'bg-white'
  return (
    <tr className={base}>
      <td className={`px-3 py-1.5 text-left ${bold ? 'font-semibold' : ''}`}>{label}</td>
      {valores.map((v, i) => (
        <td key={i} className={`px-3 py-1.5 text-right ${bold ? 'font-semibold' : ''} ${colorFn ? colorFn(i) : ''}`}>
          {v}
        </td>
      ))}
    </tr>
  )
}
