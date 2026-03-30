// ============================================================
// PÁGINA HISTORIAL — /historial
// Lista las cotizaciones generadas (server-rendered)
// ============================================================

import Link from 'next/link'
import { Suspense } from 'react'
import TablaHistorial from '@/components/historial/TablaHistorial'

export const metadata = { title: 'Historial de Cotizaciones — Cotizador MP' }

export default function HistorialPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Historial de Cotizaciones</h1>
            <p className="mt-1 text-sm text-gray-500">
              Cotizaciones generadas — más recientes primero
            </p>
          </div>
          <Link
            href="/"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            ← Nueva Cotización
          </Link>
        </div>

        {/* Tabla */}
        <Suspense
          fallback={
            <div className="py-12 text-center text-sm text-gray-400">
              Cargando historial…
            </div>
          }
        >
          <TablaHistorial />
        </Suspense>
      </div>
    </main>
  )
}
