'use client'

import React, { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button }   from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn }       from '@/lib/utils/cn'
import { buscarUnidadesPorRango } from '@/lib/perfilamiento/actions'
import type { UnidadCotizable }  from '@/lib/data'
import type { RangoCapacidad }   from './PerfilamientoModal'

interface Props {
  open:      boolean
  rango:     RangoCapacidad | null
  ufDelDia:  number
  onClose:   () => void
  /** Callback con la unidad completa lista para cotizar */
  onSeleccionar: (unidad: UnidadCotizable) => void
}

export default function ModalUnidades({ open, rango, ufDelDia, onClose, onSeleccionar }: Props) {
  const [unidades, setUnidades]         = useState<UnidadCotizable[]>([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [seleccionada, setSeleccionada] = useState<UnidadCotizable | null>(null)

  // Filtros rápidos
  const [filtroProg,   setFiltroProg]   = useState('Todos')
  const [filtroComuna, setFiltroComuna] = useState('Todas')

  useEffect(() => {
    if (!open || !rango) return
    setLoading(true)
    setError(null)
    setSeleccionada(null)
    setFiltroProg('Todos')
    setFiltroComuna('Todas')
    buscarUnidadesPorRango(rango.minUF, rango.maxUF)
      .then(setUnidades)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [open, rango])

  const programas = ['Todos', ...Array.from(new Set(unidades.map(u => u.programa))).sort()]
  const comunas   = ['Todas', ...Array.from(new Set(unidades.map(u => u.comuna))).sort()]

  const filtradas = unidades.filter(u =>
    (filtroProg   === 'Todos' || u.programa === filtroProg) &&
    (filtroComuna === 'Todas' || u.comuna   === filtroComuna)
  )

  const precioVenta = (u: UnidadCotizable) =>
    Math.round(u.precioLista * (1 - u.descuento) * 100) / 100

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
            {/* Filtros */}
            <div className="flex flex-wrap gap-4 pb-3 border-b">
              <FilterChips label="Programa" options={programas} value={filtroProg} onChange={setFiltroProg} />
              <FilterChips label="Comuna"   options={comunas}   value={filtroComuna} onChange={setFiltroComuna} />
              <span className="ml-auto self-end text-xs text-gray-400">{filtradas.length} unidades</span>
            </div>

            {filtradas.length === 0 ? (
              <p className="text-sm text-gray-500 py-10 text-center">
                No hay unidades disponibles en este rango.
              </p>
            ) : (
              <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                {filtradas.map((u, i) => {
                  const sel  = seleccionada === u
                  const pv   = precioVenta(u)
                  const clp  = ufDelDia > 0 ? Math.round(pv * ufDelDia) : null
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
                          <p className="font-bold text-blue-800 text-sm">
                            {pv.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF
                          </p>
                          {u.descuento > 0 && (
                            <p className="text-xs text-gray-400 line-through">
                              {u.precioLista.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF
                            </p>
                          )}
                          {clp && (
                            <p className="text-xs text-gray-400">${clp.toLocaleString('es-CL')}</p>
                          )}
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

            <div className="flex justify-between pt-3 border-t">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button
                onClick={() => seleccionada && onSeleccionar(seleccionada)}
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

// ── Chips de filtro ──────────────────────────────────────────────
function FilterChips({ label, options, value, onChange }: {
  label:    string
  options:  string[]
  value:    string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map(o => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cn(
              'px-2 py-0.5 rounded-full text-xs border transition-colors',
              value === o
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            )}
          >
            {o}
          </button>
        ))}
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
