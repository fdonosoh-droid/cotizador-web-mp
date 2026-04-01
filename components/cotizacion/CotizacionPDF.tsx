// ============================================================
// COTIZACIÓN PDF — documento @react-pdf/renderer
// Renderizado server-side; descargado como archivo .pdf
// ============================================================
// IMPORTANTE: Este componente no usa JSX de React DOM.
// Solo usa primitivas de @react-pdf/renderer.
// ============================================================

import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from '@react-pdf/renderer'
import type { ResultadoCotizacion } from '@/lib/calculators/cotizador'
import type { BrokerData } from '@/components/broker/BrokerForm'
import type { UnidadCotizable } from '@/lib/data'
import { formatCLP, formatUF } from '@/lib/data/uf-format'

// ── Estilos ───────────────────────────────────────────────

const AZUL    = '#1d4ed8'
const AZUL_L  = '#dbeafe'
const GRIS    = '#6b7280'
const GRIS_L  = '#f9fafb'
const NEGRO   = '#111827'

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 8, color: NEGRO, padding: '15mm 12mm' },
  // header
  header:      { flexDirection: 'row', justifyContent: 'space-between', borderBottom: `2pt solid ${AZUL}`, paddingBottom: 8, marginBottom: 12 },
  logoTxt:     { fontSize: 16, fontFamily: 'Helvetica-Bold', color: AZUL },
  logoSub:     { fontSize: 7, color: GRIS, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  cotTxt:      { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NEGRO },
  numTxt:      { fontSize: 9, color: AZUL, fontFamily: 'Helvetica-Bold' },
  dateTxt:     { fontSize: 7, color: GRIS, marginTop: 2 },
  // secciones
  section:     { marginBottom: 10 },
  sTitle:      { fontSize: 7, fontFamily: 'Helvetica-Bold', color: AZUL, textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: `0.5pt solid ${AZUL_L}`, paddingBottom: 2, marginBottom: 4 },
  // grid 2 cols
  grid2:       { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  fieldWrap:   { flexDirection: 'row', width: '48%', marginBottom: 1 },
  fieldLabel:  { color: GRIS, width: 70, fontSize: 7 },
  fieldValue:  { fontFamily: 'Helvetica-Bold', fontSize: 7 },
  // tabla
  tHead:       { flexDirection: 'row', backgroundColor: AZUL, padding: '3 4' },
  tHeadTxt:    { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 7 },
  tRow:        { flexDirection: 'row', padding: '2.5 4' },
  tRowShade:   { flexDirection: 'row', padding: '2.5 4', backgroundColor: GRIS_L },
  tRowHL:      { flexDirection: 'row', padding: '2.5 4', backgroundColor: AZUL_L },
  tCell:       { fontSize: 7 },
  tCellR:      { fontSize: 7, textAlign: 'right' },
  tCellBold:   { fontSize: 7, fontFamily: 'Helvetica-Bold' },
  tCellBoldR:  { fontSize: 7, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  // colores especiales
  green:       { color: '#15803d' },
  red:         { color: '#dc2626' },
  // footer
  footer:      { borderTop: `0.5pt solid #d1d5db`, marginTop: 10, paddingTop: 4 },
  footerTxt:   { fontSize: 6, color: GRIS, lineHeight: 1.4 },
  // bienes conjuntos warning
  bcWarn:      { fontSize: 6.5, color: '#c2410c', marginTop: 3, fontFamily: 'Helvetica-Bold' },
  // modalidades especiales
  tRowAmber:   { flexDirection: 'row', padding: '2.5 4', backgroundColor: '#fffbeb' },
  amber:       { color: '#92400e' },
  warnTxt:     { fontSize: 6.5, color: '#92400e', marginTop: 3 },
})

// ── Componente principal ──────────────────────────────────

export interface CotizacionPDFProps {
  numero:               string
  fecha:                string
  broker:               BrokerData
  unidad:               UnidadCotizable
  unidadesAdicionales?: UnidadCotizable[]
  resultado:            ResultadoCotizacion
  plusvaliaAnual:       number
  logoBase64?:          string | null
}

export function CotizacionPDF({
  numero, fecha, broker, unidad, unidadesAdicionales = [], resultado: r, plusvaliaAnual, logoBase64,
}: CotizacionPDFProps) {
  const uf = r.valorUF

  return (
    <Document title={`Cotización ${numero} — ${unidad.nombreProyecto}`} author="VIVEPROP">
      <Page size="A4" style={s.page}>

        {/* ENCABEZADO */}
        <View style={s.header} fixed>
          <View>
            {logoBase64
              ? <Image src={logoBase64} style={{ width: 140, height: 26, objectFit: 'contain' }} />
              : <Text style={s.logoTxt}>VIVEPROP</Text>
            }
          </View>
          <View style={s.headerRight}>
            <Text style={s.cotTxt}>COTIZACIÓN</Text>
            <Text style={s.numTxt}>{numero}</Text>
            <Text style={s.dateTxt}>{fecha}</Text>
            <Text style={s.dateTxt}>UF del día: {formatUF(uf)}</Text>
          </View>
        </View>

        {/* CLIENTE */}
        <View style={s.section}>
          <Text style={s.sTitle}>Cliente</Text>
          <View style={s.grid2}>
            <F label="Nombre"    value={broker.nombre} />
            <F label="RUT"       value={broker.rut} />
            <F label="E-mail"    value={broker.email} />
            {broker.telefono ? <F label="Teléfono" value={broker.telefono} /> : null}
          </View>
        </View>

        {/* CORREDOR */}
        <View style={s.section}>
          <Text style={s.sTitle}>Corredor</Text>
          <View style={s.grid2}>
            <F label="Nombre"    value={broker.empresa ?? ''} />
            <F label="E-mail"    value={broker.emailCorredor ?? ''} />
            {broker.telefonoCorredor ? <F label="Teléfono" value={broker.telefonoCorredor} /> : null}
          </View>
        </View>

        {/* PROYECTO */}
        <View style={s.section}>
          <Text style={s.sTitle}>Proyecto</Text>
          <View style={s.grid2}>
            <F label="Inmobiliaria"   value={unidad.alianza} />
            <F label="Proyecto"       value={unidad.nombreProyecto} />
            <F label="Comuna"         value={unidad.comuna} />
            <F label="Dirección"      value={unidad.direccion} />
            <F label="Tipo entrega"   value={unidad.tipoEntrega} />
            <F label="Entrega aprox." value={unidad.periodoEntrega} />
          </View>
        </View>

        {/* CARACTERÍSTICAS */}
        <View style={s.section}>
          <Text style={s.sTitle}>Características de la propiedad</Text>
          <View style={s.grid2}>
            <F label="N° Unidad"    value={String(unidad.numeroUnidad ?? '—')} />
            <F label="Piso"         value={String(unidad.pisoProducto ?? '—')} />
            <F label="Orientación"  value={unidad.orientacion ?? '—'} />
            <F label="Tipología"    value={unidad.programa} />
            <F label="Dormitorios"  value={unidad.dormitoriosDisplay ?? '—'} />
            <F label="Baños"        value={String(unidad.banos ?? '—')} />
            <F label="Sup. Útil"    value={unidad.superficieUtil    ? `${Number(unidad.superficieUtil).toFixed(2)} m²`    : '—'} />
            <F label="Sup. Terraza" value={unidad.superficieTerraza ? `${Number(unidad.superficieTerraza).toFixed(2)} m²` : '—'} />
            <F label="Sup. Total"   value={unidad.superficieTotal   ? `${Number(unidad.superficieTotal).toFixed(2)} m²`   : '—'} />
          </View>
          {unidad.bienesConjuntos && (
            <Text style={s.bcWarn}>⚠ Bienes conjuntos obligatorios: {unidad.bienesConjuntos}</Text>
          )}
        </View>

        {/* PRECIOS */}
        <View style={s.section}>
          <Text style={s.sTitle}>Valores</Text>
          <THead cols={['Concepto', 'UF', '%', '$']} widths={['50%', '17%', '13%', '20%']} />
          <TR shade={false} bold={false} cols={[
            `Precio Lista ${unidad.tipoUnidad}${unidad.numeroUnidad ? ` N°${unidad.numeroUnidad}` : ''}`,
            `${formatUF(r.precioListaDepto)} UF`,
            r.precioListaTotal > 0 ? pct(r.precioListaDepto / r.precioListaTotal) : '',
            formatCLP(r.precioListaDepto * uf),
          ]} widths={['50%', '17%', '13%', '20%']} />
          {unidadesAdicionales.map((u, i) => (
            <TR key={i} shade cols={[
              `Precio Lista ${u.tipoUnidad}${u.numeroUnidad ? ` N°${u.numeroUnidad}` : ''}`,
              `${formatUF(u.precioLista)} UF`,
              r.precioListaTotal > 0 ? pct(u.precioLista / r.precioListaTotal) : '',
              formatCLP(u.precioLista * uf),
            ]} widths={['50%', '17%', '13%', '20%']} />
          ))}
          {r.precioListaDepto !== r.precioDescDepto && (
            <TR cols={[
              `Descuento Venta (${(r.descuentoAdicionalPct * 100).toFixed(1)}%)`,
              `-${formatUF(r.precioListaDepto - r.precioDescDepto)} UF`,
              '', formatCLP(-(r.precioListaDepto - r.precioDescDepto) * uf),
            ]} widths={['50%', '17%', '13%', '20%']} redLast />
          )}
          <TR highlight bold cols={[
            'Valor de Venta',
            `${formatUF(r.valorVentaUF)} UF`, '100%', formatCLP(r.valorVentaCLP),
          ]} widths={['50%', '17%', '13%', '20%']} />
        </View>

        {/* PLAN DE PIE */}
        <View style={s.section}>
          <Text style={s.sTitle}>Plan de Pago — Pie ({(r.piePct * 100).toFixed(0)}%)</Text>
          <THead cols={['Concepto', 'UF', '%', '$']} widths={['50%', '17%', '13%', '20%']} />
          <TR bold  cols={['Pie Total', `${formatUF(r.pieTotalUF)} UF`, pct(r.piePct), formatCLP(r.pieTotalUF * uf)]}  widths={['50%','17%','13%','20%']} />
          <TR shade cols={['Reserva',   `${formatUF(r.reservaUF)} UF`,  pct(r.reservaUF/r.valorVentaUF), formatCLP(r.reservaUF * uf)]}  widths={['50%','17%','13%','20%']} />
          <TR       cols={[`Upfront a la Promesa (${(r.upfrontPct*100).toFixed(0)}%)`, `${formatUF(r.upfrontUF)} UF`, pct(r.upfrontPct), formatCLP(r.upfrontUF * uf)]} widths={['50%','17%','13%','20%']} />
          <TR shade cols={[`Saldo Pie — ${r.cuotasPieN} cuotas`, `${formatUF(r.saldoPieUF)} UF`, pct(r.saldoPieUF/r.valorVentaUF), formatCLP(r.saldoPieCLP)]} widths={['50%','17%','13%','20%']} />
          <TR highlight bold cols={['Valor cuota pie / mes', `${formatUF(r.valorCuotaPieUF)} UF`, '', formatCLP(r.valorCuotaPieCLP)]} widths={['50%','17%','13%','20%']} />
          {r.cuotonUF > 0 && (
            <TRAmber bold cols={[
              `Cuotón — pago único (${(unidad.cuoton*100).toFixed(0)}%)`,
              `${formatUF(r.cuotonUF)} UF`, pct(unidad.cuoton), formatCLP(r.cuotonCLP),
            ]} widths={['50%','17%','13%','20%']} />
          )}
          {r.piePeriodoConstruccionUF > 0 && (
            <TRAmber bold cols={[
              `Pie Período Construcción — cuotas decrecientes (${(unidad.piePeriodoConstruccion*100).toFixed(0)}%)`,
              `${formatUF(r.piePeriodoConstruccionUF)} UF`, pct(unidad.piePeriodoConstruccion), formatCLP(r.piePeriodoConstruccionCLP),
            ]} widths={['50%','17%','13%','20%']} />
          )}
          {r.totalPieInmobUF !== r.pieTotalUF && (
            <TR bold shade cols={[
              'Total Pie a Inmobiliaria',
              `${formatUF(r.totalPieInmobUF)} UF`, pct(r.totalPieInmobUF/r.valorVentaUF), formatCLP(r.totalPieInmobUF * uf),
            ]} widths={['50%','17%','13%','20%']} />
          )}
          {r.piePeriodoConstruccionUF > 0 && (
            <Text style={s.warnTxt}>
              ⚠ Pie Período Construcción: las cuotas disminuyen mes a mes conforme avanza la obra.
            </Text>
          )}
        </View>

        {/* CRÉDITO DIRECTO INMOBILIARIA (P3.C3) */}
        {r.pieCreditoDirectoUF > 0 && (
          <View style={s.section}>
            <Text style={s.sTitle}>Crédito Directo Inmobiliaria ({(unidad.pieCreditoDirecto*100).toFixed(0)}%)</Text>
            <THead cols={['Concepto', 'UF', '%', '$']} widths={['50%', '17%', '13%', '20%']} />
            <TRAmber bold cols={[
              'Monto financiado por inmobiliaria',
              `${formatUF(r.pieCreditoDirectoUF)} UF`, pct(unidad.pieCreditoDirecto), formatCLP(r.pieCreditoDirectoCLP),
            ]} widths={['50%','17%','13%','20%']} />
            <Text style={s.warnTxt}>
              ⚠ Crédito Directo: plazo y tasa de interés se acuerdan directamente con la inmobiliaria.
            </Text>
          </View>
        )}

        {/* CRÉDITO HIPOTECARIO */}
        <View style={s.section}>
          <Text style={s.sTitle}>Crédito Hipotecario</Text>
          <THead cols={['Concepto', 'UF', '%', '$']} widths={['50%', '17%', '13%', '20%']} />
          <TR shade cols={['Valor de Venta', `${formatUF(r.valorVentaUF)} UF`, pct(r.valorVentaUF/r.tasacionUF), formatCLP(r.valorVentaCLP)]} widths={['50%','17%','13%','20%']} />
          {r.saldoAporteInmobUF > 0 && (
            <TR cols={[`Aporte Inmobiliaria (${(unidad.bonoPie*100).toFixed(0)}%)`, `${formatUF(r.saldoAporteInmobUF)} UF`, pct(unidad.bonoPie), formatCLP(r.saldoAporteInmobUF * uf)]} widths={['50%','17%','13%','20%']} />
          )}
          <TR bold shade cols={['Tasación Banco', `${formatUF(r.tasacionUF)} UF`, '100%', formatCLP(r.tasacionCLP)]} widths={['50%','17%','13%','20%']} />
          <TR highlight bold cols={['Crédito Hipotecario', `${formatUF(r.creditoHipFinalUF)} UF`, pct(r.creditoHipFinalUF/r.tasacionUF), formatCLP(r.creditoHipFinalCLP)]} widths={['50%','17%','13%','20%']} />
        </View>

        {/* ESCENARIOS CAE */}
        <View style={s.section}>
          <Text style={s.sTitle}>Crédito Hipotecario — Escenarios CAE</Text>
          <THead cols={['Concepto', ...r.escenarios.map(e => `CAE ${(e.cae*100).toFixed(1)}%`)]} widths={['40%','20%','20%','20%']} />
          <ERow label="Cuota mensual ($)"          vals={r.escenarios.map(e => formatCLP(e.cuotaMensualCLP))} shade />
          <ERow label="Cuota mensual (UF)"         vals={r.escenarios.map(e => `${formatUF(e.cuotaMensualUF)} UF`)} />
          <ERow label="Arriendo est. mensual ($)"  vals={r.escenarios.map((e) => formatCLP(e.arriendoMensualCLP))} shade />
          <ERow label="Flujo mensual ($)"          vals={r.escenarios.map(e => formatCLP(e.flujoMensualCLP))} flujoColors={r.escenarios.map(e => e.flujoMensualCLP >= 0)} />
          <ERow label="Flujo acumulado 5 años ($)" vals={r.escenarios.map(e => formatCLP(e.flujoAcumuladoCLP))} shade />
        </View>

        {/* EVALUACIÓN 5 AÑOS */}
        <View style={s.section}>
          <Text style={s.sTitle}>Evaluación a 5 Años (plusvalía {plusvaliaAnual}% anual)</Text>
          <THead cols={['Concepto', ...r.escenarios.map(e => `CAE ${(e.cae*100).toFixed(1)}%`)]} widths={['40%','20%','20%','20%']} />
          <ERow label="Precio de venta año 5 ($)"  vals={r.escenarios.map(() => formatCLP(r.precioVentaAnio5CLP))} shade />
          <ERow label="Pie pagado ($)"              vals={r.escenarios.map(() => formatCLP(r.piePagadoCLP))} />
          <ERow label="Flujo acumulado ($)"  vals={r.escenarios.map(e => formatCLP(e.flujoAcumuladoCLP))} shade />
          <ERow label="Cap Rate anual"      vals={r.escenarios.map((e) => pct(e.capRate))} />
          <ERow label="ROI s/pie 5 años"   vals={r.escenarios.map(e => `${(e.roi5Anios*100).toFixed(1)}%`)} bold />
          <ERow label="ROI anual compuesto"         vals={r.escenarios.map(e => `${(e.roiAnual*100).toFixed(1)}%`)} shade bold />
        </View>

        {/* DISCLAIMER */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>
            Esta cotización ha sido elaborada para apoyarte en la evaluación de esta oportunidad inmobiliaria, considerando las condiciones comerciales vigentes informadas por la inmobiliaria a la fecha de emisión. La información aquí contenida es de carácter referencial y puede experimentar variaciones en valores, beneficios o condiciones comerciales según lo que finalmente defina la inmobiliaria para cada caso. Asimismo, los montos expresados en UF están sujetos a la variación del índice oficial publicado por el Banco Central de Chile, y las condiciones de financiamiento hipotecario dependerán de la evaluación y aprobación de la entidad financiera respectiva. Cotización emitida el {fecha}.
          </Text>
        </View>

      </Page>
    </Document>
  )
}

// ── helpers PDF ───────────────────────────────────────────

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

function F({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}:</Text>
      <Text style={s.fieldValue}>{value}</Text>
    </View>
  )
}

function THead({ cols, widths }: { cols: string[]; widths: string[] }) {
  return (
    <View style={s.tHead}>
      {cols.map((c, i) => (
        <Text key={i} style={[s.tHeadTxt, { width: widths[i], textAlign: i > 0 ? 'right' : 'left' } as any]}>{c}</Text>
      ))}
    </View>
  )
}

function TR({ cols, widths, bold, shade, highlight, redLast }: {
  cols: string[]; widths: string[];
  bold?: boolean; shade?: boolean; highlight?: boolean; redLast?: boolean
}) {
  const rowStyle = highlight ? s.tRowHL : shade ? s.tRowShade : s.tRow
  return (
    <View style={rowStyle}>
      {cols.map((c, i) => {
        const isRight = i > 0
        const isRed   = redLast && i === cols.length - 1
        const style   = [
          bold ? s.tCellBold : s.tCell,
          { width: widths[i], textAlign: isRight ? 'right' : 'left' },
          isRed ? s.red : {},
        ] as any
        return <Text key={i} style={style}>{c}</Text>
      })}
    </View>
  )
}

/** Fila con fondo ámbar — para modalidades especiales (cuotón, pie construcción, crédito directo) */
function TRAmber({ cols, widths, bold }: {
  cols: string[]; widths: string[]; bold?: boolean
}) {
  return (
    <View style={s.tRowAmber}>
      {cols.map((c, i) => {
        const style = [
          bold ? s.tCellBold : s.tCell,
          s.amber,
          { width: widths[i], textAlign: i > 0 ? 'right' : 'left' },
        ] as any
        return <Text key={i} style={style}>{c}</Text>
      })}
    </View>
  )
}

function ERow({ label, vals, bold, shade, flujoColors }: {
  label: string; vals: string[];
  bold?: boolean; shade?: boolean; flujoColors?: boolean[]
}) {
  const widths = ['40%', '20%', '20%', '20%']
  const rowStyle = shade ? s.tRowShade : s.tRow
  return (
    <View style={rowStyle}>
      <Text style={[bold ? s.tCellBold : s.tCell, { width: widths[0] } as any]}>{label}</Text>
      {vals.map((v, i) => {
        const color = flujoColors ? (flujoColors[i] ? s.green : s.red) : {}
        return (
          <Text key={i} style={[bold ? s.tCellBoldR : s.tCellR, { width: widths[i+1] }, color] as any}>{v}</Text>
        )
      })}
    </View>
  )
}
