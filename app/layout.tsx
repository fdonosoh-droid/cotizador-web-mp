import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cotizador Mercado Primario',
  description: 'Cotizador web para proyectos inmobiliarios de mercado primario',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
