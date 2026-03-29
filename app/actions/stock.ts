'use server'
// ============================================================
// SERVER ACTIONS — stock & cascada
// Llamadas desde Client Components para obtener datos del servidor
// ============================================================

import { stockRepository } from '@/lib/data'
import type { ProyectoRow, UnidadCotizable } from '@/lib/data'

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
