'use client'
import { useEffect, useState } from 'react'
import { listarPerfilamientosAction, type PerfilamientoResumen } from '@/lib/perfilamiento/actions'
import { cn } from '@/lib/utils/cn'

const BADGE: Record<PerfilamientoResumen['resultado'], { label: string; cls: string }> = {
  apto:                 { label: 'Apto',               cls: 'bg-green-100 text-green-800' },
  apto_con_condiciones: { label: 'Apto c/ condiciones', cls: 'bg-amber-100 text-amber-800' },
  no_apto:              { label: 'No apto',             cls: 'bg-red-100 text-red-800' },
}

export default function TablaPerfilamientos() {
  const [rows, setRows]       = useState<PerfilamientoResumen[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listarPerfilamientosAction()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="py-8 text-center text-sm text-gray-500">Cargando perfilamientos…</p>
  }

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        Aún no hay perfilamientos registrados.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Fecha', 'Nombre', 'RUT', 'Resultado', 'Rango Cons.', 'Rango Opt.', 'Co-sol.', 'Cotización'].map(h => (
              <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map(r => {
            const badge = BADGE[r.resultado]
            return (
              <tr key={r.id} className="transition-colors hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{r.fechaDisplay}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{r.nombre || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.rut || '—'}</td>
                <td className="px-4 py-3">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', badge.cls)}>
                    {badge.label}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-blue-800">
                  {Math.round(r.rangoConservadorUF).toLocaleString('es-CL')} UF
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                  {Math.round(r.rangoOptimistaUF).toLocaleString('es-CL')} UF
                </td>
                <td className="px-4 py-3 text-center text-gray-500">
                  {r.tieneComplementario ? 'Sí' : 'No'}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {r.numeroCotizacion ? (
                    <a
                      href={`/api/cotizacion/pdf?numero=${encodeURIComponent(r.numeroCotizacion)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {r.numeroCotizacion}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
