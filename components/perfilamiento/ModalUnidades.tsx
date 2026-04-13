'use client'

import React, { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button }   from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { cn }       from '@/lib/utils/cn'
import { buscarUnidadesPorRango, getAdicionales } from '@/lib/perfilamiento/actions'
import type { UnidadCotizable }  from '@/lib/data'
import type { RangoCapacidad }   from './PerfilamientoModal'

interface Props {
  open:      boolean
  rango:     RangoCapacidad | null
  ufDelDia:  number
  onClose:   () => void
  /** Callback con la unidad principal + adicionales seleccionadas */
  onSeleccionar: (unidad: UnidadCotizable, adicionales: UnidadCotizable[]) => void
}

export default function ModalUnidades({ open, rango, ufDelDia, onClose, onSeleccionar }: Props) {
  const [unidades, setUnidades]             = useState<UnidadCotizable[]>([])
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [seleccionada, setSeleccionada]     = useState<UnidadCotizable | null>(null)

  // Multi-select filtros
  const [progSel,   setProgSel]   = useState<Set<string>>(new Set())
  const [comunaSel, setComunaSel] = useState<Set<string>>(new Set())

  // Adicionales
  const [adicionales,    setAdicionales]    = useState<UnidadCotizable[]>([])
  const [loadingAdic,    setLoadingAdic]    = useState(false)
  const [adicSelecSet,   setAdicSelecSet]   = useState<Set<number>>(new Set()) // índices

  useEffect(() => {
    if (!open || !rango) return
    setLoading(true)
    setError(null)
    setSeleccionada(null)
    setProgSel(new Set())
    setComunaSel(new Set())
    setAdicionales([])
    setAdicSelecSet(new Set())
    buscarUnidadesPorRango(rango.minUF, rango.maxUF)
      .then(setUnidades)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [open, rango])

  // Cargar adicionales cuando se selecciona una unidad
  useEffect(() => {
    if (!seleccionada) { setAdicionales([]); setAdicSelecSet(new Set()); return }
    setLoadingAdic(true)
    getAdicionales(seleccionada.nemotecnico)
      .then(setAdicionales)
      .catch(() => setAdicionales([]))
      .finally(() => setLoadingAdic(false))
    setAdicSelecSet(new Set())
  }, [seleccionada])

  // Toggle multi-select helpers
  const toggleSet = (set: Set<string>, val: string): Set<string> => {
    const s = new Set(set)
    s.has(val) ? s.delete(val) : s.add(val)
    return s
  }
  const toggleIdx = (set: Set<number>, idx: number): Set<number> => {
    const s = new Set(set)
    s.has(idx) ? s.delete(idx) : s.add(idx)
    return s
  }

  const programas = Array.from(new Set(unidades.map(u => u.programa))).sort()
  const comunas   = Array.from(new Set(unidades.map(u => u.comuna))).sort()

  const filtradas = unidades.filter(u =>
    (progSel.size   === 0 || progSel.has(u.programa)) &&
    (comunaSel.size === 0 || comunaSel.has(u.comuna))
  )

  const adicSeleccionadas = adicionales.filter((_, i) => adicSelecSet.has(i))

  const handleConfirmar = () => {
    if (seleccionada) onSeleccionar(seleccionada, adicSeleccionadas)
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-blue-800">Unidades disponibles en tu rango</DialogTitle>
          <DialogDescription>
            {rango && (
              <span>
                Capacidad: <strong>{Math.round(rango.minUF).toLocaleString('es-CL')} UF</strong>
                {' – '}
                <strong>{Math.round(rango.maxUF).toLocaleString('es-CL')} UF</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="space-y-2 py-8">
            <Progress value={undefined} className="animate-pulse" />
            <p className="text-sm text-center text-gray-500">Buscando unidades...</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
        )}

        {!loading && !error && (
          <>
            {/* ── Filtros multi-select ── */}
            <div className="space-y-3 pb-3 border-b">
              <MultiChips
                label="Programa"
                options={programas}
                selected={progSel}
                onToggle={v => setProgSel(s => toggleSet(s, v))}
                onClear={() => setProgSel(new Set())}
              />
              <MultiChips
                label="Comuna"
                options={comunas}
                selected={comunaSel}
                onToggle={v => setComunaSel(s => toggleSet(s, v))}
                onClear={() => setComunaSel(new Set())}
              />
              <p className="text-xs text-gray-400 text-right">{filtradas.length} unidades</p>
            </div>

            {/* ── Lista de unidades ── */}
            {filtradas.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                No hay unidades disponibles en este rango.
              </p>
            ) : (
              <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                {filtradas.map((u, i) => {
                  const sel = seleccionada === u
                  const clp = ufDelDia > 0 ? Math.round(u.precioLista * ufDelDia) : null
                  return (
                    <button
                      key={i}
                      onClick={() => setSeleccionada(u)}
                      className={cn(
                        'w-full text-left rounded-xl border px-4 py-3 transition-all',
                        sel
                          ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-300'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{u.nombreProyecto}</p>
                          <p className="text-xs text-gray-500">{u.comuna} · {u.tipoEntrega}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400 mb-0.5">Precio lista</p>
                          <p className="font-bold text-blue-800 text-sm">
                            {u.precioLista.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF
                          </p>
                          {clp && <p className="text-xs text-gray-400">${clp.toLocaleString('es-CL')}</p>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Tag>{u.programa}</Tag>
                        {u.superficieUtil  && <Tag>{u.superficieUtil} m²</Tag>}
                        {u.numeroUnidad    && <Tag>Unidad #{u.numeroUnidad}</Tag>}
                        {u.bonoPie > 0     && <Tag color="green">Bono pie {(u.bonoPie * 100).toFixed(0)}%</Tag>}
                        {u.piePeriodoConstruccion > 0 && <Tag color="amber">Pie en construcción</Tag>}
                        {u.pieCreditoDirecto > 0      && <Tag color="amber">Crédito directo</Tag>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── Unidades adicionales (solo si hay una unidad seleccionada) ── */}
            {seleccionada && (
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Unidades adicionales</p>
                  {adicSeleccionadas.length > 0 && (
                    <span className="text-xs text-blue-700 font-medium">
                      {adicSeleccionadas.length} seleccionada{adicSeleccionadas.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {loadingAdic && (
                  <p className="text-xs text-gray-400 animate-pulse">Cargando bodegas y estacionamientos...</p>
                )}

                {!loadingAdic && adicionales.length === 0 && (
                  <p className="text-xs text-gray-400">No hay bodegas ni estacionamientos disponibles para este proyecto.</p>
                )}

                {!loadingAdic && adicionales.length > 0 && (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {adicionales.map((a, i) => {
                      const checked = adicSelecSet.has(i)
                      return (
                        <label
                          key={i}
                          className={cn(
                            'flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors',
                            checked
                              ? 'border-blue-400 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-blue-200'
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => setAdicSelecSet(s => toggleIdx(s, i))}
                          />
                          <div className="flex-1 flex justify-between items-center">
                            <div>
                              <span className="text-sm font-medium text-gray-800">{a.tipoUnidad}</span>
                              {a.numeroUnidad && (
                                <span className="text-xs text-gray-500 ml-1">#{a.numeroUnidad}</span>
                              )}
                              {a.programa && (
                                <span className="text-xs text-gray-400 ml-2">{a.programa}</span>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-blue-800">
                              {a.precioLista.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Acciones ── */}
            <div className="flex justify-between pt-3 border-t">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button
                onClick={handleConfirmar}
                disabled={!seleccionada}
                className="bg-blue-700 hover:bg-blue-800 disabled:opacity-40"
              >
                Cotizar esta unidad →
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Multi-select chips ──────────────────────────────────────────
function MultiChips({ label, options, selected, onToggle, onClear }: {
  label:    string
  options:  string[]
  selected: Set<string>
  onToggle: (v: string) => void
  onClear:  () => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs text-gray-500">{label}</p>
        {selected.size > 0 && (
          <button onClick={onClear} className="text-xs text-blue-600 hover:underline">
            Limpiar
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map(o => {
          const active = selected.has(o)
          return (
            <button
              key={o}
              onClick={() => onToggle(o)}
              className={cn(
                'px-2 py-0.5 rounded-full text-xs border transition-colors',
                active
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
              )}
            >
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Tag ──────────────────────────────────────────────────────────
function Tag({ children, color = 'gray' }: { children: React.ReactNode; color?: 'gray' | 'green' | 'amber' }) {
  return (
    <span className={cn(
      'text-xs px-2 py-0.5 rounded-full',
      color === 'gray'  && 'bg-gray-100 text-gray-600',
      color === 'green' && 'bg-green-100 text-green-700',
      color === 'amber' && 'bg-amber-100 text-amber-700',
    )}>
      {children}
    </span>
  )
}
