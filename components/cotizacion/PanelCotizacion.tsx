'use client'
// ============================================================
// PANEL COTIZACIÓN — resultados con escenarios CAE/pie/plazo
// ============================================================

import { useState, useTransition } from 'react'
import { getUFdelDia, getNumeroCotizacion, guardarCotizacionAction, getReglasInmobiliarias } from '@/app/actions/stock'
import {
  calcularCotizacion,
  type InputCotizacion,
  type ResultadoCotizacion,
  type EscenarioCAE,
} from '@/lib/calculators/cotizador'
import { formatCLP, formatUF } from '@/lib/data/uf-format'
import {
  CAE_OPTIONS, PIE_OPTIONS, PLAZO_OPTIONS, DEFAULTS,
  DESCUENTO_ADICIONAL_OPTIONS, BONO_PIE_OPTIONS, CUOTAS_PIE_OPTIONS,
  CUOTON_OPTIONS, withBase, getReglaInmobiliaria,
} from '@/lib/config/cotizadorConfig'
import type { UnidadCotizable } from '@/lib/data'
import type { BrokerData } from '@/components/broker/BrokerForm'
import type { CascadeSelection } from '@/components/cascade/CascadeSelector'
import CotizacionTemplate from './CotizacionTemplate'

interface Props {
  unidad:               UnidadCotizable
  broker:               BrokerData
  unidadesAdicionales?: CascadeSelection['unidadesAdicionales']
  onVolver?:            () => void
}

