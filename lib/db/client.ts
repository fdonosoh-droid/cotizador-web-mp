// ============================================================
// POSTGRES CLIENT — singleton lazy para la aplicación
// Driver: postgres (Porsager) — tagged template literals
// Conexión: DATABASE_URL en variables de entorno
// ============================================================
// La conexión se crea en el PRIMER uso (lazy), no al importar.
// Esto evita errores en entornos donde DATA_SOURCE=excel y
// DATABASE_URL no está definida.
// ============================================================

import postgres from 'postgres'

type SqlClient = ReturnType<typeof postgres>

// Almacén global para sobrevivir hot-reload en desarrollo
declare global {
  // eslint-disable-next-line no-var
  var _pgClient: SqlClient | undefined
}

let _client: SqlClient | null = null

/**
 * Retorna el cliente PostgreSQL (crea la conexión si es la primera vez).
 * Lanza error si DATABASE_URL no está definida.
 */
export function getDb(): SqlClient {
  if (_client) return _client

  // En desarrollo reutilizamos la instancia entre hot-reloads
  if (process.env.NODE_ENV !== 'production' && globalThis._pgClient) {
    _client = globalThis._pgClient
    return _client
  }

  const url = process.env.DATABASE_URL
  if (!url) throw new Error('[PgAdapter] DATABASE_URL no está definida — configura .env.local')

  _client = postgres(url, {
    max:             10,
    idle_timeout:    30,
    connect_timeout: 10,
  })

  if (process.env.NODE_ENV !== 'production') {
    globalThis._pgClient = _client
  }

  return _client
}
