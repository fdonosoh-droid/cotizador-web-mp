import Link from 'next/link'
import TablaPerfilamientos from '@/components/perfilamiento/TablaPerfilamientos'

export const metadata = { title: 'Historial de Perfilamientos — Cotizador MP' }

export default function PerfilamientosPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Historial de Perfilamientos</h1>
            <p className="mt-1 text-sm text-gray-500">
              Evaluaciones financieras realizadas — más recientes primero
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/perfilamiento/export"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              ⬇ Descargar Excel
            </a>
            <Link
              href="/"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              ← Nueva Cotización
            </Link>
          </div>
        </div>

        <TablaPerfilamientos />
      </div>
    </main>
  )
}
