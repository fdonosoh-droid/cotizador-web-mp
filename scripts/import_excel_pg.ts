#!/usr/bin/env node
// ============================================================
// IMPORTACIÓN: INPUT_FILES.xlsx → PostgreSQL
//
// Uso (requiere DATABASE_URL en el entorno):
//   DATABASE_URL=postgresql://user:pass@host/db npx tsx scripts/import_excel_pg.ts
//
// O con .env.local:
//   npx dotenv -e .env.local -- npx tsx scripts/import_excel_pg.ts
//
// Idempotente: puede ejecutarse varias veces sin duplicar datos.
// ============================================================

import postgres from 'postgres'
import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'

// ── Cargar .env.local si existe (sin dotenv como dep) ────────

const envLocalPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && !(key in process.env)) process.env[key] = val
  }
  console.log('[env] .env.local cargado')
}

// ── Configuración ─────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('[error] DATABASE_URL no está definida.')
  console.error('  Ejemplo: DATABASE_URL=postgresql://user:pass@localhost/db npx tsx scripts/import_excel_pg.ts')
  process.exit(1)
}

const EXCEL_PATH = path.join(process.cwd(), 'INPUT_FILES.xlsx')
if (!fs.existsSync(EXCEL_PATH)) {
  console.error(`[error] No se encontró el archivo: ${EXCEL_PATH}`)
  process.exit(1)
}

const BATCH_SIZE = 500   // filas por transacción en inserciones masivas

// ── Helpers de parseo ─────────────────────────────────────────

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '' || v === '#N/A') return null
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v)
  return isFinite(n) ? n : null
}

function parseStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function parseDormitorios(raw: unknown): { num: number | null; display: string | null } {
  const s = parseStr(raw)
  if (!s || s === '#N/A') return { num: null, display: null }
  const num = parseFloat(s.replace('-1/2', '.5').replace(',', '.'))
  return { num: isFinite(num) ? num : null, display: s }
}

// Normaliza tipo_unidad al set canónico del schema
const TIPO_MAP: Record<string, string> = {
  'departamento':         'Departamento',
  'depto':                'Departamento',
  'dpto':                 'Departamento',
  'estacionamiento':      'Estacionamiento',
  'estac.':               'Estacionamiento',
  'estac. moto':          'Estacionamiento Moto',
  'estacionamiento moto': 'Estacionamiento Moto',
  'bodega':               'Bodega',
  'local comercial':      'Local Comercial',
  'local':                'Local Comercial',
}

function normalizarTipoUnidad(raw: string): string {
  const canonical = TIPO_MAP[raw.toLowerCase()]
  if (canonical) return canonical
  // Si ya es un valor canónico devuélvelo tal cual
  const canonicals = ['Departamento', 'Estacionamiento', 'Estacionamiento Moto', 'Bodega', 'Local Comercial']
  if (canonicals.includes(raw)) return raw
  // Fallback: devuelve el valor capitalizado y emite warning
  console.warn(`[warn] tipo_unidad desconocido: "${raw}" → se usa tal cual`)
  return raw
}

// ── Carga del workbook ────────────────────────────────────────

console.log(`[excel] Leyendo ${EXCEL_PATH}…`)
const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true, dense: false })

function sheetToJson<T = Record<string, unknown>>(sheetName: string): T[] {
  const ws = wb.Sheets[sheetName]
  if (!ws) throw new Error(`Hoja "${sheetName}" no encontrada en el Excel`)
  return XLSX.utils.sheet_to_json<T>(ws, { defval: null })
}

// ── Parsear todas las hojas ───────────────────────────────────

console.log('[excel] Parseando PROYECTOS…')
const rawProyectos = sheetToJson('PROYECTOS').map((r: Record<string, unknown>) => ({
  alianza:        parseStr(r['ALIANZA']),
  nombreProyecto: parseStr(r['NOMBRE PROYECTO']),
  nemotecnico:    parseStr(r['NEMOTECNICO']),
  comuna:         parseStr(r['COMUNA']),
  direccion:      parseStr(r['DIRECCION']),
  tipoEntrega:    parseStr(r['TIPO ENTREGA']),
  periodoEntrega: parseStr(r['PERIODO ENTREGA']),
})).filter((p) => p.nemotecnico && p.nombreProyecto)