export default function PanelCotizacion({ unidad, broker, unidadesAdicionales = [], onVolver }: Props) {
  const [isPending, startTransition] = useTransition()

  // Parámetros editables
  // Regla: cuando hay bono pie, pie default = max(0, 20% - bonoPie%)
  const [piePct,              setPiePct]              = useState(
    unidad.bonoPie > 0 ? Math.max(0, 0.20 - unidad.bonoPie) : DEFAULTS.pie
  )
  const [upfrontPct,          setUpfrontPct]          = useState(DEFAULTS.upfront * 100)  // en %, default 2%
  const [descuentoAdicional,  setDescuentoAdicional]  = useState(0)  // delta en % sobre la base — default 0
  const [plazo,               setPlazo]               = useState(DEFAULTS.plazo)
  const [tasasCAE,            setTasasCAE]            = useState<[number, number, number]>([...DEFAULTS.cae])
  const [arriendos,           setArriendos]           = useState<[string, string, string]>(['', '', ''])
  const [plusvalia,           setPlusvalia]           = useState(2)

  // Condiciones comerciales editables (inicializadas desde la unidad seleccionada)
  const [bonoPiePct,          setBonoPiePct]          = useState(0)  // delta decimal sobre la base — default 0
  const [cuotasPieN,          setCuotasPieN]          = useState(unidad.cuotasPie || 60)
  const [pieConstruccionPct,  setPieConstruccionPct]  = useState(unidad.piePeriodoConstruccion)
  const [cuotonPct,           setCuotonPct]           = useState(unidad.cuoton)
  const [pieCreditoDirectoPct,setPieCreditoDirectoPct]= useState(unidad.pieCreditoDirecto)

  // Resultado + modo cotización
  const [resultado,  setResultado]  = useState<ResultadoCotizacion | null>(null)
  const [showDoc,    setShowDoc]    = useState(false)
  const [errorMsg,        setErrorMsg]        = useState<string | null>(null)
  const [pdfLoading,      setPdfLoading]      = useState(false)

  // Número de cotización (generado al crear el documento)
  const [numeroCot, setNumeroCot] = useState('')
  const [fechaCot,  setFechaCot]  = useState('')


  async function handleDescargarPDF() {
    if (!resultado) return
    setPdfLoading(true)
    try {
      // 1. Guardar fila en Historial_cotizaciones.xlsx (append)
      const now = new Date()
      const dia = String(now.getDate()).padStart(2, '0')
      const mes = String(now.getMonth() + 1).padStart(2, '0')
      const ani = now.getFullYear()
      await fetch('/api/cotizacion/salvar-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero:       numeroCot,
          fecha:        `${dia}-${mes}-${ani}`,
          proyecto:     unidad.nombreProyecto,
          comuna:       unidad.comuna,
          numeroUnidad: unidad.numeroUnidad,
          tipoUnidad:   unidad.tipoUnidad,
          broker:       broker.nombre,
          valorVentaUF: resultado.valorVentaUF,
          creditoHipUF: resultado.creditoHipFinalUF,
          piePct:       piePct,
          corredor:     broker.empresa ?? '',
        }),
      })

      // 2. Generar y descargar PDF
      const res = await fetch('/api/cotizacion/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero:             numeroCot,
          fecha:              fechaCot,
          broker,
          unidad,
          unidadesAdicionales,
          resultado,
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
    const parsed = arriendos.map((a) => parseInt(a.replace(/\D/g, ''), 10)) as [number, number, number]
    const invalid = parsed.findIndex((v) => !v || v <= 0)
    if (invalid >= 0) {
      setErrorMsg(`Ingresa el arriendo estimado del Escenario ${invalid + 1}`)
      return
    }
    setErrorMsg(null)

    startTransition(async () => {
      const [valorUF, reglas] = await Promise.all([getUFdelDia(), getReglasInmobiliarias()])
      const regla = getReglaInmobiliaria(unidad.alianza, reglas)

      const input: InputCotizacion = {
        precioListaDepto:          unidad.precioLista,
        descuentoPct:              0,
        descuentoAdicionalPct:     unidad.descuento + descuentoAdicional / 100,  // base + delta seleccionado
        bonoPiePct:                unidad.bonoPie + bonoPiePct,  // base + delta seleccionado
        reservaCLP:                unidad.reserva,
        preciosConjuntos:          unidadesAdicionales.map((u) => u.precioLista),
        piePct,
        upfrontPct:                upfrontPct / 100,
        plazoAnios:                plazo,
        tasasCAE,
        valorUF,
        cuotonPct,
        piePeriodoConstruccionPct: pieConstruccionPct,
        pieCreditoDirectoPct,
        cuotasPieN,
        arriendosMensualesCLP:     parsed,
        plusvaliaAnual:            plusvalia / 100,
        ltvMaxPct:                 regla.ltvMaxPct,
        tipoCalculoBono:           regla.tipoCalculoBono,
        pieConjuntosPct:           regla.pieConjuntosPct,
      }
      setResultado(calcularCotizacion(input))
      setShowDoc(false)
    })
  }

  return (
    <div className="space-y-4">

      {/* ── Fila A: Dcto. · Aporte Inmob. · % Pie · Cuotas Pie ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-[1fr_1fr_110px_155px]">
        {/* A1 — Descuento */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
            Descuento (%)
            {unidad.descuento > 0 && (
              <span className="ml-1 text-sm font-bold text-blue-900">base {(unidad.descuento * 100).toFixed(0)}%</span>
            )}
            <InfoTooltip text="El descuento fijo es el que se ve en texto azul. Si selecciona algún % del menú desplegable, este corresponde a descuento adicional sobre el base, que debe ser verificado y aprobado por Viveprop." />
          </span>
          <select
            value={descuentoAdicional}
            onChange={(e) => { setResultado(null); setDescuentoAdicional(parseFloat(e.target.value)) }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {DESCUENTO_ADICIONAL_OPTIONS.map((v) => {
              const pct = Math.round(v * 10000) / 100
              return <option key={pct} value={pct}>{Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(1)}%</option>
            })}
          </select>
        </label>

        {/* A2 — Bono Pie */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700 flex items-center gap-1 whitespace-nowrap">
            Aporte Inmobiliaria (%)
            {unidad.bonoPie === 0
              ? <span className="ml-1 text-xs text-red-400">no aplica</span>
              : <span className="ml-1 text-sm font-bold text-blue-900">base {(unidad.bonoPie * 100).toFixed(0)}%</span>
            }
            <InfoTooltip text="El Aporte Inmobiliaria fijo es el que se ve en texto azul. Si selecciona algún % del menú desplegable, este corresponde a Aporte Inmobiliaria adicional sobre el base, que debe ser verificado y aprobado por Viveprop." />
          </span>
          <select
            value={bonoPiePct}
            disabled={unidad.bonoPie === 0}
            onChange={(e) => { setResultado(null); setBonoPiePct(parseFloat(e.target.value)) }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60"
          >
            {BONO_PIE_OPTIONS.map((v) => {
              const pct = Math.round(v * 10000) / 100
              return <option key={v} value={v}>{Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(1)}%</option>
            })}
          </select>
        </label>

        {/* A3 — % de Pie */}
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

        {/* A4 — Cuotas Pie */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">
            Cuotas Pie
            <span className="ml-1 text-sm font-bold text-blue-900">base {unidad.cuotasPie}</span>
          </span>
          <select
            value={cuotasPieN}
            onChange={(e) => { setResultado(null); setCuotasPieN(parseInt(e.target.value)) }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {(CUOTAS_PIE_OPTIONS.includes(unidad.cuotasPie || 60)
              ? CUOTAS_PIE_OPTIONS
              : [...CUOTAS_PIE_OPTIONS, unidad.cuotasPie || 60].sort((a, b) => a - b)
            ).map((v) => (
              <option key={v} value={v}>{v} {v === 1 ? 'cuota' : 'cuotas'}</option>
            ))}
          </select>
        </label>
      </div>

      {/* ── Fila B: Pie Construcción · Cuotón · Crd. Directo ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {/* B1 — Pie Período Construcción */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">
            Pie Construcción
          </span>
          <div className="rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600 cursor-not-allowed">
            {unidad.piePeriodoConstruccion === 0 ? '0%' : `${(unidad.piePeriodoConstruccion * 100).toFixed(0)}%`}
          </div>
        </label>

        {/* B2 — Cuotón */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">
            Cuotón
            {unidad.cuoton === 0
              ? <span className="ml-1 text-xs text-red-400">no aplica</span>
              : <span className="ml-1 text-sm font-bold text-blue-900">base {(unidad.cuoton * 100).toFixed(0)}%</span>
            }
          </span>
          <select
            value={cuotonPct}
            disabled={unidad.cuoton === 0}
            onChange={(e) => { setResultado(null); setCuotonPct(parseFloat(e.target.value)) }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60"
          >
            {withBase(unidad.cuoton, CUOTON_OPTIONS).map((v) => (
              <option key={v} value={v}>{(v * 100).toFixed(0)}%</option>
            ))}
          </select>
        </label>

        {/* B3 — Pie Crédito Directo */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">
            Crédito Directo
          </span>
          <div className="rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600 cursor-not-allowed">
            {unidad.pieCreditoDirecto === 0 ? '0%' : `${(unidad.pieCreditoDirecto * 100).toFixed(0)}%`}
          </div>
        </label>
      </div>

      {/* ── Fila C: Plusvalía · Upfront · Plazo ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* C1 — Plusvalía */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Plusvalía anual (%)</span>
          <input
            type="number" min={0} max={20} step={0.5}
            value={plusvalia}
            onChange={(e) => { setResultado(null); setPlusvalia(parseFloat(e.target.value) || 0) }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>

        {/* C2 — Upfront */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Upfront Promesa (%)</span>
          <input
            type="number" min={0} max={20} step={0.5}
            value={upfrontPct}
            onChange={(e) => { setResultado(null); setUpfrontPct(parseFloat(e.target.value) || 0) }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>

        {/* C3 — Plazo */}
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

      </div>

      {/* ── Fila D: Escenarios CAE ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(['Escenario 1', 'Escenario 2', 'Escenario 3'] as const).map((label, i) => (
          <label key={i} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">{label} CAE</span>
            <select
              value={tasasCAE[i]}
              onChange={(e) => {
                setResultado(null)
                const next = [...tasasCAE] as [number, number, number]
                next[i] = parseFloat(e.target.value)
                setTasasCAE(next)
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {CAE_OPTIONS.map((o) => (
                <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {/* ── Fila E: Arriendo estimado por escenario ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {([0, 1, 2] as const).map((i) => (
          <label key={i} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">
              Arriendo est. Esc. {i + 1} ($/mes)
            </span>
            <input
              type="text"
              value={arriendos[i]}
              onChange={(e) => {
                setResultado(null)
                setErrorMsg(null)
                const raw = e.target.value.replace(/\D/g, '')
                const next = [...arriendos] as [string, string, string]
                next[i] = raw ? parseInt(raw).toLocaleString('es-CL') : ''
                setArriendos(next)
              }}
              placeholder="ej: 450.000"
              className={`rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                errorMsg && !arriendos[i] ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
          </label>
        ))}
      </div>
      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

      {/* Botones */}
      <div className="flex gap-3 flex-wrap">
        {!showDoc && (
          <button
            onClick={handleCotizar}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Calculando…' : 'Generar Cotización'}
          </button>
        )}

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
                unidadesAdicionales,
                resultado,
                piePct,
                plazoAnios:     plazo,
                tasasCAE,
                plusvaliaAnual: plusvalia / 100,
              }).catch((e) => console.error('[historial]', e))
            }}
            className="rounded-md border border-blue-600 px-6 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
          >
            Ver Documento
          </button>
        )}

        {!showDoc && onVolver && (
          <button
            onClick={onVolver}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            ← Volver
          </button>
        )}

        {showDoc && (
          <button
            onClick={handleDescargarPDF}
            disabled={pdfLoading}
            className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {pdfLoading ? 'Guardando y generando PDF…' : '⬇ Descargar PDF'}
          </button>
        )}
      </div>


      {/* ── Resultado resumido ────────────────────────── */}
      {resultado && !showDoc && <ResultadoPanel r={resultado} unidad={unidad} unidadesAdicionales={unidadesAdicionales} />}

      {/* ── Documento de cotización ──────────────────── */}
      {resultado && showDoc && (
        <div id="print-cotizacion" className="mt-6 border border-gray-200 rounded-lg p-8 bg-white shadow-sm">
          <CotizacionTemplate
            numero={numeroCot}
            fecha={fechaCot}
            broker={broker}
            unidad={unidad}
            unidadesAdicionales={unidadesAdicionales}
            resultado={resultado}
            plusvaliaAnual={plusvalia}
          />
        </div>
      )}
    </div>
  )
}

// ── Sub-componente resultado ──────────────────────────────

function ResultadoPanel({ r, unidad, unidadesAdicionales = [] }: {
  r: ResultadoCotizacion
  unidad: UnidadCotizable
  unidadesAdicionales?: UnidadCotizable[]
}) {
  return (
    <div className="space-y-6 rounded-lg border border-blue-100 bg-blue-50 p-5">

      {/* Precios */}
      <Section title="Precios">
        <Row label={`Precio Lista ${unidad.tipoUnidad}${unidad.numeroUnidad ? ` N°${unidad.numeroUnidad}` : ''}`} uf={r.precioListaDepto} clp={r.precioListaDepto * r.valorUF} />
        {unidadesAdicionales.map((u, i) => (
          <Row key={i}
            label={`Precio Lista ${u.tipoUnidad}${u.numeroUnidad ? ` N°${u.numeroUnidad}` : ''}`}
            uf={u.precioLista} clp={u.precioLista * r.valorUF} />
        ))}
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
          <Row label="Aporte Inmobiliaria" uf={r.saldoAporteInmobUF} />
        )}
        <Row label="Crédito Hipotecario"  uf={r.creditoHipFinalUF} clp={r.creditoHipFinalCLP} bold />
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
        <DT label="Arriendo est."  value={formatCLP(esc.arriendoMensualCLP)} />
        <DT label="Flujo mensual"
            value={formatCLP(esc.flujoMensualCLP)}
            className={positive ? 'text-green-700' : 'text-red-600'}
        />
        <DT label="Flujo 5 años"  value={formatCLP(esc.flujoAcumuladoCLP)} />
        <DT label="Cap Rate"      value={`${(esc.capRate * 100).toFixed(2)}%`} />
        <DT label="ROI 5 años"    value={`${(esc.roi5Anios * 100).toFixed(1)}%`} />
        <DT label="ROI anual"     value={`${(esc.roiAnual * 100).toFixed(1)}%`} />
      </dl>
    </div>
  )
}

// ── InfoTooltip ───────────────────────────────────────────
function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex items-center">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold cursor-pointer select-none leading-none">
        !
      </span>
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50
        w-64 rounded-md bg-gray-800 text-white text-xs leading-relaxed px-3 py-2 shadow-lg
        opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {text}
        <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-800" />
      </span>
    </span>
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
