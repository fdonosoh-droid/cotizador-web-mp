// ============================================================
// SERVICIO HISTORIAL — persiste cotizaciones generadas
// Dev (DATA_SOURCE=excel): archivo .cotizaciones-historial.json
// Prod (DATA_SOURCE=postgres): tablas broker + cotizacion + cotizacion_escenario
// ============================================================
import fs   from 'fs'
import path from 'path'
import type { BrokerData }            from '@/components/broker/BrokerForm'
import type { UnidadCotizable }       from '@/lib/data'
import type { ResultadoCotizacion }   from '@/lib/calculators/cotizador'

// En Vercel (producción) process.cwd() apunta a /var/task que es
// read-only. Usamos /tmp que sí permite escritura. En desarrollo
// seguimos usando la raíz del proyecto para mantener el archivo visible.
const HIST_FILE =
    process.env.NODE_ENV === 'production'
    ? '/tmp/.cotizaciones-historial.json'
      : path.join(process.cwd(), '.cotizaciones-historial.json')

// ── Tipos públicos ──────────────────────────────────────────
export interface GuardarCotizacionInput {
    numero:              string          // 'COT-2026-0001'
  fecha:               string          // fecha legible para display
  broker:              BrokerData
    unidad:              UnidadCotizable
    unidadesAdicionales?: UnidadCotizable[]
    resultado:           ResultadoCotizacion
    piePct:              number
    plazoAnios:          number
    tasasCAE:            [number, number, number]
    plusvaliaAnual:      number          // decimal (ej: 0.02)
}

export interface CotizacionResumen {
    numero:       string
    fecha:        string
    proyecto:     string
    comuna:       string
    numeroUnidad: number | null
    tipoUnidad:   string
    broker:       string
    corredor:     string
    valorVentaUF: number
    creditoHipUF: number
    piePct:       number
}

// ── Punto de entrada ────────────────────────────────────────
export async function guardarCotizacion(input: GuardarCotizacionInput): Promise<void> {
    if ((process.env.DATA_SOURCE ?? 'excel') === 'postgres') {
          await _guardarPG(input)
    } else {
          _guardarJSON(input)
    }
}

export async function listarCotizaciones(): Promise<CotizacionResumen[]> {
    if ((process.env.DATA_SOURCE ?? 'excel') === 'postgres') {
          return _listarPG()
    }
    return _listarJSON()
}

/** Recupera payload completo para regenerar PDF (solo modo JSON/dev) */
export async function getCotizacionPayload(numero: string): Promise<HistorialEntry['pdfPayload'] & { fecha: string } | null> {
    const entries = _leerJSON()
    const entry   = entries.find((e) => e.numero === numero)
    if (!entry?.pdfPayload) return null
    return { ...entry.pdfPayload, fecha: entry.fechaDisplay }
}

/** Devuelve todas las entradas del historial con datos completos (para exportar Excel) */
export async function listarCotizacionesCompletas(): Promise<HistorialEntry[]> {
    return _leerJSON()
}

// ── Implementación DEV — archivo JSON ───────────────────────
interface HistorialEntry {
    numero:       string
    fechaISO:     string        // ISO 8601 para ordenar
  fechaDisplay: string
    proyecto:     string
    comuna:       string
    numeroUnidad: number | null
    tipoUnidad:   string
    broker:       string
    corredor:     string
    valorVentaUF: number
    creditoHipUF: number
    piePct:       number
    // Payload completo para regenerar PDF (solo en modo JSON/dev)
  pdfPayload?: {
      broker:               BrokerData
      unidad:               UnidadCotizable
      unidadesAdicionales?: UnidadCotizable[]
      resultado:            ResultadoCotizacion
      plusvaliaAnual:       number
  }
}

function _leerJSON(): HistorialEntry[] {
    try {
          return JSON.parse(fs.readFileSync(HIST_FILE, 'utf8')) as HistorialEntry[]
    } catch {
          return []
    }
}

