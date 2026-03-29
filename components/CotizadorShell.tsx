'use client'
// ============================================================
// COTIZADOR SHELL — orquesta la UI principal
// Combina cascada de selección, datos de broker y (próximamente)
// el panel de cotización con escenarios CAE/pie/plazo.
// ============================================================

import { useState } from 'react'
import CascadeSelector, { type CascadeSelection } from './cascade/CascadeSelector'
import BrokerForm, { type BrokerData } from './broker/BrokerForm'

type Step = 'select' | 'broker' | 'quote'

export default function CotizadorShell() {
  const [step, setStep]           = useState<Step>('select')
  const [selection, setSelection] = useState<CascadeSelection | null>(null)
  const [broker, setBroker]       = useState<BrokerData | null>(null)

  function handleSelectionChange(sel: CascadeSelection) {
    setSelection(sel)
    // Si cambia la selección, volver al paso inicial
    if (step !== 'select') setStep('select')
  }

  function handleSelectionConfirm() {
    if (selection?.unidad) setStep('broker')
  }

  function handleBrokerSubmit(data: BrokerData) {
    setBroker(data)
    setStep('quote')
  }

  const unidad = selection?.unidad

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cotizador Mercado Primario</h1>
        <p className="mt-1 text-sm text-gray-500">
          Selecciona la unidad para generar la cotización
        </p>
      </header>

      {/* Pasos */}
      <StepIndicator current={step} />

      {/* ── Paso 1: Selección en cascada ─────────────────── */}
      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-800">
          1. Selecciona la unidad
        </h2>
        <CascadeSelector onSelectionChange={handleSelectionChange} />

        {/* Resumen de unidad seleccionada */}
        {unidad && (
          <div className="mt-4 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <strong>{unidad.nombreProyecto}</strong> —{' '}
            Unidad {unidad.numeroUnidad} · {unidad.tipoUnidad} · {unidad.programa}
            {unidad.superficieTotal ? ` · ${unidad.superficieTotal} m²` : ''}
            {' · '}
            <strong>{unidad.precioLista.toLocaleString('es-CL', { minimumFractionDigits: 2 })} UF</strong>
          </div>
        )}

        {step === 'select' && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSelectionConfirm}
              disabled={!unidad}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white
                         hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continuar →
            </button>
          </div>
        )}
      </section>

      {/* ── Paso 2: Datos del corredor ───────────────────── */}
      {(step === 'broker' || step === 'quote') && (
        <section className="mt-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-800">
            2. Datos del corredor
          </h2>
          {step === 'broker' ? (
            <BrokerForm onSubmit={handleBrokerSubmit} />
          ) : broker ? (
            <div className="text-sm text-gray-700">
              <strong>{broker.nombre}</strong> · {broker.rut} · {broker.email}
              {broker.empresa ? ` · ${broker.empresa}` : ''}
            </div>
          ) : null}
        </section>
      )}

      {/* ── Paso 3: Cotización (próximamente) ────────────── */}
      {step === 'quote' && (
        <section className="mt-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-800">
            3. Cotización
          </h2>
          <p className="text-sm text-gray-500">
            Motor de cálculo en construcción (Etapa 3).
          </p>
        </section>
      )}
    </div>
  )
}

// ── StepIndicator ─────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'select', label: '1. Unidad' },
    { id: 'broker', label: '2. Corredor' },
    { id: 'quote',  label: '3. Cotización' },
  ]
  const order: Record<Step, number> = { select: 0, broker: 1, quote: 2 }

  return (
    <nav className="flex gap-1">
      {steps.map((s, i) => {
        const done    = order[current] > i
        const active  = current === s.id
        return (
          <span
            key={s.id}
            className={[
              'flex-1 rounded px-3 py-1.5 text-center text-xs font-medium',
              active  ? 'bg-blue-600 text-white'                       : '',
              done    ? 'bg-green-100 text-green-700'                   : '',
              !active && !done ? 'bg-gray-100 text-gray-400'            : '',
            ].join(' ')}
          >
            {s.label}
          </span>
        )
      })}
    </nav>
  )
}