console.log('[excel] Parseando STOCK NUEVOS…')
const rawStock = sheetToJson('STOCK NUEVOS').map((r: Record<string, unknown>) => {
  const dorm = parseDormitorios(r['DORMITORIOS'])
  return {
    nemotecnico:        parseStr(r['NEMOTECNICO']),
    tipoUnidad:         normalizarTipoUnidad(parseStr(r['TIPO UNIDAD'])),
    programa:           parseStr(r['PROGRAMA']),
    estadoStock:        parseStr(r['ESTADO STOCK']),
    numeroUnidad:       parseNum(r['NUMERO UNIDAD']),
    pisoProducto:       parseNum(r['PISO PRODUCTO']) ?? 0,
    orientacion:        parseStr(r['ORIENTACION']) || null,
    dormitoriosNum:     dorm.num,
    dormitoriosDisplay: dorm.display,
    banos:              parseNum(r['BAÑOS']),
    precioLista:        parseNum(r['PRECIO LISTA']) ?? 0,
    superficieTerreno:  parseNum(r['SUPERFICIE TERRENO']) ?? 0,
    superficieUtil:     parseNum(r['SUPERFICIE UTIL']),
    superficieTerraza:  parseNum(r['SUPERFICIE TERRAZA']),
    superficieTotal:    parseNum(r['SUPERFICIE TOTAL']) ?? 0,
    bienesConjuntos:    parseStr(r['BIENES CONJUNTOS']) || null,
  }
}).filter((s) => s.nemotecnico && s.precioLista > 0)

console.log('[excel] Parseando CONDICIONES_COMERCIALES…')
const rawCondiciones = sheetToJson('CONDICIONES_COMERCIALES').map((r: Record<string, unknown>) => ({
  nemotecnico:            parseStr(r['NEMOTECNICO']),
  tipoUnidad:             normalizarTipoUnidad(parseStr(r['TIPO UNIDAD'])),
  programa:               parseStr(r['PROGRAMA']),
  reserva:                parseNum(r['RESERVA']) ?? 100000,
  descuento:              parseNum(r['DESCUENTO']) ?? 0,
  bonoPie:                parseNum(r['BONO PIE']) ?? 0,
  cuotasPie:              Math.round(parseNum(r['CUOTAS PIE']) ?? 0),
  piePeriodoConstruccion: parseNum(r['PIE PERÍODO CONSTRUCCIÓN']) ?? 0,
  cuoton:                 parseNum(r['CUOTÓN']) ?? 0,
  pieCreditoDirecto:      parseNum(r['PIE CRÉDITO DIRECTO']) ?? 0,
})).filter((c) => c.nemotecnico)

console.log('[excel] Parseando UF…')
const rawUF = sheetToJson('UF').map((r: Record<string, unknown>) => ({
  fecha: r['FECHA'] instanceof Date ? r['FECHA'] : new Date(parseStr(r['FECHA'])),
  valor: parseNum(r['VALOR']) ?? 0,
})).filter((r) => r.valor > 0 && r.fecha instanceof Date && !isNaN(r.fecha.getTime()))

console.log(`[excel] Proyectos: ${rawProyectos.length} | Stock: ${rawStock.length} | Condiciones: ${rawCondiciones.length} | UF: ${rawUF.length}`)

// ── Conectar a PostgreSQL ─────────────────────────────────────

const sql = postgres(DATABASE_URL, { max: 1, idle_timeout: 60 })

// ── Utilidad: chunking ────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ── PASO 1: Programas ─────────────────────────────────────────

