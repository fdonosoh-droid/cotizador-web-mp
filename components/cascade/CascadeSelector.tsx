'use client'
// ============================================================
// CASCADE SELECTOR — selección en 5 pasos
// Comuna → Entrega → Inmobiliaria → Proyecto → N°Unidad
// ============================================================

import { useEffect, useState, useTransition } from 'react'
import {
  getComunas,
  getEntregas,
  getInmobiliarias,
  getProyectos,
  getUnidades,
} from '@/app/actions/stock'
import type { ProyectoRow, UnidadCotizable } from '@/lib/data'

export interface CascadeSelection {
  comuna:       string
  entrega:      string
  inmobiliaria: string
  proyecto:     ProyectoRow | null
  unidad:       UnidadCotizable | null
}

interface Props {
  onSelectionChange: (sel: CascadeSelection) => void
}

const EMPTY: CascadeSelection = {
  comuna: '', entrega: '', inmobiliaria: '', proyecto: null, unidad: null,
}

export default function CascadeSelector({ onSelectionChange }: Props) {
  const [isPending, startTransition] = useTransition()

  // Data lists
  const [comunas,       setComunas]       = useState<string[]>([])
  const [entregas,      setEntregas]      = useState<string[]>([])
  const [inmobiliarias, setInmobiliarias] = useState<string[]>([])
  const [proyectos,     setProyectos]     = useState<ProyectoRow[]>([])
  const [unidades,      setUnidades]      = useState<UnidadCotizable[]>([])

  // Selections
  const [sel, setSel] = useState<CascadeSelection>(EMPTY)

  // ── Load comunas on mount ──────────────────────────────────
  useEffect(() => {
    startTransition(async () => {
      const data = await getComunas()
      setComunas(data)
    })
  }, [])

  // ── Handlers ──────────────────────────────────────────────

  function handleComuna(comuna: string) {
    const next = { ...EMPTY, comuna }
    setSel(next)
    setEntregas([])
    setInmobiliarias([])
    setProyectos([])
    setUnidades([])
    onSelectionChange(next)
    if (!comuna) return
    startTransition(async () => {
      const data = await getEntregas(comuna)
      setEntregas(data)
    })
  }

  function handleEntrega(entrega: string) {
    const next = { ...EMPTY, comuna: sel.comuna, entrega }
    setSel(next)
    setInmobiliarias([])
    setProyectos([])
    setUnidades([])
    onSelectionChange(next)
    if (!entrega) return
    startTransition(async () => {
      const data = await getInmobiliarias(sel.comuna, entrega)
      setInmobiliarias(data)
    })
  }

  function handleInmobiliaria(inmobiliaria: string) {
    const next = { ...EMPTY, comuna: sel.comuna, entrega: sel.entrega, inmobiliaria }
    setSel(next)
    setProyectos([])
    setUnidades([])
    onSelectionChange(next)
    if (!inmobiliaria) return
    startTransition(async () => {
      const data = await getProyectos(sel.comuna, sel.entrega, inmobiliaria)
      setProyectos(data)
    })
  }

  function handleProyecto(nemotecnico: string) {
    const proyecto = proyectos.find((p) => p.nemotecnico === nemotecnico) ?? null
    const next = { ...sel, proyecto, unidad: null }
    setSel(next)
    setUnidades([])
    onSelectionChange(next)
    if (!nemotecnico) return
    startTransition(async () => {
      const data = await getUnidades(nemotecnico)
      setUnidades(data)
    })
  }

  function handleUnidad(numeroStr: string) {
    const numero = parseInt(numeroStr, 10)
    const unidad = unidades.find((u) => u.numeroUnidad === numero) ?? null
    const next = { ...sel, unidad }
    setSel(next)
    onSelectionChange(next)
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Paso 1 — Comuna */}
      <SelectField
        label="Comuna"
        value={sel.comuna}
        options={comunas.map((c) => ({ value: c, label: c }))}
        placeholder="Selecciona comuna"
        disabled={isPending && comunas.length === 0}
        onChange={handleComuna}
      />

      {/* Paso 2 — Tipo de Entrega */}
      <SelectField
        label="Tipo de Entrega"
        value={sel.entrega}
        options={entregas.map((e) => ({ value: e, label: e }))}
        placeholder="Selecciona entrega"
        disabled={!sel.comuna || isPending}
        onChange={handleEntrega}
      />

      {/* Paso 3 — Inmobiliaria */}
      <SelectField
        label="Inmobiliaria"
        value={sel.inmobiliaria}
        options={inmobiliarias.map((i) => ({ value: i, label: i }))}
        placeholder="Selecciona inmobiliaria"
        disabled={!sel.entrega || isPending}
        onChange={handleInmobiliaria}
      />

      {/* Paso 4 — Proyecto */}
      <SelectField
        label="Proyecto"
        value={sel.proyecto?.nemotecnico ?? ''}
        options={proyectos.map((p) => ({ value: p.nemotecnico, label: p.nombreProyecto }))}
        placeholder="Selecciona proyecto"
        disabled={!sel.inmobiliaria || isPending}
        onChange={handleProyecto}
      />

      {/* Paso 5 — N° Unidad */}
      <SelectField
        label="N° Unidad"
        value={sel.unidad?.numeroUnidad?.toString() ?? ''}
        options={unidades.map((u) => ({
          value: u.numeroUnidad?.toString() ?? '',
          label: u.numeroUnidad
            ? `${u.numeroUnidad} — ${u.programa} P${u.pisoProducto ?? '?'}`
            : '',
        })).filter((o) => o.value)}
        placeholder="Selecciona unidad"
        disabled={!sel.proyecto || isPending}
        onChange={handleUnidad}
      />
    </div>
  )
}

// ── SelectField helper ─────────────────────────────────────

interface SelectFieldProps {
  label:       string
  value:       string
  options:     { value: string; label: string }[]
  placeholder: string
  disabled:    boolean
  onChange:    (value: string) => void
}

function SelectField({ label, value, options, placeholder, disabled, onChange }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm
                   focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                   disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
