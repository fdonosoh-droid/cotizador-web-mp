'use server'
// ============================================================
// SERVER ACTIONS — stock, cascada e historial
// Llamadas desde Client Components para obtener datos del servidor
// ============================================================

import { stockRepository } from '@/lib/data'
import type { ProyectoRow, UnidadCotizable } from '@/lib/data'
import { siguienteNumeroCotizacion } from '@/lib/utils/correlativo'
import {
  guardarCotizacion,
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

/** Devuelve el historial de cotizaciones (dev: JSON, prod: PostgreSQL) */
export async function listarCotizacionesAction(): Promise<CotizacionResumen[]> {
  return listarCotizaciones()
}

/** Recupera payload completo de una cotización por número (para regenerar PDF) */
export async function getCotizacionPayloadAction(numero: string) {
  const { getCotizacionPayload } = await import('@/lib/services/historial')
  return getCotizacionPayload(numero)
}