async function importarProgramas() {
  // Colectar todos los códigos de programa del Excel (además de los seeds)
  const codigosExcel = new Set([
    ...rawStock.map((s) => s.programa),
    ...rawCondiciones.map((c) => c.programa),
  ].filter(Boolean))

  if (codigosExcel.size === 0) {
    console.log('[programa] Sin programas nuevos del Excel')
    return
  }

  const rows = [...codigosExcel].map((codigo) => ({ codigo }))
  let inserted = 0
  for (const batch of chunk(rows, BATCH_SIZE)) {
    const result = await sql`
      INSERT INTO programa (codigo)
      SELECT unnest(${batch.map((r) => r.codigo)}::text[])
      ON CONFLICT (codigo) DO NOTHING
    `
    inserted += result.count
  }
  console.log(`[programa] ${inserted} nuevos códigos insertados (${codigosExcel.size} total del Excel)`)
}

// ── PASO 2: Inmobiliarias ─────────────────────────────────────

async function importarInmobiliarias(): Promise<Map<string, number>> {
  const nombres = [...new Set(rawProyectos.map((p) => p.alianza).filter(Boolean))]

  for (const batch of chunk(nombres, BATCH_SIZE)) {
    await sql`
      INSERT INTO inmobiliaria (nombre)
      SELECT unnest(${batch}::text[])
      ON CONFLICT (nombre) DO NOTHING
    `
  }

  const rows = await sql<{ id_inmobiliaria: number; nombre: string }[]>`
    SELECT id_inmobiliaria, nombre FROM inmobiliaria
  `
  const map = new Map(rows.map((r) => [r.nombre, r.id_inmobiliaria]))
  console.log(`[inmobiliaria] ${nombres.length} inmobiliarias (${map.size} total en BD)`)
  return map
}

// ── PASO 3: Proyectos ─────────────────────────────────────────

async function importarProyectos(inmobMap: Map<string, number>): Promise<Map<string, number>> {
  let inserted = 0
  let skipped = 0

  for (const p of rawProyectos) {
    const idInmob = inmobMap.get(p.alianza)
    if (!idInmob) { skipped++; continue }

    const tipoEntrega = ['Entrega Inmediata', 'Entrega Futura'].includes(p.tipoEntrega)
      ? p.tipoEntrega
      : 'Entrega Futura'

    const result = await sql`
      INSERT INTO proyecto
        (id_inmobiliaria, nemotecnico, nombre_proyecto, comuna, direccion, tipo_entrega, periodo_entrega)
      VALUES
        (${idInmob}, ${p.nemotecnico}, ${p.nombreProyecto}, ${p.comuna}, ${p.direccion},
         ${tipoEntrega}, ${p.periodoEntrega})
      ON CONFLICT (nemotecnico) DO UPDATE SET
        nombre_proyecto = EXCLUDED.nombre_proyecto,
        comuna          = EXCLUDED.comuna,
        direccion       = EXCLUDED.direccion,
        tipo_entrega    = EXCLUDED.tipo_entrega,
        periodo_entrega = EXCLUDED.periodo_entrega,
        activo          = TRUE
    `
    inserted += result.count
  }

  const rows = await sql<{ id_proyecto: number; nemotecnico: string }[]>`
    SELECT id_proyecto, nemotecnico FROM proyecto
  `
  const map = new Map(rows.map((r) => [r.nemotecnico, r.id_proyecto]))
  console.log(`[proyecto] ${inserted} upserted, ${skipped} sin inmobiliaria (${map.size} total en BD)`)
  return map
}

// ── PASO 4: Unidades ──────────────────────────────────────────

