// ============================================================
// TABLA HISTORIAL — Server Component
// Muestra las últimas cotizaciones generadas (max 200)
// ============================================================

import { listarCotizacionesAction } from '@/app/actions/stock'

export default async function TablaHistorial() {
  const rows = await listarCotizacionesAction()

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">
        Aún no hay cotizaciones registradas.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['N° Cotización', 'Fecha', 'Proyecto', 'Comuna', 'Unidad', 'Tipo', 'Broker', 'Valor Venta', 'Crédito Hip.', 'Pie %'].map(
              (h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((r) => (
            <tr key={r.numero} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-blue-700">{r.numero}</td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.fecha}</td>
              <td className="px-4 py-3 font-medium text-gray-900">{r.proyecto}</td>
              <td className="px-4 py-3 text-gray-600">{r.comuna}</td>
              <td className="px-4 py-3 text-center text-gray-600">
                {r.numeroUnidad ?? '—'}
              </td>
              <td className="px-4 py-3 text-gray-600">{r.tipoUnidad}</td>
              <td className="px-4 py-3 text-gray-600">{r.broker}</td>
              <td className="px-4 py-3 text-right font-medium text-gray-800">
                {r.valorVentaUF.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UF
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                {r.creditoHipUF.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UF
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                {(r.piePct * 100).toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
