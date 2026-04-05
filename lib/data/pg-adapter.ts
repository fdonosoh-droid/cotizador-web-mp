// ============================================================
// PG ADAPTER — implementa IStockRepository sobre PostgreSQL
// Driver : postgres (Porsager) — tagged template literals
// Schema : scripts/schema_pg.sql v2
// Vista  : v_stock_cotizable — join operativo del cotizador
// ============================================================
// Activar: DATA_SOURCE=postgres en variables de entorno
// ============================================================

import { getDb } from '@/lib/db/client'
import type { IStockRepository } from './repository'
import type { ProyectoRow, UnidadCotizable, ReglaInmobiliariaRow, ParametroCalculoRow } from './types'

// ── Tipo auxiliar: fila cruda de v_stock_cotizable ────────
interface StockRow_PG {
  id_unidad:              number
  alianza:                string
  nemotecnico:            string
  nombre_proyecto:        string
  tipo_entrega:           string
  periodo_entrega:        string
  direccion:              string
  comuna:                 string
  numero_unidad:          number | null
  tipo_unidad:            string
  programa:               string
  piso_producto:          number
  orientacion:            string | null
  dormitorios_num:        number | null
  dormitorios_display:    string | null
  banios:                 number | null
  superficie_terreno_m2:  number | null
  superficie_util_m2:     number | null
  superficie_terraza_m2:  number | null
  superficie_total_m2:    number
  precio_lista_uf:        number
  estado_stock:           string
  bienes_conjuntos:       string | null
  reserva_clp:            number
  descuento:              number
  bono_pie:               number
  cuotas_pie:             number
  pie_periodo_construccion: number
  cuoton:                 number
  pie_credito_directo:    number
}

// ── Mapeo de fila PG → UnidadCotizable ───────────────────
function mapRow(r: StockRow_PG): UnidadCotizable {
  return {
    alianza:                r.alianza,
    nemotecnico:            r.nemotecnico,
    nombreProyecto:         r.nombre_proyecto,
    tipoEntrega:            r.tipo_entrega,
    periodoEntrega:         r.periodo_entrega,
    direccion:              r.direccion,
    comuna:                 r.comuna,
    estadoStock:            r.estado_stock,
    tipoUnidad:             r.tipo_unidad,
    programa:               r.programa,
    pisoProducto:           r.piso_producto,
    numeroUnidad:           r.numero_unidad,
    orientacion:            r.orientacion,
    dormitorios:            r.dormitorios_display,   // campo raw: usamos display
    dormitoriosNum:         r.dormitorios_num != null ? Number(r.dormitorios_num) : null,
    dormitoriosDisplay:     r.dormitorios_display,
    banos:                  r.banios != null ? Number(r.banios) : null,
    precioLista:            Number(r.precio_lista_uf),
    superficieTerreno:      r.superficie_terreno_m2  != null ? Number(r.superficie_terreno_m2)  : null,
    superficieUtil:         r.superficie_util_m2     != null ? Number(r.superficie_util_m2)     : null,
    superficieTerraza:      r.superficie_terraza_m2  != null ? Number(r.superficie_terraza_m2)  : null,
    superficieTotal:        r.superficie_total_m2    != null ? Number(r.superficie_total_m2)    : null,
    bienesConjuntos:        r.bienes_conjuntos,
    reserva:                Number(r.reserva_clp),
    descuento:              Number(r.descuento),
    bonoPie:                Number(r.bono_pie),
    cuotasPie:              Number(r.cuotas_pie),
    piePeriodoConstruccion: Number(r.pie_periodo_construccion),
    cuoton:                 Number(r.cuoton),
    pieCreditoDirecto:      Number(r.pie_credito_directo),
  }
}

// ── Adaptador PostgreSQL ──────────────────────────────────

export class PgAdapter implements IStockRepository {

  // ── Paso 1: comunas ────────────────────────────────────
  async getComunas(): Promise<string[]> {
    const rows = await getDb()<{ comuna: string }[]>`
      SELECT DISTINCT comuna
      FROM   v_stock_cotizable
      ORDER  BY comuna
    `
    return rows.map((r) => r.comuna)
  }

  // ── Paso 2: entregas ───────────────────────────────────
  async getEntregas(comuna: string): Promise<string[]> {
    const rows = await getDb()<{ tipo_entrega: string }[]>`
      SELECT DISTINCT tipo_entrega
      FROM   v_stock_cotizable
      WHERE  comuna = ${comuna}
      ORDER  BY tipo_entrega
    `
    return rows.map((r) => r.tipo_entrega)
  }

