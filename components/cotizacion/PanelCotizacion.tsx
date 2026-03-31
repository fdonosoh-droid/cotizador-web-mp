'use client'
// ============================================================
// PANEL COTIZACIÓN — resultados con escenarios CAE/pie/plazo
// ============================================================

import { useRef, useState, useTransition } from 'react'
import { getUFdelDia, getNumeroCotizacion, guardarCotizacionAction } from '@/app/actions/stock'
import {
  calcularCotizacion,
  type InputCotizacion,
  type ResultadoCotizacion,
  type EscenarioCAE,
} from '@/lib/calculators/cotizador'
import { formatCLP, formatUF } from '@/lib/data/uf-format'
import {
  CAE_OPTIONS, PIE_OPTIONS, PLAZO_OPTIONS, DEFAULTS,
  BONO_PIE_OPTIONS, CUOTAS_PIE_OPTIONS, PIE_CONSTRUCCION_OPTIONS,
  CUOTON_OPTIONS, PIE_CREDITO_DIRECTO_OPTIONS, withBase,
} from '@/lib/config/cotizadorConfig'
import type { UnidadCotizable } from '@/lib/data'
import type { BrokerData } from '@/components/broker/BrokerForm'
import type { CascadeSelection } from '@/components/cascade/CascadeSelector'
import CotizacionTemplate from './CotizacionTemplate'

interface Props {
  unidad:               UnidadCotizable
  broker:               BrokerData
  unidadesAdicionales?: CascadeSelection['unidadesAdicionales']
}

