// ============================================================
// API Route — POST /api/cotizacion/salvar-excel
// Recibe datos de la cotización y los agrega al xlsx en disco
// usando exceljs (append a primera fila vacía)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import path    from 'path'
import fs      from 'fs'

const XLSX_PATH = path.join(process.cwd(), 'Historial_cotizaciones.xlsx')

const HEADERS = [
  'N° Cotización',
  'Fecha',
  'Proyecto',
  'Comuna',
  'N° Unidad',
  'Tipo Unidad',
  'Broker/Cliente',
  'Valor Venta UF',
  'Crédito Hip. UF',
  'Pie %',
  'Corredor',
]

const COL_WIDTHS = [18, 14, 30, 16, 10, 14, 25, 15, 15, 7, 25]

export interface FilaHistorial {
  numero:       string
  fecha:        string   // DD-MM-YYYY
  proyecto:     string
  comuna:       string
  numeroUnidad: number | null
  tipoUnidad:   string
  broker:       string
  valorVentaUF: number
  creditoHipUF: number
  piePct:       number   // decimal 0.10 = 10%
  corredor:     string
}

export async function POST(req: NextRequest) {
  try {
    const fila = (await req.json()) as FilaHistorial
    console.log('[salvar-excel] Recibido:', fila.numero, '| XLSX_PATH:', XLSX_PATH)

    const wb = new ExcelJS.Workbook()

    // Abrir archivo existente o crear nuevo
    if (fs.existsSync(XLSX_PATH)) {
      await wb.xlsx.readFile(XLSX_PATH)
    }

    // Obtener o crear la hoja Historial
    let ws = wb.getWorksheet('Historial')
    if (!ws) {
      ws = wb.addWorksheet('Historial')
      // Crear fila de encabezados
      ws.addRow(HEADERS)
      const headerRow = ws.getRow(1)
      headerRow.font      = { bold: true }
      headerRow.alignment = { vertical: 'middle' }
      // Anchos de columna
      ws.columns = HEADERS.map((h, i) => ({ header: h, width: COL_WIDTHS[i] }))
    }

    // Verificar que no existe ya ese número de cotización (evitar duplicados)
    let existe = false
    ws.eachRow((row, rowNum) => {
      if (rowNum > 1 && row.getCell(1).value === fila.numero) existe = true
    })

    if (existe) {
      console.log('[salvar-excel] Ya existe:', fila.numero, '— sin cambios')
      return NextResponse.json({ ok: true, accion: 'duplicado', registros: ws.rowCount - 1 })
    }

    // Agregar nueva fila
    ws.addRow([
      fila.numero,
      fila.fecha,
      fila.proyecto,
      fila.comuna,
      fila.numeroUnidad ?? '',
      fila.tipoUnidad,
      fila.broker,
      Math.round(fila.valorVentaUF * 100) / 100,
      Math.round(fila.creditoHipUF * 100) / 100,
      Number((fila.piePct * 100).toFixed(0)),
      fila.corredor,
    ])

    // Guardar
    await wb.xlsx.writeFile(XLSX_PATH)
    const registros = ws.rowCount - 1  // sin contar encabezado
    console.log('[salvar-excel] Guardado OK:', XLSX_PATH, `(${registros} registros)`)
    return NextResponse.json({ ok: true, accion: 'agregado', registros })

  } catch (err) {
    console.error('[salvar-excel] Error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
