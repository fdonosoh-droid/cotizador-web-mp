'use client'
// ============================================================
// CASCADE SELECTOR — selección en 5 pasos + filtros de unidad
// Comuna → Entrega → Inmobiliaria → Proyecto → (filtros) → N°Unidad
// Filtros P2.2: tipo unidad, programa, piso, número, orientación, sup útil, sup total
// ============================================================

import { useEffect, useMemo, useState, useTransition } from 'react'
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

interface Filtros {
  tipoUnidad:      string
  programa:        string
  piso:            string
  numeroUnidad:    string
  orientacion:     string
  supUtilMin:      string
  supUtilMax:      string
  supTotalMin:     string
  supTotalMax:     string
}

const FILTROS_EMPTY: Filtros = {
  tipoUnidad: '', programa: '', piso: '', numeroUnidad: '',
  orientacion: '', supUtilMin: '', supUtilMax: '', supTotalMin: '', supTotalMax: '',
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

  // Selections & filters
  const [sel,     setSel]     = useState<CascadeSelection>(EMPTY)
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_EMPTY)
  const [showFiltros, setShowFiltros] = useState(false)

  // ── Load comunas on mount ──────────────────────────────────
  useEffect(() => {
    startTransition(async () => {
      const data = await getComunas()
      setComunas(data)
    })
  }, [])

  // ── Distinct values for filter dropdowns ──────────────────
  const opcionesTipoUnidad  = useMemo(() => distinct(unidades.map(u => u.tipoUnidad)), [unidades])
  const opcionesPrograma    = useMemo(() => distinct(unidades.map(u => u.programa).filter(Boolean)), [unidades])
  const opcionesPiso        = useMemo(() => distinct(unidades.map(u => String(u.pisoProducto ?? '')).filter(Boolean)), [unidades])
  const opcionesOrientacion = useMemo(() => distinct(unidades.map(u => u.orientacion ?? '').filter(Boolean)), [unidades])

  // ── Filtered unidades (client-side) ───────────────────────
  const unidadesFiltradas = useMemo(() => {
    return unidades.filter(u => {
      if (filtros.tipoUnidad && u.tipoUnidad !== filtros.tipoUnidad) return false
      if (filtros.programa   && u.programa   !== filtros.programa)   return false
      if (filtros.piso       && String(u.pisoProducto ?? '') !== filtros.piso) return false
      if (filtros.orientacion && u.orientacion !== filtros.orientacion) return false
      if (filtros.numeroUnidad) {
        const n = parseInt(filtros.numeroUnidad, 10)
        if (!isNaN(n) && u.numeroUnidad !== n) return false
      }
      if (filtros.supUtilMin) {
        const min = parseFloat(filtros.supUtilMin)
        if (!isNaN(min) && (u.superficieUtil ?? 0) < min) return false
      }
      if (filtros.supUtilMax) {
        const max = parseFloat(filtros.supUtilMax)
        if (!isNaN(max) && (u.superficieUtil ?? 0) > max) return false
      }
      if (filtros.supTotalMin) {
        const min = parseFloat(filtros.supTotalMin)
        if (!isNaN(min) && (u.superficieTotal ?? 0) < min) return false
      }
      if (filtros.supTotalMax) {
        const max = parseFloat(filtros.supTotalMax)
        if (!isNaN(max) && (u.superficieTotal ?? 0) > max) return false
      }
      return true
    })
  }, [unidades, filtros])

  const filtrosActivos = Object.values(filtros).some(v => v !== '')

  // ── Handlers ──────────────────────────────────────────────

  function handleComuna(comuna: string) {
    const next = { ...EMPTY, comuna }
    setSel(next); setFiltros(FILTROS_EMPTY); setShowFiltros(false)
    setEntregas([]); setInmobiliarias([]); setProyectos([]); setUnidades([])
    onSelectionChange(next)
    if (!comuna) return
    startTransition(async () => {
      const data = await getEntregas(comuna)
      setEntregas(data)
    })
  }

  function handleEntrega(entrega: string) {
    const next = { ...EMPTY, comuna: sel.comuna, entrega }
    setSel(next); setFiltros(FILTROS_EMPTY); setShowFiltros(false)
    setInmobiliarias([]); setProyectos([]); setUnidades([])
    onSelectionChange(next)
    if (!entrega) return
    startTransition(async () => {
      const data = await getInmobiliarias(sel.comuna, entrega)
      setInmobiliarias(data)
    })
  }

  function handleInmobiliaria(inmobiliaria: string) {
    const next = { ...EMPTY, comuna: sel.comuna, entrega: sel.entrega, inmobiliaria }
    setSel(next); setFiltros(FILTROS_EMPTY); setShowFiltros(false)
    setProyectos([]); setUnidades([])
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
    setSel(next); setFiltros(FILTROS_EMPTY); setShowFiltros(false)
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
    const unidad = unidadesFiltradas.find((u) => u.numeroUnidad === numero) ?? null
    const next = { ...sel, unidad }
    setSel(next)
    onSelectionChange(next)
  }

  function setFiltro(key: keyof Filtros, value: string) {
    setFiltros(prev => ({ ...prev, [key]: value }))
    // Limpiar selección de unidad si los filtros cambian
    const next = { ...sel, unidad: null }
    setSel(next)
    onSelectionChange(next)
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Pasos 1–4 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Comuna"
          value={sel.comuna}
          options={comunas.map((c) => ({ value: c, label: c }))}
          placeholder="Selecciona comuna"
          disabled={isPending && comunas.length === 0}
          onChange={handleComuna}
        />
        <SelectField
          label="Tipo de Entrega"
          value={sel.entrega}
          options={entregas.map((e) => ({ value: e, label: e }))}
          placeholder="Selecciona entrega"
          disabled={!sel.comuna || isPending}
          onChange={handleEntrega}
        />
        <SelectField
          label="Inmobiliaria"
          value={sel.inmobiliaria}
          options={inmobiliarias.map((i) => ({ value: i, label: i }))}
          placeholder="Selecciona inmobiliaria"
          disabled={!sel.entrega || isPending}
          onChange={handleInmobiliaria}
        />
        <SelectField
          label="Proyecto"
          value={sel.proyecto?.nemotecnico ?? ''}
          options={proyectos.map((p) => ({ value: p.nemotecnico, label: p.nombreProyecto }))}
          placeholder="Selecciona proyecto"
          disabled={!sel.inmobiliaria || isPending}
          onChange={handleProyecto}
        />
      </div>

      {/* Filtros de unidad — visibles solo cuando hay unidades cargadas */}
      {unidades.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <button
            type="button"
            onClick={() => setShowFiltros(v => !v)}
            className="flex w-full items-center justify-between text-sm font-medium text-gray-700 hover:text-blue-700"
          >
            <span>
              Filtrar unidades
              {filtrosActivos && (
                <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  {unidadesFiltradas.length} / {unidades.length}
                </span>
              )}
              {!filtrosActivos && (
                <span className="ml-2 text-xs text-gray-400">{unidades.length} disponibles</span>
              )}
            </span>
            <span className="text-gray-400">{showFiltros ? '▲' : '▼'}</span>
          </button>

          {showFiltros && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {/* Tipo Unidad */}
              <SelectField
                label="Tipo Unidad"
                value={filtros.tipoUnidad}
                options={opcionesTipoUnidad.map(v => ({ value: v, label: v }))}
                placeholder="Todos"
                disabled={false}
                onChange={v => setFiltro('tipoUnidad', v)}
              />
              {/* Programa / Tipología */}
              <SelectField
                label="Programa"
                value={filtros.programa}
                options={opcionesPrograma.map(v => ({ value: v, label: v }))}
                placeholder="Todos"
                disabled={false}
                onChange={v => setFiltro('programa', v)}
              />
              {/* Piso */}
              <SelectField
                label="Piso"
                value={filtros.piso}
                options={opcionesPiso.map(v => ({ value: v, label: `Piso ${v}` }))}
                placeholder="Todos"
                disabled={false}
                onChange={v => setFiltro('piso', v)}
              />
              {/* Orientación */}
              <SelectField
                label="Orientación"
                value={filtros.orientacion}
                options={opcionesOrientacion.map(v => ({ value: v, label: v }))}
                placeholder="Todas"
                disabled={false}
                onChange={v => setFiltro('orientacion', v)}
              />
              {/* N° Unidad */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">N° Unidad</span>
                <input
                  type="number"
                  min={1}
                  value={filtros.numeroUnidad}
                  onChange={e => setFiltro('numeroUnidad', e.target.value)}
                  placeholder="Ej: 304"
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              {/* Sup. Útil */}
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">Sup. Útil (m²)</span>
                <div className="flex gap-1">
                  <input
                    type="number" min={0} placeholder="Min"
                    value={filtros.supUtilMin}
                    onChange={e => setFiltro('supUtilMin', e.target.value)}
                    className="w-1/2 rounded-md border border-gray-300 bg-white px-2 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number" min={0} placeholder="Max"
                    value={filtros.supUtilMax}
                    onChange={e => setFiltro('supUtilMax', e.target.value)}
                    className="w-1/2 rounded-md border border-gray-300 bg-white px-2 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              {/* Sup. Total */}
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">Sup. Total (m²)</span>
                <div className="flex gap-1">
                  <input
                    type="number" min={0} placeholder="Min"
                    value={filtros.supTotalMin}
                    onChange={e => setFiltro('supTotalMin', e.target.value)}
                    className="w-1/2 rounded-md border border-gray-300 bg-white px-2 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number" min={0} placeholder="Max"
                    value={filtros.supTotalMax}
                    onChange={e => setFiltro('supTotalMax', e.target.value)}
                    className="w-1/2 rounded-md border border-gray-300 bg-white px-2 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              {/* Limpiar filtros */}
              {filtrosActivos && (
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => { setFiltros(FILTROS_EMPTY); setSel(prev => ({ ...prev, unidad: null })); onSelectionChange({ ...sel, unidad: null }) }}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-white"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Paso 5 — N° Unidad (sobre unidades filtradas) */}
      {sel.proyecto && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label={`N° Unidad${filtrosActivos ? ` (${unidadesFiltradas.length} resultados)` : ''}`}
            value={sel.unidad?.numeroUnidad?.toString() ?? ''}
            options={unidadesFiltradas
              .filter(u => u.numeroUnidad !== null)
              .map(u => ({
                value: u.numeroUnidad!.toString(),
                label: `${u.numeroUnidad} — ${u.programa} · P${u.pisoProducto ?? '?'}${u.superficieTotal ? ` · ${Number(u.superficieTotal).toFixed(2)}m²` : ''}`,
              }))}
            placeholder={unidadesFiltradas.length === 0 ? 'Sin resultados' : 'Selecciona unidad'}
            disabled={!sel.proyecto || isPending || unidadesFiltradas.length === 0}
            onChange={handleUnidad}
          />
        </div>
      )}
    </div>
  )
}

// ── helpers ───────────────────────────────────────────────────

function distinct(arr: string[]): string[] {
  return [...new Set(arr)].filter(Boolean).sort()
}

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
