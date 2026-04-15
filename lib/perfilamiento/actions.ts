'use server'

import { stockRepository } from '@/lib/data'
import type { UnidadCotizable } from '@/lib/data'
import {
  guardarPerfilamiento,
  vincularCotizacion,
  listarPerfilamientos,
  listarPerfilamientosCompletos,
  type PerfilamientoEntry,
  type PerfilamientoResumen,
} from '@/lib/perfilamiento/historial-perfilamiento'

// ── Actions de perfilamiento ─────────────────────────────────────

/**
 * Guarda un perfilamiento y retorna el id asignado.
 */
export async function guardarPerfilamientoAction(
  data: Omit<PerfilamientoEntry, 'id' | 'fecha' | 'fechaDisplay'>
): Promise<string> {
  return guardarPerfilamiento(data)
}

/**
 * Vincula un perfilamiento existente con el número de cotización generado.
 */
export async function vincularCotizacionAction(
  id: string,
  numeroCotizacion: string
): Promise<void> {
  vincularCotizacion(id, numeroCotizacion)
}

/**
 * Lista todos los perfilamientos (resumen, más recientes primero).
 */
export async function listarPerfilamientosAction(): Promise<PerfilamientoResumen[]> {
  return listarPerfilamientos()
}

/**
 * Lista todos los perfilamientos completos (para exportación).
 */
export async function listarPerfilamientosCompletosAction(): Promise<PerfilamientoEntry[]> {
  return listarPerfilamientosCompletos()
}

/**
 * Busca unidades Disponibles (solo Departamento/Casa) cuyo precio lista
 * esté entre minUF y maxUF, con 10% de tolerancia.
 * Devuelve UnidadCotizable completo para poder pasar directamente al cotizador.
 */
/** Retorna bodegas y estacionamientos Disponibles de un proyecto dado */
export async function getAdicionales(nemotecnico: string): Promise<UnidadCotizable[]> {
  const todas = await stockRepository.getUnidades(nemotecnico)
  return todas.filter(
    u => (u.tipoUnidad === 'Bodega' || u.tipoUnidad === 'Estacionamiento') &&
         u.estadoStock === 'Disponible'
  )
}

export async function buscarUnidadesPorRango(
  maxUF: number,
): Promise<UnidadCotizable[]> {
  const todas = await stockRepository.getAllUnidadesPorRango(0, maxUF)

  return todas
    .filter(u => u.tipoUnidad === 'Departamento' || u.tipoUnidad === 'Casa')
    .sort((a, b) => a.precioLista - b.precioLista)
}