async function importarUnidades(
  proyMap: Map<string, number>,
  progMap: Map<string, number>,
): Promise<void> {
  let inserted = 0
  let skipped = 0

  for (const batch of chunk(rawStock, BATCH_SIZE)) {
    for (const s of batch) {
      const idProy = proyMap.get(s.nemotecnico)
      const idProg = progMap.get(s.programa)
      if (!idProy || !idProg) { skipped++; continue }

      const result = await sql`
        INSERT INTO unidad (
          id_proyecto, id_programa, numero_unidad, tipo_unidad,
          piso_producto, orientacion, dormitorios_num, dormitorios_display,
          banios, superficie_terreno_m2, superficie_util_m2, superficie_terraza_m2,
          superficie_total_m2, precio_lista_uf, estado_stock, bienes_conjuntos
        ) VALUES (
          ${idProy}, ${idProg}, ${s.numeroUnidad ?? null}, ${s.tipoUnidad},
          ${s.pisoProducto}, ${s.orientacion ?? null},
          ${s.dormitoriosNum ?? null}, ${s.dormitoriosDisplay ?? null},
          ${s.banos ?? null}, ${s.superficieTerreno}, ${s.superficieUtil ?? null},
          ${s.superficieTerraza ?? null}, ${s.superficieTotal},
          ${s.precioLista}, ${s.estadoStock || 'Disponible'}, ${s.bienesConjuntos ?? null}
        )
        ON CONFLICT (id_proyecto, tipo_unidad, numero_unidad) WHERE numero_unidad IS NOT NULL
        DO UPDATE SET
          precio_lista_uf       = EXCLUDED.precio_lista_uf,
          estado_stock          = EXCLUDED.estado_stock,
          superficie_util_m2    = EXCLUDED.superficie_util_m2,
          superficie_terraza_m2 = EXCLUDED.superficie_terraza_m2,
          superficie_total_m2   = EXCLUDED.superficie_total_m2,
          bienes_conjuntos      = EXCLUDED.bienes_conjuntos,
          orientacion           = EXCLUDED.orientacion
      `
      inserted += result.count
    }
  }

  console.log(`[unidad] ${inserted} upserted, ${skipped} sin proyecto/programa`)
}

// ── PASO 5: Condiciones Comerciales ───────────────────────────

async function importarCondiciones(
  proyMap: Map<string, number>,
  progMap: Map<string, number>,
): Promise<void> {
  let inserted = 0
  let skipped = 0

  for (const c of rawCondiciones) {
    const idProy = proyMap.get(c.nemotecnico)
    const idProg = progMap.get(c.programa)
    if (!idProy || !idProg) { skipped++; continue }

    // Determinar modalidad_pago
    let modalidad = 'ESTANDAR'
    if (c.piePeriodoConstruccion > 0) modalidad = 'CONSTRUCCION'
    else if (c.pieCreditoDirecto  > 0) modalidad = 'CREDITO_DIRECTO'

    const result = await sql`
      INSERT INTO condicion_comercial (
        id_proyecto, id_programa, tipo_unidad, modalidad_pago,
        reserva_clp, descuento, bono_pie, cuotas_pie,
        pie_periodo_construccion, cuoton, pie_credito_directo
      ) VALUES (
        ${idProy}, ${idProg}, ${c.tipoUnidad}, ${modalidad},
        ${c.reserva}, ${c.descuento}, ${c.bonoPie}, ${c.cuotasPie},
        ${c.piePeriodoConstruccion}, ${c.cuoton}, ${c.pieCreditoDirecto}
      )
      ON CONFLICT (id_proyecto, tipo_unidad, id_programa)
      DO UPDATE SET
        modalidad_pago           = EXCLUDED.modalidad_pago,
        reserva_clp              = EXCLUDED.reserva_clp,
        descuento                = EXCLUDED.descuento,
        bono_pie                 = EXCLUDED.bono_pie,
        cuotas_pie               = EXCLUDED.cuotas_pie,
        pie_periodo_construccion = EXCLUDED.pie_periodo_construccion,
        cuoton                   = EXCLUDED.cuoton,
        pie_credito_directo      = EXCLUDED.pie_credito_directo,
        activo                   = TRUE
    `
    inserted += result.count
  }

  console.log(`[condicion_comercial] ${inserted} upserted, ${skipped} sin proyecto/programa`)
}

// ── PASO 6: Valores UF ────────────────────────────────────────

