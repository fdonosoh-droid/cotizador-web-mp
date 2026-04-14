'use client'
// Panel idéntico al del CascadeSelector — carga bodegas/estacionamientos
// del proyecto seleccionado y permite agregar/quitar unidades adicionales.
// Se usa cuando la unidad principal viene del flujo de perfilamiento.

import { useEffect, useState } from 'react'
import { getAdicionales } from '@/lib/perfilamiento/actions'
import type { UnidadCotizable } from '@/lib/data'

interface Props {
  nemotecnico:          string
  unidadesAdicionales:  UnidadCotizable[]
  onChange:             (adicionales: UnidadCotizable[]) => void
}

export default function UnidadesAdicionalesPanel({ nemotecnico, unidadesAdicionales, onChange }: Props) {
  const [disponibles,    setDisponibles]    = useState<UnidadCotizable[]>([])
  const [loading,        setLoading]        = useState(false)
  const [showAgregar,    setShowAgregar]    = useState(false)
  const [selecto,        setSelecto]        = useState('')

  useEffect(() => {
    setLoading(true)
    setShowAgregar(false)
    setSelecto('')
    getAdicionales(nemotecnico)
      .then(setDisponibles)
      .catch(() => setDisponibles([]))
      .finally(() => setLoading(false))
  }, [nemotecnico])

  const yaAgregadas = new Set(unidadesAdicionales.map(u => u.numeroUnidad))
  const paraAgregar = disponibles.filter(
    u => u.numeroUnidad !== null && !yaAgregadas.has(u.numeroUnidad)
  )

  function handleAgregar() {
    const numero = parseInt(selecto, 10)
    const unidad = paraAgregar.find(u => u.numeroUnidad === numero)
    if (!unidad) return
    onChange([...unidadesAdicionales, unidad])
    setSelecto('')
  }

  function handleQuitar(numeroUnidad: number | null) {
    onChange(unidadesAdicionales.filter(u => u.numeroUnidad !== numeroUnidad))
  }

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-blue-800">
          Unidades adicionales
          {unidadesAdicionales.length > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-blue-200 px-2 py-0.5 text-xs font-medium text-blue-900">
              {unidadesAdicionales.length} agregada{unidadesAdicionales.length > 1 ? 's' : ''}
            </span>
          )}
        </span>

        {loading && <span className="text-xs text-gray-400 animate-pulse">Cargando...</span>}

        {!loading && paraAgregar.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAgregar(v => !v)}
            className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            {showAgregar ? '✕ Cancelar' : '+ Agregar Unidades'}
          </button>
        )}

        {!loading && paraAgregar.length === 0 && unidadesAdicionales.length === 0 && (
          <span className="text-xs text-gray-400">No hay estacionamientos/bodegas disponibles en este proyecto</span>
        )}
      </div>

      {/* Selector */}
      {showAgregar && paraAgregar.length > 0 && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-blue-700">
              Selecciona estacionamiento o bodega
            </label>
            <select
              value={selecto}
              onChange={e => setSelecto(e.target.value)}
              className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— Selecciona unidad —</option>
              {paraAgregar.map(u => (
                <option key={u.numeroUnidad} value={u.numeroUnidad!.toString()}>
                  {u.tipoUnidad} {u.numeroUnidad} — {u.programa}
                  {u.superficieTotal ? ` · ${Number(u.superficieTotal).toFixed(2)}m²` : ''}
                  {` · ${u.precioLista.toLocaleString('es-CL', { minimumFractionDigits: 2 })} UF`}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAgregar}
            disabled={!selecto}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Agregar
          </button>
        </div>
      )}

      {/* Lista agregadas */}
      {unidadesAdicionales.length > 0 && (
        <ul className="space-y-1">
          {unidadesAdicionales.map(u => (
            <li
              key={u.numeroUnidad}
              className="flex items-center justify-between rounded-md bg-white border border-blue-200 px-3 py-2 text-sm"
            >
              <span className="text-gray-800">
                <span className="font-medium">{u.tipoUnidad} {u.numeroUnidad}</span>
                {' · '}{u.programa}
                {u.superficieTotal ? ` · ${Number(u.superficieTotal).toFixed(2)} m²` : ''}
                {' · '}
                <span className="font-semibold text-blue-700">
                  {u.precioLista.toLocaleString('es-CL', { minimumFractionDigits: 2 })} UF
                </span>
              </span>
              <button
                type="button"
                onClick={() => handleQuitar(u.numeroUnidad)}
                className="ml-3 text-xs text-red-500 hover:text-red-700 hover:underline"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
