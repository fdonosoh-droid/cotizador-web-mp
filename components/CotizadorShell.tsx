'use client'
// ============================================================
// COTIZADOR SHELL — orquesta la UI principal
// Pasos: 1. Selección unidad → 2. Datos corredor → 3. Cotización
// ============================================================
import { useState } from 'react'
import Image from 'next/image'
import CascadeSelector, { type CascadeSelection } from './cascade/CascadeSelector'
import BrokerForm, { type BrokerData } from './broker/BrokerForm'
import PanelCotizacion from './cotizacion/PanelCotizacion'

type Step = 'select' | 'broker' | 'quote'

export default function CotizadorShell() {
  const [step, setStep]           = useState<Step>('select')
  const [selection, setSelection] = useState<CascadeSelection | null>(null)
  const [broker, setBroker]       = useState<BrokerData | null>(null)

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

  const unidad = selection?.unidad

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="VIVEPROP" width={160} height={30} className="object-contain" priority />
            <span className="hidden text-lg font-semibold text-gray-600 sm:block">Cotizador Mercado Primario</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setStep('select'); setSelection(null); setBroker(null) }}
              className="rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50 whitespace-nowrap"
            >
              ← Nueva Cotización
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <StepIndicator current={step} />

        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-800">1. Selecciona la unidad</h2>
          <CascadeSelector onSelectionChange={handleSelectionChange} />
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
                  <BrokerForm onSubmit={handleBrokerSubmit} />
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
    </div>
  )
}

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