  // ── Paso 3: inmobiliarias ──────────────────────────────
  async getInmobiliarias(comuna: string, entrega: string): Promise<string[]> {
    const rows = await getDb()<{ alianza: string }[]>`
      SELECT DISTINCT alianza
      FROM   v_stock_cotizable
      WHERE  comuna       = ${comuna}
        AND  tipo_entrega = ${entrega}
      ORDER  BY alianza
    `
    return rows.map((r) => r.alianza)
  }

  // ── Paso 4: proyectos ──────────────────────────────────
  async getProyectos(
    comuna: string,
    entrega: string,
    inmobiliaria: string,
  ): Promise<ProyectoRow[]> {
    const rows = await getDb()<{
      alianza: string
      nemotecnico: string
      nombre_proyecto: string
      tipo_entrega: string
      periodo_entrega: string
      direccion: string
      comuna: string
    }[]>`
      SELECT DISTINCT
        alianza,
        nemotecnico,
        nombre_proyecto,
        tipo_entrega,
        periodo_entrega,
        direccion,
        comuna
      FROM   v_stock_cotizable
      WHERE  comuna       = ${comuna}
        AND  tipo_entrega = ${entrega}
        AND  alianza      = ${inmobiliaria}
      ORDER  BY nombre_proyecto
    `
    return rows.map((r) => ({
      alianza:        r.alianza,
      nombreProyecto: r.nombre_proyecto,
      nemotecnico:    r.nemotecnico,
      comuna:         r.comuna,
      direccion:      r.direccion,
      tipoEntrega:    r.tipo_entrega,
      periodoEntrega: r.periodo_entrega,
    }))
  }

  // ── Paso 5: unidades de un proyecto (solo Departamentos) ─
  async getUnidades(nemotecnico: string): Promise<UnidadCotizable[]> {
    const rows = await getDb()<StockRow_PG[]>`
      SELECT *
      FROM   v_stock_cotizable
      WHERE  nemotecnico = ${nemotecnico}
        AND  tipo_unidad = 'Departamento'
      ORDER  BY numero_unidad NULLS LAST
    `
    return rows.map(mapRow)
  }

  // ── Paso 5b: bienes conjuntos ──────────────────────────
  async getBienesConjuntos(
    nemotecnico: string,
    bienesConjuntosRaw: string,
  ): Promise<UnidadCotizable[]> {
    if (!bienesConjuntosRaw) return []

    // Parseo idéntico al ExcelAdapter:
    // "B - 64" → { tipoUnidad: 'Bodega', nro: 64 }
    // "E - 50" → { tipoUnidad: 'Estacionamiento', nro: 50 }
    const refs = bienesConjuntosRaw.split(',').map((s) => s.trim()).filter(Boolean)
    const resultado: UnidadCotizable[] = []

    for (const ref of refs) {
      const match = ref.match(/^([BE])\s*-\s*(\d+)/i)
      if (!match) continue
      const tipoPrefix = match[1].toUpperCase()
      const nro = parseInt(match[2], 10)
      const tipoUnidad = tipoPrefix === 'B' ? 'Bodega' : 'Estacionamiento'

      const rows = await getDb()<StockRow_PG[]>`
        SELECT *
        FROM   v_stock_cotizable
        WHERE  nemotecnico  = ${nemotecnico}
          AND  tipo_unidad  = ${tipoUnidad}
          AND  numero_unidad = ${nro}
        LIMIT 1
      `
      if (rows.length > 0) resultado.push(mapRow(rows[0]))
    }

    return resultado
  }

  // ── UF del día ─────────────────────────────────────────
  async getUFdelDia(): Promise<number> {
    const rows = await getDb()<{ valor_uf: number }[]>`
      SELECT valor_uf
      FROM   uf_valor
      WHERE  fecha <= CURRENT_DATE
      ORDER  BY fecha DESC
      LIMIT  1
    `
    return rows.length > 0 ? Number(rows[0].valor_uf) : 0
  }

  // ── Reglas inmobiliarias (TODO: migrar a tabla PG) ────
  async getReglasInmobiliarias(): Promise<ReglaInmobiliariaRow[]> {
    // Pendiente: implementar tabla reglas_inmobiliarias en PG
    // Por ahora retorna vacío → cotizadorConfig usa fallback hardcoded
    return []
  }

  // ── Parámetros de cálculo (TODO: migrar a tabla PG) ──
  async getParametrosCalculo(): Promise<ParametroCalculoRow[]> {
    // Pendiente: implementar tabla parametros_calculo en PG
    return []
  }
}
