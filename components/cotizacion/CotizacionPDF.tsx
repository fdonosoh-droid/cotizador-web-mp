// ============================================================
// COTIZACIÓN PDF — documento @react-pdf/renderer
// Renderizado server-side; descargado como archivo .pdf
// ============================================================
// IMPORTANTE: Este componente no usa JSX de React DOM.
// Solo usa primitivas de @react-pdf/renderer.
// ============================================================

import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'
import type { ResultadoCotizacion } from '@/lib/calculators/cotizador'
import type { BrokerData } from '@/components/broker/BrokerForm'
import type { UnidadCotizable } from '@/lib/data'
import { formatCLP, formatUF } from '@/lib/data/uf-service'

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
})

// ── Componente principal ──────────────────────────────────

export interface CotizacionPDFProps {
  numero:             string
  fecha:              string
  broker:             BrokerData
  unidad:             UnidadCotizable
  resultado:          ResultadoCotizacion
  arriendoMensualCLP: number
  plusvaliaAnual:     number
}

export function CotizacionPDF({
  numero, fecha, broker, unidad, resultado: r, arriendoMensualCLP, plusvaliaAnual,
}: CotizacionPDFProps) {
  const uf = r.valorUF

  return (
    <Document title={`Cotización ${numero} — ${unidad.nombreProyecto}`} author="VIVEPROP">
      <Page size="A4" style={s.page}>

        {/* ENCABEZADO */}
        <View style={s.header} fixed>
          <View>
            <Text style={s.logoTxt}>VIVEPROP</Text>
            <Text style={s.logoSub}>Mercado Primario</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.cotTxt}>COTIZACIÓN</Text>
            <Text style={s.numTxt}>{numero}</Text>
            <Text style={s.dateTxt}>{fecha}</Text>
            <Text style={s.dateTxt}>UF del día: {formatUF(uf)}</Text>
          </View>
        </View>

        {/* CORREDOR */}
        <View style={s.section}>
          <Text style={s.sTitle}>Corredor</Text>
          <View style={s.grid2}>
            <F label="Nombre"    value={broker.nombre} />
            <F label="RUT"       value={broker.rut} />
            <F label="E-mail"    value={broker.email} />
            {broker.telefono && <F label="Teléfono" value={broker.telefono} />}
            {broker.empresa  && <F label="Empresa"  value={broker.empresa} />}
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
            <F label="Sup. Útil"    value={unidad.superficieUtil    ? `${unidad.superficieUtil} m²`    : '—'} />
            <F label="Sup. Terraza" value={unidad.superficieTerraza ? `${unidad.superficieTerraza} m²` : '—'} />
            <F label="Sup. Total"   value={unidad.superficieTotal   ? `${unidad.superficieTotal} m²`   : '—'} />
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
            `Precio Lista Depto`,
            `${formatUF(r.precioListaDepto)} UF`,
            r.precioListaTotal > 0 ? pct(r.precioListaDepto / r.precioListaTotal) : '',
            formatCLP(r.precioListaDepto * uf),
          ]} widths={['50%', '17%', '13%', '20%']} />
          {r.precioListaOtros > 0 && (
            <TR shade cols={[
              'Bienes Conjuntos (obligatorio)',
              `${formatUF(r.precioListaOtros)} UF`,
              r.precioListaTotal > 0 ? pct(r.precioListaOtros / r.precioListaTotal) : '',
              formatCLP(r.precioListaOtros * uf),
            ]} widths={['50%', '17%', '13%', '20%']} />
          )}
          {r.precioListaDepto !== r.precioDescDepto && (
            <TR cols={[
              `Descuento Venta (${(unidad.descuento * 100).toFixed(0)}%)`,
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
          <TR       cols={['Upfront a la Promesa (2%)', `${formatUF(r.upfrontUF)} UF`, pct(r.upfrontUF/r.valorVentaUF), formatCLP(r.upfrontUF * uf)]} widths={['50%','17%','13%','20%']} />
          <TR shade cols={[`Saldo Pie — ${r.cuotasPieN} cuotas`, `${formatUF(r.saldoPieUF)} UF`, pct(r.saldoPieUF/r.valorVentaUF), formatCLP(r.saldoPieCLP)]} widths={['50%','17%','13%','20%']} />
          <TR highlight bold cols={['Valor cuota pie / mes', `${formatUF(r.valorCuotaPieUF)} UF`, '', formatCLP(r.valorCuotaPieCLP)]} widths={['50%','17%','13%','20%']} />
        </View>

        {/* CRÉDITO HIPOTECARIO */}
        <View style={s.section}>
          <Text style={s.sTitle}>Crédito Hipotecario</Text>
          <THead cols={['Concepto', 'UF', '%', '$']} widths={['50%', '17%', '13%', '20%']} />
          <TR bold shade cols={['Valor de Venta (Tasación)', `${formatUF(r.tasacionUF)} UF`, '100%', formatCLP(r.tasacionCLP)]} widths={['50%','17%','13%','20%']} />
          {r.saldoAporteInmobUF > 0 && (
            <TR cols={[`Aporte Inmobiliaria — Bono Pie (${(unidad.bonoPie*100).toFixed(0)}%)`, `${formatUF(r.saldoAporteInmobUF)} UF`, pct(r.saldoAporteInmobUF/r.tasacionUF), formatCLP(r.saldoAporteInmobUF * uf)]} widths={['50%','17%','13%','20%']} />
          )}
          <TR highlight bold cols={['Crédito Hipotecario', `${formatUF(r.creditoHipFinalUF)} UF`, pct(r.creditoHipFinalUF/r.tasacionUF), formatCLP(r.creditoHipFinalCLP)]} widths={['50%','17%','13%','20%']} />
          <TR shade cols={['Cap Rate anual', '', pct(r.capRate), '']} widths={['50%','17%','13%','20%']} />
        </View>

        {/* ESCENARIOS CAE */}
        <View style={s.section}>
          <Text style={s.sTitle}>Crédito Hipotecario — Escenarios CAE</Text>
          <THead cols={['Concepto', ...r.escenarios.map(e => `CAE ${(e.cae*100).toFixed(1)}%`)]} widths={['40%','20%','20%','20%']} />
          <ERow label="Cuota mensual ($)"          vals={r.escenarios.map(e => formatCLP(e.cuotaMensualCLP))} shade />
          <ERow label="Cuota mensual (UF)"         vals={r.escenarios.map(e => `${formatUF(e.cuotaMensualUF)} UF`)} />
          <ERow label="Arriendo est. mensual ($)"  vals={r.escenarios.map(() => formatCLP(arriendoMensualCLP))} shade />
          <ERow label="Flujo mensual ($)"          vals={r.escenarios.map(e => formatCLP(e.flujoMensualCLP))} flujoColors={r.escenarios.map(e => e.flujoMensualCLP >= 0)} />
          <ERow label="Flujo acumulado 5 años ($)" vals={r.escenarios.map(e => formatCLP(e.flujoAcumuladoCLP))} shade />
        </View>

        {/* EVALUACIÓN 5 AÑOS */}
        <View style={s.section}>
          <Text style={s.sTitle}>Evaluación a 5 Años (plusvalía {plusvaliaAnual}% anual)</Text>
          <THead cols={['Concepto', ...r.escenarios.map(e => `CAE ${(e.cae*100).toFixed(1)}%`)]} widths={['40%','20%','20%','20%']} />
          <ERow label="Precio de venta año 5 ($)"  vals={r.escenarios.map(() => formatCLP(r.precioVentaAnio5CLP))} shade />
          <ERow label="Pie pagado ($)"              vals={r.escenarios.map(() => formatCLP(r.piePagadoCLP))} />
          <ERow label="Flujo acumulado ($)"         vals={r.escenarios.map(e => formatCLP(e.flujoAcumuladoCLP))} shade />
          <ERow label="ROI 5 años"                  vals={r.escenarios.map(e => `${(e.roi5Anios*100).toFixed(1)}%`)} bold />
          <ERow label="ROI anual compuesto"         vals={r.escenarios.map(e => `${(e.roiAnual*100).toFixed(1)}%`)} shade bold />
        </View>

        {/* DISCLAIMER */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>
            Esta cotización y su información son estimativas y está basada en las condiciones comerciales
            establecidas por la inmobiliaria al momento de su generación. VIVEPROP no garantiza la
            exactitud de los valores presentados. Los montos en UF están sujetos a variación según el
            índice oficial. Las condiciones del crédito hipotecario dependen de la evaluación de cada
            institución financiera. Cotización generada el {fecha}.
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