function _guardarJSON(input: GuardarCotizacionInput): void {
    const entries = _leerJSON()

  // Evitar duplicados por número de cotización
  if (entries.some((e) => e.numero === input.numero)) return

  const entry: HistorialEntry = {
        numero:       input.numero,
        fechaISO:     new Date().toISOString(),
        fechaDisplay: input.fecha,
        proyecto:     input.unidad.nombreProyecto,
        comuna:       input.unidad.comuna,
        numeroUnidad: input.unidad.numeroUnidad,
        tipoUnidad:   input.unidad.tipoUnidad,
        broker:       input.broker.nombre,
        corredor:     input.broker.empresa ?? '',
        valorVentaUF: input.resultado.valorVentaUF,
        creditoHipUF: input.resultado.creditoHipFinalUF,
        piePct:       input.piePct,
        pdfPayload: {
                broker:               input.broker,
                unidad:               input.unidad,
                unidadesAdicionales:  input.unidadesAdicionales,
                resultado:            input.resultado,
                plusvaliaAnual:       input.plusvaliaAnual,
        },
  }

  entries.unshift(entry)   // más recientes primero
  fs.writeFileSync(HIST_FILE, JSON.stringify(entries, null, 2), 'utf8')

  // Actualizar xlsx en disco inmediatamente después de guardar en JSON
  _escribirExcel(entries)
}

function _listarJSON(): CotizacionResumen[] {
    return _leerJSON().map((e) => ({
          numero:       e.numero,
          fecha:        e.fechaDisplay,
          proyecto:     e.proyecto,
          comuna:       e.comuna,
          numeroUnidad: e.numeroUnidad,
          tipoUnidad:   e.tipoUnidad,
          broker:       e.broker,
          corredor:     e.corredor ?? '',
          valorVentaUF: e.valorVentaUF,
          creditoHipUF: e.creditoHipUF,
          piePct:       e.piePct,
    }))
}

// ── Ruta del xlsx en disco ───────────────────────────────────
const XLSX_PATH =
    process.env.NODE_ENV === 'production'
    ? '/tmp/Historial_cotizaciones.xlsx'
    : path.join(process.cwd(), 'Historial_cotizaciones.xlsx')