async function importarUF(): Promise<void> {
  let total = 0

  for (const batch of chunk(rawUF, BATCH_SIZE)) {
    const fechas  = batch.map((r) => r.fecha.toISOString().slice(0, 10))
    const valores = batch.map((r) => r.valor)

    const result = await sql`
      INSERT INTO uf_valor (fecha, valor_uf)
      SELECT
        unnest(${fechas}::date[]),
        unnest(${valores}::numeric[])
      ON CONFLICT (fecha) DO UPDATE SET valor_uf = EXCLUDED.valor_uf
    `
    total += result.count
  }

  console.log(`[uf_valor] ${total} filas upserted de ${rawUF.length}`)
}

// ── PASO 7: Bienes Conjuntos ──────────────────────────────────

async function importarBienesConjuntos(proyMap: Map<string, number>): Promise<void> {
  // Carga el mapa de unidades (proyecto, tipo, numero) → id_unidad
  const unidadesDB = await sql<{
    id_unidad:    number
    id_proyecto:  number
    tipo_unidad:  string
    numero_unidad: number | null
  }[]>`SELECT id_unidad, id_proyecto, tipo_unidad, numero_unidad FROM unidad`

  const unidadKey = (idProy: number, tipo: string, nro: number) =>
    `${idProy}|${tipo}|${nro}`

  const unidadMap = new Map(
    unidadesDB
      .filter((u) => u.numero_unidad !== null)
      .map((u) => [unidadKey(u.id_proyecto, u.tipo_unidad, u.numero_unidad!), u.id_unidad]),
  )

  let inserted = 0
  let skipped  = 0

  const stockConBC = rawStock.filter((s) => s.bienesConjuntos && s.numeroUnidad !== null)

  for (const s of stockConBC) {
    const idProy   = proyMap.get(s.nemotecnico)
    const idDepto  = idProy
      ? unidadMap.get(unidadKey(idProy, s.tipoUnidad, s.numeroUnidad!))
      : undefined

    if (!idProy || !idDepto) { skipped++; continue }

    const refs = s.bienesConjuntos!.split(',').map((x) => x.trim()).filter(Boolean)
    for (const ref of refs) {
      const match = ref.match(/^([BE])\s*-\s*(\d+)/i)
      if (!match) continue

      const tipoBien = match[1].toUpperCase() === 'B' ? 'Bodega' : 'Estacionamiento'
      const nroBien  = parseInt(match[2], 10)
      const idBien   = unidadMap.get(unidadKey(idProy, tipoBien, nroBien))

      if (!idBien) { skipped++; continue }

      const result = await sql`
        INSERT INTO bien_conjunto (id_unidad_principal, id_unidad_asociada)
        VALUES (${idDepto}, ${idBien})
        ON CONFLICT (id_unidad_principal, id_unidad_asociada) DO NOTHING
      `
      inserted += result.count
    }
  }

  console.log(`[bien_conjunto] ${inserted} relaciones insertadas, ${skipped} skipped`)
}

// ── MAIN ──────────────────────────────────────────────────────

async function main() {
  console.log('\n=== IMPORTACIÓN EXCEL → PostgreSQL ===\n')
  const t0 = Date.now()

  try {
    // 1. Programas
    await importarProgramas()

    // 2. Inmobiliarias → mapa nombre → id
    const inmobMap = await importarInmobiliarias()

    // 3. Proyectos → mapa nemotecnico → id
    const proyMap = await importarProyectos(inmobMap)

    // 4. Mapa completo programa codigo → id (incluye los del Excel)
    const progRows = await sql<{ id_programa: number; codigo: string }[]>`
      SELECT id_programa, codigo FROM programa
    `
    const progMap = new Map(progRows.map((r) => [r.codigo, r.id_programa]))

    // 5. Unidades
    await importarUnidades(proyMap, progMap)

    // 6. Condiciones comerciales
    await importarCondiciones(proyMap, progMap)

    // 7. Valores UF
    await importarUF()

    // 8. Bienes conjuntos
    await importarBienesConjuntos(proyMap)

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    console.log(`\n✓ Importación completada en ${elapsed}s`)
    console.log('  Puedes activar DATA_SOURCE=postgres en .env.local\n')
  } catch (err) {
    console.error('\n[error fatal]', err)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()
