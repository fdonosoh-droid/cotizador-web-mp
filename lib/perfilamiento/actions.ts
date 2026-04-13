'use server'

import { stockRepository } from '@/lib/data'
import type { UnidadCotizable } from '@/lib/data'

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
  minUF: number,
  maxUF: number,
): Promise<UnidadCotizable[]> {
  const tolerancia = 0.10
  const minFiltro  = Math.max(0, minUF * (1 - tolerancia))
  const maxFiltro  = maxUF * (1 + tolerancia)

  const todas = await stockRepository.getAllUnidadesPorRango(minFiltro, maxFiltro)

  return todas
    .filter(u => u.tipoUnidad === 'Departamento' || u.tipoUnidad === 'Casa')
    .sort((a, b) => a.precioLista - b.precioLista)
}
