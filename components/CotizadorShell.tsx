'use client'
// ============================================================
// COTIZADOR SHELL — orquesta la UI principal
// Pasos: 1. Selección unidad → 2. Datos corredor → 3. Cotización
// Perfilamiento: botón opcional que filtra unidades por capacidad
// ============================================================
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import CascadeSelector, { type CascadeSelection } from './cascade/CascadeSelector'
import BrokerForm, { type BrokerData } from './broker/BrokerForm'
import PanelCotizacion from './cotizacion/PanelCotizacion'
import PerfilamientoModal, { type RangoCapacidad } from './perfilamiento/PerfilamientoModal'
import ModalUnidades from './perfilamiento/ModalUnidades'
import UnidadesAdicionalesPanel from './perfilamiento/UnidadesAdicionalesPanel'
import type { UnidadCotizable } from '@/lib/data'

type Step = 'select' | 'broker' | 'quote'

export default function CotizadorShell({ ufDelDia }: { ufDelDia: number }) {
  const [step, setStep]           = useState<Step>('select')
  const [selection, setSelection] = useState<CascadeSelection | null>(null)
  const [broker, setBroker]       = useState<BrokerData | null>(null)
  const [cascadeKey, setCascadeKey] = useState(0)

  // ── Estado perfilamiento ─────────────────────────────────
  const [perfilOpen, setPerfilOpen]               = useState(false)
  const [rango, setRango]                         = useState<RangoCapacidad | null>(null)
  const [unidadesOpen, setUnidadesOpen]           = useState(false)
  const [fromPerfilamiento, setFromPerfilamiento] = useState(false)
  const [perfilamientoId, setPerfilamientoId]     = useState<string>('')
  const [datosCliente, setDatosCliente]           = useState<{ nombre: string; rut: string; email: string; telefono: string } | null>(null)

  // ── Reset completo ───────────────────────────────────────
  function resetCotizacion() {
    setStep('select')
    setSelection(null)
    setBroker(null)
    setFromPerfilamiento(false)
    setPerfilamientoId('')
    setDatosCliente(null)
    setRango(null)
    setPerfilOpen(false)
    setUnidadesOpen(false)
    setCascadeKey(k => k + 1)
  }

  // ── Handlers cotizador normal ────────────────────────────
  function handleSelectionChange(sel: CascadeSelection) {
    setSelection(sel)
    if (step !== 'select') setStep('select')
  }

  function handleSelectionConfirm() {
    if (selection?.unidad) setStep('broker')
  }

  function handleBrokerSubmit(data: BrokerData) {
    setBroker(data)
    setStep('quote')
  }

  // ── Handlers perfilamiento ───────────────────────────────
  function handlePerfilConfirmar(r: RangoCapacidad, id: string, dc: { nombre: string; rut: string; email: string; telefono: string }) {
    setRango(r)
    setPerfilamientoId(id)
    setDatosCliente(dc)
    setUnidadesOpen(true)
  }

  function handleUnidadSeleccionada(unidad: UnidadCotizable, adicionales: UnidadCotizable[]) {
    const sel: CascadeSelection = {
      comuna:              unidad.comuna,
      entrega:             unidad.tipoEntrega,
      inmobiliaria:        unidad.alianza,
      proyecto:            { alianza: unidad.alianza, nombreProyecto: unidad.nombreProyecto, nemotecnico: unidad.nemotecnico, comuna: unidad.comuna, direccion: unidad.direccion ?? '', tipoEntrega: unidad.tipoEntrega, periodoEntrega: unidad.periodoEntrega ?? '' },
      unidad,
      unidadesAdicionales: adicionales,
    }
    setSelection(sel)
    setFromPerfilamiento(true)
    setUnidadesOpen(false)
    setStep('select')   // vuelve a select para mostrar el panel de adicionales
  }

  function handleAdicionalesToPerfilamiento(adicionales: UnidadCotizable[]) {
    if (!selection) return
    setSelection({ ...selection, unidadesAdicionales: adicionales })
  }

  const unidad = selection?.unidad

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Navegación ── */}
      <nav className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Image src="/icon.png" alt="VIVEPROP" width={36} height={36} className="object-contain" priority />
            <span className="text-lg font-semibold text-gray-600">Cotizador Mercado Primario</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPerfilOpen(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 whitespace-nowrap"
            >
              Perfilar comprador
            </button>
            {/* Perfilamientos e Historial ocultos temporalmente */}
            <button
              onClick={resetCotizacion}
              className="rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50 whitespace-nowrap"
            >
              ← Nueva Cotización
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <StepIndicator current={step} />

        {/* ── Paso 1: Selección ── */}
        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-800">1. Selecciona la unidad</h2>
          <CascadeSelector key={cascadeKey} onSelectionChange={handleSelectionChange} />
          {unidad && (
            <div className="mt-4 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800 space-y-1">
              <div>
                <strong>{unidad.nombreProyecto}</strong>{' — '}
                Unidad {unidad.numeroUnidad} · {unidad.tipoUnidad} · {unidad.programa}
                {unidad.superficieTotal ? ` · ${Number(unidad.superficieTotal).toFixed(2)} m²` : ''}
                {' · '}
                <strong>{unidad.precioLista.toLocaleString('es-CL', { minimumFractionDigits: 2 })} UF</strong>
                {unidad.descuento > 0 && (
                  <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">
                    Dcto {(unidad.descuento * 100).toFixed(0)}%
                  </span>
                )}
                {unidad.bonoPie > 0 && (
                  <span className="ml-1 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-800">
                    Aporte Inmob. {(unidad.bonoPie * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              {selection?.unidadesAdicionales && selection.unidadesAdicionales.length > 0 && (
                <div className="text-xs text-blue-700">
                  + {selection.unidadesAdicionales.map(u =>
                    `${u.tipoUnidad} ${u.numeroUnidad} (${u.precioLista.toLocaleString('es-CL', { minimumFractionDigits: 2 })} UF)`
                  ).join(' · ')}
                </div>
              )}
            </div>
          )}
          {/* Panel adicionales — solo en flujo perfilamiento */}
          {fromPerfilamiento && unidad && (
            <div className="mt-4">
              <UnidadesAdicionalesPanel
                nemotecnico={unidad.nemotecnico}
                unidadesAdicionales={selection?.unidadesAdicionales ?? []}
                onChange={handleAdicionalesToPerfilamiento}
              />
            </div>
          )}

          {step === 'select' && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSelectionConfirm}
                disabled={!unidad}
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar →
              </button>
            </div>
          )}
        </section>

        {/* ── Paso 2: Broker ── */}
        {(step === 'broker' || step === 'quote') && (
          <section className="mt-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">2. Cliente y corredor</h2>
              {step === 'quote' && (
                <button
                  onClick={() => setStep('broker')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Editar
                </button>
              )}
            </div>
            <div className="mt-4">
              {step === 'broker' ? (
                <>
                  <BrokerForm
                    key={datosCliente ? `${datosCliente.nombre}::${datosCliente.rut}` : 'empty'}
                    onSubmit={handleBrokerSubmit}
                    initialCliente={datosCliente ?? undefined}
                  />
                  <div className="mt-3">
                    <button
                      onClick={() => setStep('select')}
                      className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
                    >
                      ← Volver a selección de unidad
                    </button>
                  </div>
                </>
              ) : broker ? (
                <div className="space-y-0.5 text-sm text-gray-700">
                  <p><span className="text-gray-500">Cliente:</span> <strong>{broker.nombre}</strong> · {broker.rut} · {broker.email}{broker.telefono ? ` · ${broker.telefono}` : ''}</p>
                  <p><span className="text-gray-500">Corredor:</span> <strong>{broker.empresa}</strong> · {broker.emailCorredor} · {broker.telefonoCorredor}</p>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* ── Paso 3: Cotización ── */}
        {step === 'quote' && unidad && broker && (
          <section className="mt-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-800">3. Cotización</h2>
            <PanelCotizacion
              unidad={unidad}
              broker={broker}
              unidadesAdicionales={selection?.unidadesAdicionales ?? []}
              onVolver={() => setStep('broker')}
            />
          </section>
        )}
      </div>

      {/* ── Modales perfilamiento ── */}
      <PerfilamientoModal
        open={perfilOpen}
        onClose={() => setPerfilOpen(false)}
        onConfirmar={handlePerfilConfirmar}
        ufDelDia={ufDelDia}
      />
      <ModalUnidades
        open={unidadesOpen}
        rango={rango}
        ufDelDia={ufDelDia}
        onClose={() => setUnidadesOpen(false)}
        onSeleccionar={handleUnidadSeleccionada}
      />
    </div>
  )
}

// ── StepIndicator ────────────────────────────────────────────────
function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'select', label: '1. Unidad' },
    { id: 'broker', label: '2. Cliente' },
    { id: 'quote',  label: '3. Cotización' },
  ]
  const order: Record<Step, number> = { select: 0, broker: 1, quote: 2 }
  return (
    <nav className="flex gap-1">
      {steps.map((s, i) => {
        const done   = order[current] > i
        const active = current === s.id
        return (
          <span
            key={s.id}
            className={[
              'flex-1 rounded px-3 py-1.5 text-center text-xs font-medium',
              active ? 'bg-blue-600 text-white' : '',
              done   ? 'bg-green-100 text-green-700' : '',
              !active && !done ? 'bg-gray-100 text-gray-400' : '',
            ].join(' ')}
          >
            {s.label}
          </span>
        )
      })}
    </nav>
  )
}
