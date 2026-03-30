'use client'
// ============================================================
// PANEL COTIZACIÓN — resultados con escenarios CAE/pie/plazo
// ============================================================

import { useRef, useState, useTransition } from 'react'
import { getBienesConjuntos, getUFdelDia, getNumeroCotizacion, guardarCotizacionAction } from '@/app/actions/stock'
import {
  calcularCotizacion,
  type InputCotizacion,
  type ResultadoCotizacion,
  type EscenarioCAE,
} from '@/lib/calculators/cotizador'
import { formatCLP, formatUF } from '@/lib/data/uf-format'
import { CAE_OPTIONS, PIE_OPTIONS, PLAZO_OPTIONS, DEFAULTS } from '@/lib/config/cotizadorConfig'
import type { UnidadCotizable } from '@/lib/data'
import type { BrokerData } from '@/components/broker/BrokerForm'
import CotizacionTemplate from './CotizacionTemplate'

interface Props {
  unidad: UnidadCotizable
  broker: BrokerData
}

export default function PanelCotizacion({ unidad, broker }: Props) {
  const [isPending, startTransition] = useTransition()

  // Parámetros editables
  const [piePct,    setPiePct]    = useState(DEFAULTS.pie)
  const [plazo,     setPlazo]     = useState(DEFAULTS.plazo)
  const [tasasCAE,  setTasasCAE]  = useState<[number, number, number]>([...DEFAULTS.cae])
  const [arriendo,  setArriendo]  = useState<string>('')
  const [plusvalia, setPlusvalia] = useState(2)

  // Resultado + modo cotización
  const [resultado,       setResultado]       = useState<ResultadoCotizacion | null>(null)
  const [arriendoCLPCalc, setArriendoCLPCalc] = useState(0)
  const [showDoc,         setShowDoc]         = useState(false)
  const [errorMsg,        setErrorMsg]        = useState<string | null>(null)
  const [pdfLoading,      setPdfLoading]      = useState(false)

  // Número de cotización (generado al crear el documento)
  const [numeroCot, setNumeroCot] = useState('')
  const [fechaCot,  setFechaCot]  = useState('')

  async function handleDescargarPDF() {
    if (!resultado) return
    setPdfLoading(true)
    try {
      const res = await fetch('/api/cotizacion/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero:             numeroCot,
          fecha:              fechaCot,
          broker,
          unidad,
          resultado,
          arriendoMensualCLP: arriendoCLPCalc,
          plusvaliaAnual:     plusvalia,
        }),
      })
      if (!res.ok) throw new Error('Error al generar PDF')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `cotizacion-${numeroCot}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setPdfLoading(false)
    }
  }

  function handleCotizar() {
    const arriendoCLP = parseInt(arriendo.replace(/\D/g, ''), 10)
    if (!arriendoCLP || arriendoCLP <= 0) {
      setErrorMsg('Ingresa el arriendo mensual estimado')
      return
    }
    setErrorMsg(null)

    startTransition(async () => {
      const [valorUF, conjuntos] = await Promise.all([
        getUFdelDia(),
        unidad.bienesConjuntos
          ? getBienesConjuntos(unidad.nemotecnico, unidad.bienesConjuntos)
          : Promise.resolve([]),
      ])

      const input: InputCotizacion = {
        precioListaDepto:          unidad.precioLista,
        descuentoPct:              unidad.descuento,
        bonoPiePct:                unidad.bonoPie,
        reservaCLP:                unidad.reserva,
        preciosConjuntos:          conjuntos.map((c) => c.precioLista),
        piePct,
        plazoAnios:                plazo,
        tasasCAE,
        valorUF,
        cuotonPct:                 unidad.cuoton,
        piePeriodoConstruccionPct: unidad.piePeriodoConstruccion,
        pieCreditoDirectoPct:      unidad.pieCreditoDirecto,
        arriendoMensualCLP:        arriendoCLP,
        plusvaliaAnual:            plusvalia / 100,
      }
      setResultado(calcularCotizacion(input))
      setArriendoCLPCalc(arriendoCLP)
      setShowDoc(false)
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Parámetros ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pie */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">% de Pie</span>
          <select
            value={piePct}
            onChange={(e) => { setResultado(null); setPiePct(parseFloat(e.target.value)) }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PIE_OPTIONS.map((o) => (
              <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
            ))}
          </select>
        </label>

        {/* Plazo */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Plazo</span>
          <select
            value={plazo}
            onChange={(e) => { setResultado(null); setPlazo(parseInt(e.target.value)) }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PLAZO_OPTIONS.map((o) => (
              <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
            ))}
          </select>
        </label>

        {/* Arriendo estimado */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Arriendo est. ($/mes)</span>
          <input
            type="text"
            value={arriendo}
            onChange={(e) => {
              setResultado(null)
              setErrorMsg(null)
              const raw = e.target.value.replace(/\D/g, '')
              setArriendo(raw ? parseInt(raw).toLocaleString('es-CL') : '')
            }}
            placeholder="ej: 450.000"
            className={`rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
              errorMsg ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
        </label>

        {/* Plusvalía */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Plusvalía anual (%)</span>
          <input
            type="number"
            min={0} max={20} step={0.5}
            value={plusvalia}
            onChange={(e) => { setResultado(null); setPlusvalia(parseFloat(e.target.value) || 0) }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>
      </div>

      {/* CAE selectors */}
      <div className="flex flex-wrap gap-4">
        {(['Escenario 1', 'Escenario 2', 'Escenario 3'] as const).map((label, i) => (
          <label key={i} className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-600">{label} CAE:</span>
            <select
              value={tasasCAE[i]}
              onChange={(e) => {
                setResultado(null)
                const next = [...tasasCAE] as [number, number, number]
                next[i] = parseFloat(e.target.value)
                setTasasCAE(next)
              }}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              {CAE_OPTIONS.map((o) => (
                <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {/* Botones */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleCotizar}
          disabled={isPending}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Calculando…' : 'Generar Cotización'}
        </button>

        {resultado && !showDoc && (
          <button
            onClick={async () => {
              const numero = await getNumeroCotizacion()
              const now    = new Date()
              const fecha  = now.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
              setNumeroCot(numero)
              setFechaCot(fecha)
              setShowDoc(true)
              // Persistir en historial (no bloquea la UI)
              guardarCotizacionAction({
                numero,
                fecha,
                broker,
                unidad,
                resultado,
                piePct,
                plazoAnios:     plazo,
                tasasCAE,
                arriendoCLP:    arriendoCLPCalc,
                plusvaliaAnual: plusvalia / 100,
              }).catch((e) => console.error('[historial]', e))
            }}
            className="rounded-md border border-blue-600 px-6 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
          >
            Ver Documento
          </button>
        )}

        {showDoc && (
          <>
            <button
              onClick={() => window.print()}
              className="rounded-md bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              🖨 Imprimir
            </button>
            <button
              onClick={handleDescargarPDF}
              disabled={pdfLoading}
              className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {pdfLoading ? 'Generando PDF…' : '⬇ Descargar PDF'}
            </button>
          </>
        )}

        {showDoc && (
          <button
            onClick={() => setShowDoc(false)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            ← Volver
          </button>
        )}
      </div>

      {/* ── Resultado resumido ────────────────────────── */}
      {resultado && !showDoc && <ResultadoPanel r={resultado} />}

      {/* ── Documento de cotización ──────────────────── */}
      {resultado && showDoc && (
        <div id="print-cotizacion" className="mt-6 border border-gray-200 rounded-lg p-8 bg-white shadow-sm">
          <CotizacionTemplate
            numero={numeroCot}
            fecha={fechaCot}
            broker={broker}
            unidad={unidad}
            resultado={resultado}
            arriendoMensualCLP={arriendoCLPCalc}
            plusvaliaAnual={plusvalia}
          />
        </div>
      )}
    </div>
  )
}

// ── Sub-componente resultado ──────────────────────────────

function ResultadoPanel({ r }: { r: ResultadoCotizacion }) {
  return (
    <div className="space-y-6 rounded-lg border border-blue-100 bg-blue-50 p-5">

      {/* Precios */}
      <Section title="Precios">
        <Row label="Precio Lista Depto"    uf={r.precioListaDepto}  clp={r.precioListaDepto * r.valorUF} />
        {r.precioListaOtros > 0 && (
          <Row label="Bienes conjuntos" uf={r.precioListaOtros} clp={r.precioListaOtros * r.valorUF} />
        )}
        <Row label="Precio Lista Total"   uf={r.precioListaTotal} bold />
        <Row label={`Descuento (depto)`}  uf={r.precioListaDepto - r.precioDescDepto} negative />
        <Row label="Valor de Venta"       uf={r.valorVentaUF}    clp={r.valorVentaCLP} bold />
      </Section>

      {/* Pie */}
      <Section title={`Pie (${(r.piePct * 100).toFixed(0)}%)`}>
        <Row label="Pie Total"            uf={r.pieTotalUF} />
        <Row label="Reserva"              uf={r.reservaUF} />
        <Row label="Upfront a la Promesa" uf={r.upfrontUF} />
        <Row label={`Saldo Pie (${r.cuotasPieN} cuotas)`} uf={r.saldoPieUF} clp={r.saldoPieCLP} />
        <Row label="Valor cuota pie/mes"  uf={r.valorCuotaPieUF} clp={r.valorCuotaPieCLP} />
        {r.cuotonUF > 0 && (
          <Row label="Cuotón (pago único a inmobiliaria)" uf={r.cuotonUF} clp={r.cuotonCLP} highlight />
        )}
        {r.piePeriodoConstruccionUF > 0 && (
          <Row label="Pie Período Construcción (cuotas decrecientes)" uf={r.piePeriodoConstruccionUF} clp={r.piePeriodoConstruccionCLP} highlight />
        )}
        {r.totalPieInmobUF !== r.pieTotalUF && (
          <Row label="Total pie a inmobiliaria" uf={r.totalPieInmobUF} bold />
        )}
      </Section>

      {/* Crédito Directo Inmobiliaria (P3.C3) */}
      {r.pieCreditoDirectoUF > 0 && (
        <Section title="Crédito Directo Inmobiliaria">
          <Row label="Monto financiado por inmobiliaria" uf={r.pieCreditoDirectoUF} clp={r.pieCreditoDirectoCLP} bold />
          <p className="text-xs text-amber-700 mt-1">Condiciones (plazo/interés) según acuerdo con la inmobiliaria</p>
        </Section>
      )}

      {/* Tasación / Bono Pie */}
      <Section title="Crédito Hipotecario">
        <Row label="Tasación (compraventa banco)" uf={r.tasacionUF} clp={r.tasacionCLP} />
        {r.saldoAporteInmobUF > 0 && (
          <Row label="Aporte Inmobiliaria (Bono Pie)" uf={r.saldoAporteInmobUF} />
        )}
        <Row label="Crédito Hipotecario"  uf={r.creditoHipFinalUF} clp={r.creditoHipFinalCLP} bold />
        <Row label="Cap Rate anual"       pct={r.capRate * 100} />
      </Section>

      {/* Escenarios CAE */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-800">Escenarios CAE</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {r.escenarios.map((esc) => (
            <EscenarioCard key={esc.cae} esc={esc} />
          ))}
        </div>
      </div>

      {/* Evaluación 5 años */}
      <Section title="Evaluación a 5 años">
        <Row label={`Plusvalía (${(r.plusvaliaAcumulada * 100).toFixed(1)}%)`} clp={r.precioVentaAnio5CLP} />
        <Row label="Pie pagado (inversión)" clp={r.piePagadoCLP} />
      </Section>
    </div>
  )
}

function EscenarioCard({ esc }: { esc: EscenarioCAE }) {
  const positive = esc.flujoMensualCLP >= 0
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-2 text-center text-sm font-bold text-blue-700">
        CAE {(esc.cae * 100).toFixed(1)}%
      </p>
      <dl className="space-y-1 text-sm">
        <DT label="Cuota mensual" value={formatCLP(esc.cuotaMensualCLP)} />
        <DT label="Flujo mensual"
            value={formatCLP(esc.flujoMensualCLP)}
            className={positive ? 'text-green-700' : 'text-red-600'}
        />
        <DT label="Flujo 5 años"  value={formatCLP(esc.flujoAcumuladoCLP)} />
        <DT label="ROI 5 años"    value={`${(esc.roi5Anios * 100).toFixed(1)}%`} />
        <DT label="ROI anual"     value={`${(esc.roiAnual * 100).toFixed(1)}%`} />
      </dl>
    </div>
  )
}

// ── helpers UI ────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-gray-700">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Row({
  label, uf, clp, pct, negative = false, bold = false, highlight = false,
}: {
  label: string
  uf?:  number
  clp?: number
  pct?: number
  negative?:  boolean
  bold?:      boolean
  highlight?: boolean  // fila especial (cuotón, pie construcción)
}) {
  const cls = `flex justify-between text-sm ${
    bold      ? 'font-semibold text-gray-900' :
    highlight ? 'font-medium text-amber-800'  :
    'text-gray-700'
  }`
  let value = ''
  if (pct !== undefined) value = `${pct.toFixed(2)}%`
  else if (clp !== undefined) value = formatCLP(negative ? -clp : clp)
  else if (uf !== undefined)  value = `${formatUF(negative ? -uf : uf)} UF`

  return (
    <div className={cls}>
      <span>{label}</span>
      <span className={negative ? 'text-red-600' : ''}>{value}</span>
    </div>
  )
}

function DT({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`font-medium ${className}`}>{value}</dd>
    </div>
  )
}
