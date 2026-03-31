'use client'
// ============================================================
// BROKER FORM — datos del cliente + nombre del corredor
// nombre/rut/email/telefono = cliente que compra
// empresa = nombre del corredor que usa la app
// ============================================================

import { useState } from 'react'
import { z } from 'zod'
import { validateRut, formatRut } from '@/lib/utils/rut'

const brokerSchema = z.object({
  nombre:   z.string().min(2, 'Ingresa el nombre completo del cliente'),
  rut:      z.string().refine(validateRut, 'RUT inválido'),
  email:    z.string().email('Email inválido'),
  telefono: z.string().regex(/^\+?[\d\s\-()]{7,15}$/, 'Teléfono inválido').optional().or(z.literal('')),
  empresa:  z.string().optional(),   // nombre del corredor que genera la cotización
})

export type BrokerData = z.infer<typeof brokerSchema>

interface Props {
  onSubmit: (data: BrokerData) => void
  disabled?: boolean
}

export default function BrokerForm({ onSubmit, disabled }: Props) {
  const [values, setValues] = useState<BrokerData>({
    nombre: '', rut: '', email: '', telefono: '', empresa: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof BrokerData, string>>>({})
  const [rutDisplay, setRutDisplay] = useState('')

  function handleChange(field: keyof BrokerData, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    // Clear error on change
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function handleRutChange(raw: string) {
    // Allow typing freely; format on blur
    const clean = raw.replace(/[^0-9kK.\-]/gi, '')
    setRutDisplay(clean)
    setValues((v) => ({ ...v, rut: clean }))
    if (errors.rut) setErrors((e) => ({ ...e, rut: undefined }))
  }

  function handleRutBlur() {
    if (values.rut) {
      const formatted = formatRut(values.rut)
      setRutDisplay(formatted)
      setValues((v) => ({ ...v, rut: v.rut }))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = brokerSchema.safeParse(values)
    if (!result.success) {
      const fieldErrors: typeof errors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof BrokerData
        if (!fieldErrors[field]) fieldErrors[field] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    onSubmit(result.data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>

      {/* Datos del cliente */}
      <h2 className="text-base font-semibold text-gray-800">Datos del Cliente</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Nombre completo *" error={errors.nombre}>
          <input
            type="text"
            value={values.nombre}
            onChange={(e) => handleChange('nombre', e.target.value)}
            disabled={disabled}
            placeholder="Juan Pérez"
            className={inputClass(!!errors.nombre)}
          />
        </FormField>

        <FormField label="RUT *" error={errors.rut}>
          <input
            type="text"
            value={rutDisplay}
            onChange={(e) => handleRutChange(e.target.value)}
            onBlur={handleRutBlur}
            disabled={disabled}
            placeholder="12.345.678-9"
            className={inputClass(!!errors.rut)}
          />
        </FormField>

        <FormField label="Email *" error={errors.email}>
          <input
            type="email"
            value={values.email}
            onChange={(e) => handleChange('email', e.target.value)}
            disabled={disabled}
            placeholder="cliente@ejemplo.cl"
            className={inputClass(!!errors.email)}
          />
        </FormField>

        <FormField label="Teléfono" error={errors.telefono}>
          <input
            type="tel"
            value={values.telefono}
            onChange={(e) => handleChange('telefono', e.target.value)}
            disabled={disabled}
            placeholder="+56 9 1234 5678"
            className={inputClass(!!errors.telefono)}
          />
        </FormField>
      </div>

      {/* Nombre del corredor */}
      <h2 className="text-base font-semibold text-gray-800">Corredor</h2>
      <div className="grid grid-cols-1">
        <FormField label="Nombre del corredor" error={errors.empresa}>
          <input
            type="text"
            value={values.empresa}
            onChange={(e) => handleChange('empresa', e.target.value)}
            disabled={disabled}
            placeholder="Tu nombre o nombre de la corredora"
            className={inputClass(false)}
          />
        </FormField>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={disabled}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirmar
        </button>
      </div>
    </form>
  )
}

// ── helpers ────────────────────────────────────────────────

function inputClass(hasError: boolean): string {
  return [
    'w-full rounded-md border px-3 py-2 text-sm shadow-sm',
    'focus:outline-none focus:ring-1',
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    'disabled:cursor-not-allowed disabled:bg-gray-100',
  ].join(' ')
}

function FormField({
  label,
  error,
  children,
  className = '',
}: {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