/** Escribe el historial completo al xlsx en disco (síncrono, require evita problemas con dynamic import) */
function _escribirExcel(entries: HistorialEntry[]): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx') as typeof import('xlsx')

    const filas = entries.map((e) => {
      const d   = new Date(e.fechaISO)
      const dia = String(d.getDate()).padStart(2, '0')
      const mes = String(d.getMonth() + 1).padStart(2, '0')
      const ani = d.getFullYear()
      return {
        'N° Cotización':   e.numero,
        'Fecha':           `${dia}-${mes}-${ani}`,
        'Proyecto':        e.proyecto,
        'Comuna':          e.comuna,
        'N° Unidad':       e.numeroUnidad ?? '',
        'Tipo Unidad':     e.tipoUnidad,
        'Broker/Cliente':  e.broker,
        'Valor Venta UF':  Math.round(e.valorVentaUF * 100) / 100,
        'Crédito Hip. UF': Math.round(e.creditoHipUF * 100) / 100,
        'Pie %':           Number((e.piePct * 100).toFixed(0)),
        'Corredor':        e.corredor ?? '',
      }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(filas)
    ws['!cols'] = [
      { wch: 18 }, { wch: 14 }, { wch: 30 }, { wch: 16 },
      { wch: 10 }, { wch: 14 }, { wch: 25 }, { wch: 15 },
      { wch: 15 }, { wch: 7  }, { wch: 25 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Historial')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    fs.writeFileSync(XLSX_PATH, buf)
    console.log('[historial-xlsx] Actualizado:', XLSX_PATH, `(${entries.length} registros)`)
  } catch (err) {
    console.error('[historial-xlsx] Error al escribir xlsx:', err)
  }
}

/**
 * Guarda la cotización en el JSON y sobreescribe el xlsx en disco
 * con el historial completo actualizado. Para usar desde Imprimir y Descargar PDF.
 */
export async function guardarYActualizarExcel(input: GuardarCotizacionInput): Promise<void> {
    await guardarCotizacion(input)

    const todas = _leerJSON()
    const XLSX  = await import('xlsx')

    const filas = todas.map((e) => {
          const d   = new Date(e.fechaISO)
          const dia = String(d.getDate()).padStart(2, '0')
          const mes = String(d.getMonth() + 1).padStart(2, '0')
          const ani = d.getFullYear()
          const fechaDDMMYYYY = `${dia}-${mes}-${ani}`
          return {
          'N° Cotización':   e.numero,
          'Fecha':           fechaDDMMYYYY,
          'Proyecto':        e.proyecto,
          'Comuna':          e.comuna,
          'N° Unidad':       e.numeroUnidad ?? '',
          'Tipo Unidad':     e.tipoUnidad,
          'Broker/Cliente':  e.broker,
          'Valor Venta UF':  Math.round(e.valorVentaUF * 100) / 100,
          'Crédito Hip. UF': Math.round(e.creditoHipUF * 100) / 100,
          'Pie %':           Number((e.piePct * 100).toFixed(0)),
          'Corredor':        e.corredor ?? '',
          }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(filas)
    ws['!cols'] = [
          { wch: 18 }, { wch: 22 }, { wch: 30 }, { wch: 16 },
          { wch: 10 }, { wch: 14 }, { wch: 25 }, { wch: 15 },
          { wch: 15 }, { wch: 7  }, { wch: 25 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Historial')

    // XLSX.writeFile no funciona con dynamic import; usar write() + fs
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    fs.writeFileSync(XLSX_PATH, buf)
    console.log('[historial-xlsx] Archivo actualizado:', XLSX_PATH)
}

// ── Implementación PROD — PostgreSQL ────────────────────────
async function _guardarPG(input: GuardarCotizacionInput): Promise<void> {
    // Importación dinámica para no contaminar bundle cliente
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getDb } = require('@/lib/db/client') as typeof import('@/lib/db/client')
    const sql = getDb()

  // 1. Upsert broker por RUT
  const brokerRows = await sql<{ id_broker: number }[]>`
      INSERT INTO broker (nombre, rut, email, telefono, empresa)
          VALUES (
                ${input.broker.nombre},
                      ${input.broker.rut},
                            ${input.broker.email},
                                  ${input.broker.telefono ?? null},
                                        ${input.broker.empresa ?? null}
                                            )
                                                ON CONFLICT (rut) DO UPDATE
                                                      SET nombre   = EXCLUDED.nombre,
                                                                email    = EXCLUDED.email,
                                                                          telefono = EXCLUDED.telefono,
                                                                                    empresa  = EXCLUDED.empresa
                                                                                        RETURNING id_broker
                                                                                          `
    const idBroker = brokerRows[0].id_broker

  // 2. Buscar id_unidad e id_condicion por nemotecnico + numero + tipo
  const unidadRows = await sql<{ id_unidad: number; id_condicion: number | null }[]>`
      SELECT u.id_unidad, cc.id_condicion
          FROM   unidad u
              JOIN   proyecto p ON p.id_proyecto = u.id_proyecto
                  LEFT JOIN condicion_comercial cc
                             ON cc.id_proyecto = u.id_proyecto
                                       AND cc.tipo_unidad  = u.tipo_unidad
                                                 AND cc.id_programa  = u.id_programa
                                                           AND cc.activo       = TRUE
                                                               WHERE  p.nemotecnico   = ${input.unidad.nemotecnico}
                                                                     AND  u.tipo_unidad   = ${input.unidad.tipoUnidad}
                                                                           AND  u.numero_unidad = ${input.unidad.numeroUnidad ?? null}
                                                                               LIMIT 1
                                                                                 `

  if (unidadRows.length === 0) {
        console.warn(`[historial] Unidad no encontrada en BD: ${input.unidad.nemotecnico} #${input.unidad.numeroUnidad}`)
        return
  }

  const { id_unidad, id_condicion } = unidadRows[0]

  // 3. Insertar cotizacion (ON CONFLICT DO NOTHING evita duplicados)
  const r = input.resultado
    const cotRows = await sql<{ id_cotizacion: number }[]>`
        INSERT INTO cotizacion (
              numero_cotizacion, id_broker, id_unidad, id_condicion,
                    valor_uf_snapshot, pie_pct, n_cuotas_pie, plazo_anios, plusvalia_anual_pct,
                          descuento_pct_snapshot, bono_pie_pct_snapshot, cuoton_pct_snapshot,
                                pie_periodo_constr_pct_snapshot, pie_credito_directo_pct_snapshot,
                                      reserva_clp_snapshot, modalidad_pago_snapshot,
                                            precio_lista_uf, precio_venta_uf, tasacion_uf, pie_total_uf,
                                                  total_pie_inmob_uf, ch_final_uf
                                                      ) VALUES (
                                                            ${input.numero}, ${idBroker}, ${id_unidad}, ${id_condicion ?? null},
                                                                  ${r.valorUF}, ${input.piePct}, ${r.cuotasPieN}, ${input.plazoAnios}, ${input.plusvaliaAnual},
                                                                        ${input.unidad.descuento}, ${input.unidad.bonoPie}, ${input.unidad.cuoton},
                                                                              ${input.unidad.piePeriodoConstruccion}, ${input.unidad.pieCreditoDirecto},
                                                                                    ${input.unidad.reserva},
                                                                                          ${input.unidad.piePeriodoConstruccion > 0 ? 'CONSTRUCCION' : input.unidad.pieCreditoDirecto > 0 ? 'CREDITO_DIRECTO' : 'ESTANDAR'},
                                                                                                ${r.precioListaTotal}, ${r.valorVentaUF}, ${r.tasacionUF}, ${r.pieTotalUF},
                                                                                                      ${r.totalPieInmobUF}, ${r.creditoHipFinalUF}
                                                                                                          )
                                                                                                              ON CONFLICT (numero_cotizacion) DO NOTHING
                                                                                                                  RETURNING id_cotizacion
                                                                                                                    `
    if (cotRows.length === 0) return   // ya existía

  const idCotizacion = cotRows[0].id_cotizacion

  // 4. Insertar 3 escenarios CAE
  for (let i = 0; i < 3; i++) {
        const esc = r.escenarios[i]
        await sql`
              INSERT INTO cotizacion_escenario (
                      id_cotizacion, numero_escenario, cae, arriendo_clp,
                              cuota_mensual_clp, cuota_mensual_uf, flujo_mensual_clp,
                                      flujo_acum_clp, roi_5anios, roi_anual, cap_rate
                                            ) VALUES (
                                                    ${idCotizacion}, ${i + 1}, ${esc.cae}, ${esc.arriendoMensualCLP},
                                                            ${esc.cuotaMensualCLP}, ${esc.cuotaMensualUF}, ${esc.flujoMensualCLP},
                                                                    ${esc.flujoAcumuladoCLP}, ${esc.roi5Anios}, ${esc.roiAnual}, ${esc.capRate}
                                                                          )
                                                                                ON CONFLICT (id_cotizacion, numero_escenario) DO NOTHING
                                                                                    `
  }
}

async function _listarPG(): Promise<CotizacionResumen[]> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getDb } = require('@/lib/db/client') as typeof import('@/lib/db/client')
    const sql = getDb()

  const rows = await sql<{
        numero_cotizacion: string
        fecha_generacion:  string
        nombre_proyecto:   string
        comuna:            string
        numero_unidad:     number | null
        tipo_unidad:       string
        broker_nombre:     string
        precio_venta_uf:   number
        ch_final_uf:       number
        pie_pct:           number
  }[]>`
      SELECT c.numero_cotizacion,
                 c.fecha_generacion::TEXT,
                            p.nombre_proyecto,
                                       p.comuna,
                                                  u.numero_unidad,
                                                             u.tipo_unidad,
                                                                        b.nombre AS broker_nombre,
                                                                                   c.precio_venta_uf,
                                                                                              c.ch_final_uf,
                                                                                                         c.pie_pct
                                                                                                             FROM   cotizacion c
                                                                                                                 JOIN   broker  b ON b.id_broker  = c.id_broker
                                                                                                                     JOIN   unidad  u ON u.id_unidad  = c.id_unidad
                                                                                                                         JOIN   proyecto p ON p.id_proyecto = u.id_proyecto
                                                                                                                             ORDER  BY c.fecha_generacion DESC
                                                                                                                                 LIMIT  200
                                                                                                                                   `

  return rows.map((r) => ({
        numero:       r.numero_cotizacion,
        fecha:        new Date(r.fecha_generacion).toLocaleDateString('es-CL'),
        proyecto:     r.nombre_proyecto,
        comuna:       r.comuna,
        numeroUnidad: r.numero_unidad,
        tipoUnidad:   r.tipo_unidad,
        broker:       r.broker_nombre,
        corredor:     '',   // no disponible en esquema PG actual
        valorVentaUF: Number(r.precio_venta_uf),
        creditoHipUF: Number(r.ch_final_uf),
        piePct:       Number(r.pie_pct),
  }))
}
