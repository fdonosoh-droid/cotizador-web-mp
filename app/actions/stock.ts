'use server'
// ============================================================
// SERVER ACTIONS — stock, cascada e historial
// Llamadas desde Client Components para obtener datos del servidor
// ============================================================

import { stockRepository } from '@/lib/data'
import type { ProyectoRow, UnidadCotizable, ReglaInmobiliariaRow, ParametroCalculoRow } from '@/lib/data'
import { siguienteNumeroCotizacion } from '@/lib/utils/correlativo'
import {
  guardarCotizacion,
  guardarYActualizarExcel,
  listarCotizaciones,
  type GuardarCotizacionInput,
  type CotizacionResumen,
} from '@/lib/services/historial'

export async function getComunas(): Promise<string[]> {
  return stockRepository.getComunas()
}

export async function getEntregas(comuna: string): Promise<string[]> {
  return stockRepository.getEntregas(comuna)
}

export async function getInmobiliarias(
  comuna: string,
  entrega: string,
): Promise<string[]> {
  return stockRepository.getInmobiliarias(comuna, entrega)
}

export async function getProyectos(
  comuna: string,
  entrega: string,
  inmobiliaria: string,
): Promise<ProyectoRow[]> {
  return stockRepository.getProyectos(comuna, entrega, inmobiliaria)
}

export async function getUnidades(
  nemotecnico: string,
): Promise<UnidadCotizable[]> {
  return stockRepository.getUnidades(nemotecnico)
}

export async function getBienesConjuntos(
  nemotecnico: string,
  bienesConjuntosRaw: string,
): Promise<UnidadCotizable[]> {
  return stockRepository.getBienesConjuntos(nemotecnico, bienesConjuntosRaw)
}

export async function getUFdelDia(): Promise<number> {
  return stockRepository.getUFdelDia()
}

export async function getReglasInmobiliarias(): Promise<ReglaInmobiliariaRow[]> {
  return stockRepository.getReglasInmobiliarias()
}

export async function getParametrosCalculo(): Promise<ParametroCalculoRow[]> {
  return stockRepository.getParametrosCalculo()
}

/** Genera y persiste el siguiente número correlativo de cotización */
export async function getNumeroCotizacion(): Promise<string> {
  return siguienteNumeroCotizacion()
}

/** Persiste una cotización generada (dev: JSON, prod: PostgreSQL) */
export async function guardarCotizacionAction(
  input: GuardarCotizacionInput,
): Promise<void> {
  await guardarCotizacion(input)
}

/** Guarda cotización Y sobreescribe Historial_cotizaciones.xlsx en disco */
export async function guardarCotizacionYExcelAction(
  input: GuardarCotizacionInput,
): Promise<void> {
  await guardarYActualizarExcel(input)
}

/** Devuelve el historial de cotizaciones (dev: JSON, prod: PostgreSQL) */
export async function listarCotizacionesAction(): Promise<CotizacionResumen[]> {
  return listarCotizaciones()
}

/** Recupera payload completo de una cotización por número (para regenerar PDF) */
export async function getCotizacionPayloadAction(numero: string) {
  const { getCotizacionPayload } = await import('@/lib/services/historial')
  return getCotizacionPayload(numero)
}

/** Normaliza nombre de proyecto: mayúsculas, sin acentos, sin sufijos entre paréntesis */
function normalizarProyecto(nombre: string): string {
  return nombre
    .replace(/\s*\(.*?\)\s*/g, ' ') // elimina (MT), (PC I), etc.
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // elimina acentos
    .toUpperCase()
    .trim()
}

/** Devuelve el link del brochure para un proyecto dado (columna LINKS de Proyectos/Proyectos.xlsx) */
export async function getBrochureUrl(nombreProyecto: string): Promise<string | null> {
  try {
    const path = await import('path')
    const fs   = await import('fs')
    const XLSX = await import('xlsx')
    const filePath = path.join(process.cwd(), 'Proyectos', 'Proyectos.xlsx')
    if (!fs.existsSync(filePath)) return null
    const wb   = XLSX.readFile(filePath)
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })
    const buscado = normalizarProyecto(nombreProyecto)
    const fila = rows.find(
      (r) => normalizarProyecto(String(r['PROYECTO'] ?? '')) === buscado
    )
    const link = fila ? String(fila['LINK_PDF'] ?? '').trim() : ''
    return link || null
  } catch {
    return null
  }
}