export default function PanelCotizacion({ unidad, broker, unidadesAdicionales = [] }: Props) {
  const [isPending, startTransition] = useTransition()

  // Parámetros editables
  const [piePct,              setPiePct]              = useState(DEFAULTS.pie)
  const [upfrontPct,          setUpfrontPct]          = useState(DEFAULTS.upfront * 100)  // en %
  const [descuentoAdicional,  setDescuentoAdicional]  = useState(0)  // en %
  const [plazo,               setPlazo]               = useState(DEFAULTS.plazo)
  const [tasasCAE,            setTasasCAE]            = useState<[number, number, number]>([...DEFAULTS.cae])
  const [arriendo,            setArriendo]            = useState<string>('')
  const [plusvalia,           setPlusvalia]           = useState(2)

  // Condiciones comerciales editables (inicializadas desde la unidad seleccionada)
  const [bonoPiePct,          setBonoPiePct]          = useState(unidad.bonoPie)
  const [cuotasPieN,          setCuotasPieN]          = useState(unidad.cuotasPie || 60)
  const [pieConstruccionPct,  setPieConstruccionPct]  = useState(unidad.piePeriodoConstruccion)
  const [cuotonPct,           setCuotonPct]           = useState(unidad.cuoton)
  const [pieCreditoDirectoPct,setPieCreditoDirectoPct]= useState(unidad.pieCreditoDirecto)

  // Resultado + modo cotización
  const [resultado,       setResultado]       = useState<ResultadoCotizacion | null>(null)
  const [arriendoCLPCalc, setArriendoCLPCalc] = useState(0)
  const [showDoc,         setShowDoc]         = useState(false)
  const [errorMsg,        setErrorMsg]        = useState<string | null>(null)
  const [pdfLoading,      setPdfLoading]      = useState(false)

  // Número de cotización (generado al crear el documento)
  const [numeroCot, setNumeroCot] = useState('')
  const [fechaCot,  setFechaCot]  = useState('')

  // Email
  const [showEmailForm,  setShowEmailForm]  = useState(false)
  const [emailCliente,   setEmailCliente]   = useState('')
  const [emailStatus,    setEmailStatus]    = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [emailError,     setEmailError]     = useState<string | null>(null)

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

  async function handleEnviarEmail() {
    if (!resultado) return
    setEmailStatus('sending')
    setEmailError(null)
    try {
      const res = await fetch('/api/cotizacion/email', {
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
          emailCliente:       emailCliente.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      setEmailStatus('ok')
      setShowEmailForm(false)
    } catch (e) {
      setEmailStatus('error')
      setEmailError(e instanceof Error ? e.message : 'Error al enviar')
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
      const valorUF = await getUFdelDia()

      const input: InputCotizacion = {
        precioListaDepto:          unidad.precioLista,
        descuentoPct:              unidad.descuento,
        descuentoAdicionalPct:     descuentoAdicional / 100,
        bonoPiePct,
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
        arriendoMensualCLP:        arriendoCLP,
        plusvaliaAnual:            plusvalia / 100,
      }
      setResultado(calcularCotizacion(input))
      setArriendoCLPCalc(arriendoCLP)
      setShowDoc(false)
    })
  }

  return (
    <div className="space-y-4">

      {/* ── Fila A: Dcto.adicional · Bono Pie · % Pie · Cuotas Pie ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* A1 — Descuento adicional */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">
            Dcto. adicional (%)
            {unidad.descuento > 0 && (
              <span className="ml-1 text-xs text-gray-400">+ {(unidad.descuento * 100).toFixed(0)}% base</span>
            )}
          </span>
          <input
            type="number" min={0} max={30} step={0.5}
            value={descuentoAdicional}
            onChange={(e) => { setResultado(null); setDescuentoAdicional(parseFloat(e.target.value) || 0) }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>

        {/* A2 — Bono Pie */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">
            % Bono Pie
            {unidad.bonoPie === 0
              ? <span className="ml-1 text-xs text-red-400">no aplica</span>
              : <span className="ml-1 text-xs text-gray-400">base {(unidad.bonoPie * 100).toFixed(0)}%</span>
            }
          </span>
          <select
            value={bonoPiePct}
            disabled={unidad.bonoPie === 0}
            onChange={(e) => { setResultado(null); setBonoPiePct(parseFloat(e.target.value)) }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60"
          >
            {withBase(unidad.bonoPie, BONO_PIE_OPTIONS).map((v) => (
              <option key={v} value={v}>{(v * 100).toFixed(0)}%</option>
            ))}
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
            <span className="ml-1 text-xs text-gray-400">base {unidad.cuotasPie}</span>
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
            {unidad.piePeriodoConstruccion === 0
              ? <span className="ml-1 text-xs text-red-400">no aplica</span>
              : <span className="ml-1 text-xs text-gray-400">base {(unidad.piePeriodoConstruccion * 100).toFixed(0)}%</span>
            }
          </span>
          <select
            value={pieConstruccionPct}
            disabled={unidad.piePeriodoConstruccion === 0}
            onChange={(e) => { setResultado(null); setPieConstruccionPct(parseFloat(e.target.value)) }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60"
          >
            {withBase(unidad.piePeriodoConstruccion, PIE_CONSTRUCCION_OPTIONS).map((v) => (
              <option key={v} value={v}>{(v * 100).toFixed(0)}%</option>
            ))}
          </select>
        </label>

        {/* B2 — Cuotón */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">
            Cuotón
            {unidad.cuoton === 0
              ? <span className="ml-1 text-xs text-red-400">no aplica</span>
              : <span className="ml-1 text-xs text-gray-400">base {(unidad.cuoton * 100).toFixed(0)}%</span>
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
            Crd. Directo
            {unidad.pieCreditoDirecto === 0
              ? <span className="ml-1 text-xs text-red-400">no aplica</span>
              : <span className="ml-1 text-xs text-gray-400">base {(unidad.pieCreditoDirecto * 100).toFixed(0)}%</span>
            }
          </span>
          <select
            value={pieCreditoDirectoPct}
            disabled={unidad.pieCreditoDirecto === 0}
            onChange={(e) => { setResultado(null); setPieCreditoDirectoPct(parseFloat(e.target.value)) }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60"
          >
            {withBase(unidad.pieCreditoDirecto, PIE_CREDITO_DIRECTO_OPTIONS).map((v) => (
              <option key={v} value={v}>{(v * 100).toFixed(0)}%</option>
            ))}
          </select>
        </label>
      </div>

      {/* ── Fila C: Plusvalía · Upfront · Plazo · Arriendo ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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

        {/* C4 — Arriendo estimado */}
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
          <>
            <button
              onClick={() => {
                setShowEmailForm((v) => !v)
                setEmailStatus('idle')
                setEmailError(null)
              }}
              className="rounded-md border border-teal-600 px-6 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
            >
              ✉ Enviar por Email
            </button>
            <button
              onClick={() => setShowDoc(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              ← Volver
            </button>
          </>
        )}
      </div>

      {/* ── Formulario envío email ───────────────────── */}
      {showDoc && showEmailForm && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <span className="text-xs font-medium text-teal-800">
              Email del cliente <span className="font-normal text-teal-600">(opcional)</span>
            </span>
            <input
              type="email"
              value={emailCliente}
              onChange={(e) => setEmailCliente(e.target.value)}
              placeholder="cliente@email.com"
              className="rounded-md border border-teal-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-teal-700">
              Siempre se envía a: <strong>{broker.email}</strong>
            </span>
            <button
              onClick={handleEnviarEmail}
              disabled={emailStatus === 'sending'}
              className="rounded-md bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {emailStatus === 'sending' ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
          {emailStatus === 'ok' && (
            <p className="w-full text-sm font-medium text-teal-700">✓ Email enviado correctamente</p>
          )}
          {emailStatus === 'error' && (
            <p className="w-full text-sm text-red-600">{emailError}</p>
          )}
        </div>
      )}

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
