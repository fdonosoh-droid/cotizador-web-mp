'use client'
import { useEffect, useState } from 'react'
import { listarCotizacionesAction } from '@/app/actions/stock'
import type { CotizacionResumen } from '@/lib/services/historial'

export default function TablaHistorial() {
  const [rows, setRows]       = useState<CotizacionResumen[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listarCotizacionesAction().then((data) => {
      setRows(data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <p className="text-sm text-gray-500 py-8 text-center">Cargando historial…</p>
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          Aún no hay cotizaciones registradas.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['N° Cotización','Fecha','Proyecto','Comuna','Unidad','Tipo','Broker','Valor Venta','Crédito Hip.','Pie %'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((r) => (
                <tr key={r.numero} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">
                    <a href={`/api/cotizacion/pdf?numero=${encodeURIComponent(r.numero)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{r.numero}</a>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.fecha}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.proyecto}</td>
                  <td className="px-4 py-3 text-gray-600">{r.comuna}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{r.numeroUnidad ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.tipoUnidad}</td>
                  <td className="px-4 py-3 text-gray-600">{r.broker}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{r.valorVentaUF.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UF</td>
                  <td className="px-4 py-3 text-right text-gray-700">{r.creditoHipUF.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UF</td>
                  <td className="px-4 py-3 text-right text-gray-700">{(r.piePct * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}