// ============================================================
// DATA TYPES — filas crudas desde Excel y tipos derivados
// Mapeados desde hojas de INPUT_FILES.xlsx
// ============================================================

/** Fila cruda de la hoja STOCK NUEVOS */
export interface StockRow {
  alianza:            string        // Inmobiliaria
  nemotecnico:        string        // Código de proyecto
  nombreProyecto:     string
  tipoEntrega:        string        // 'Entrega Inmediata' | 'Entrega Futura'
  periodoEntrega:     string        // 'Inmediata' | '1er semestre 2028', etc.
  direccion:          string
  comuna:             string
  estadoStock:        string        // 'Disponible' | 'Reservado' | 'Vendido'
  tipoUnidad:         string        // 'Departamento' | 'Bodega' | 'Estacionamiento'
  programa:           string        // '2D1B' | '1D1B' | 'Bodega', etc.
  pisoProducto:       number | null
  numeroUnidad:       number | null
  orientacion:        string | null
  dormitorios:        string | null // valor crudo: '1', '2', '1-1/2', 'BO', etc.
  dormitoriosNum:     number | null // extraído para filtros numéricos
  dormitoriosDisplay: string | null // etiqueta UI
  banos:              number | null
  precioLista:        number        // UF
  superficieTerreno:  number | null // m²
  superficieUtil:     number | null // m²
  superficieTerraza:  number | null // m²
  superficieTotal:    number | null // m²
  bienesConjuntos:    string | null
}

/** Fila cruda de CONDICIONES_COMERCIALES */
export interface CondicionComercialRow {
  alianza:               string
  nemotecnico:           string
  nombreProyecto:        string
  estadoProyecto:        string
  tipoUnidad:            string
  programa:              string
  reserva:               number  // CLP
  descuento:             number  // decimal: 0.05 = 5%
  bonoPie:               number  // decimal
  cuotasPie:             number
  piePeriodoConstruccion: number // decimal
  cuoton:                number
  pieCreditoDirecto:     number  // decimal
}

/** Fila cruda de PROYECTOS */
export interface ProyectoRow {
  alianza:       string
  nombreProyecto: string
  nemotecnico:   string
  comuna:        string
  direccion:     string
  tipoEntrega:   string
  periodoEntrega: string
}

/** Unidad cotizable: join de StockRow + CondicionComercialRow (para uso en cotizador) */
export interface UnidadCotizable extends StockRow {
  reserva:               number
  descuento:             number
  bonoPie:               number
  cuotasPie:             number
  piePeriodoConstruccion: number
  cuoton:                number
  pieCreditoDirecto:     number
}

/** Valor UF para una fecha */
export interface UFRow {
  fecha: Date
  valor: number
}
