'use client'

import React, { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { evaluar, defaultParams, formatCLP, formatUF } from '@/lib/perfilamiento/evaluation-engine'
import { type FormData, initialFormData, type EvaluationOutput } from '@/lib/perfilamiento/types/evaluation'
import { cn } from '@/lib/utils/cn'

// ── Tipos ────────────────────────────────────────────────────────
export interface RangoCapacidad {
  minUF: number   // Math.min(porPie, porLtv) — valor conservador
  maxUF: number   // Math.max(porPie, porLtv) — valor optimista
  creditoMaxCLP: number
  dividendoMaxCLP: number
  resultado: EvaluationOutput['resultado']
}

interface Props {
  open: boolean
  onClose: () => void
  /** Callback que recibe el rango de capacidad para pre-filtrar unidades */
  onConfirmar: (rango: RangoCapacidad) => void
  /** Valor UF del día (inyectado desde el cotizador) */
  ufDelDia: number
}

// ── Constantes de pasos ──────────────────────────────────────────
const PASOS = [
  'Datos personales',
  'Ingresos',
  'Deudas',
  'Ahorro / Pie',
  'Co-solicitante',
  'Resumen',
] as const

const TOTAL_PASOS = PASOS.length

// ── Helper ───────────────────────────────────────────────────────
const num = (v: number | ''): number => (v === '' ? 0 : Number(v))

// ── Componente principal ─────────────────────────────────────────
export default function PerfilamientoModal({ open, onClose, onConfirmar, ufDelDia }: Props) {
  const [paso, setPaso]       = useState(0)
  const [form, setForm]       = useState<FormData>(initialFormData)
  const [eval_, setEval_]     = useState<EvaluationOutput | null>(null)
  const [evaluado, setEvaluado] = useState(false)

  const onChange = (partial: Partial<FormData>) =>
    setForm(prev => ({ ...prev, ...partial }))

  const handleNum = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ [field]: e.target.value === '' ? '' : Number(e.target.value) } as Partial<FormData>)

  // Avanzar / retroceder
  const siguiente = () => {
    if (paso < TOTAL_PASOS - 1) { setPaso(p => p + 1); return }
    // Último paso → evaluar
    const uf = { valor: ufDelDia, fecha: new Date().toISOString(), fuente: 'cotizador' }
    const resultado = evaluar(form, defaultParams, uf)
    setEval_(resultado)
    setEvaluado(true)
  }
  const anterior = () => setPaso(p => Math.max(0, p - 1))

  const handleConfirmar = () => {
    if (!eval_) return
    const porPie = eval_.propiedadMaxPorPieCombinada ?? eval_.propiedadMaxPorPie
    const porLtv = eval_.propiedadMaxPorLtvCombinada ?? eval_.propiedadMaxPorLtv
    onConfirmar({
      minUF:          Math.min(porPie / ufDelDia, porLtv / ufDelDia),
      maxUF:          Math.max(porPie / ufDelDia, porLtv / ufDelDia),
      creditoMaxCLP:  eval_.creditoMaximoCombinado ?? eval_.creditoMaximo,
      dividendoMaxCLP: eval_.dividendoMaximoCombinado ?? eval_.dividendoMaximo,
      resultado:      eval_.resultado,
    })
    handleClose()
  }

  const handleClose = () => {
    setPaso(0)
    setForm(initialFormData)
    setEval_(null)
    setEvaluado(false)
    onClose()
  }

  const pct = ((paso + 1) / TOTAL_PASOS) * 100

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-blue-800">Perfilamiento de comprador</DialogTitle>
          <DialogDescription>
            Evaluamos la capacidad financiera para encontrar unidades adecuadas.
          </DialogDescription>
        </DialogHeader>

        {!evaluado ? (
          <>
            {/* Barra de progreso */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Paso {paso + 1} de {TOTAL_PASOS} — {PASOS[paso]}</span>
                <span>{Math.round(pct)}%</span>
              </div>
              <Progress value={pct} />
            </div>

            {/* Contenido del paso */}
            <div className="min-h-[320px]">
              {paso === 0 && <StepPersonal       data={form} onChange={onChange} handleNum={handleNum} />}
              {paso === 1 && <StepIncome         data={form} handleNum={handleNum} />}
              {paso === 2 && <StepDebts          data={form} onChange={onChange} handleNum={handleNum} />}
              {paso === 3 && <StepSavings        data={form} handleNum={handleNum} />}
              {paso === 4 && <StepComplementary  data={form} onChange={onChange} handleNum={handleNum} />}
              {paso === 5 && <StepSummary        data={form} />}
            </div>

            {/* Navegación */}
            <div className="flex justify-between pt-2 border-t">
              <Button variant="outline" onClick={anterior} disabled={paso === 0}>
                ← Anterior
              </Button>
              <Button onClick={siguiente}>
                {paso === TOTAL_PASOS - 1 ? 'Evaluar capacidad' : 'Siguiente →'}
              </Button>
            </div>
          </>
        ) : (
          <ResultadoEval eval_={eval_!} ufDelDia={ufDelDia} onConfirmar={handleConfirmar} onVolver={() => setEvaluado(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════
// PASOS
// ═══════════════════════════════════════════════════════════════

interface StepProps {
  data: FormData
  onChange: (p: Partial<FormData>) => void
  handleNum: (f: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => void
}

// ── Paso 1: Datos personales ─────────────────────────────────────
function StepPersonal({ data, onChange, handleNum }: StepProps) {
  return (
    <div className="space-y-4">
      <SectionTitle>Datos personales</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nombre completo">
          <Input value={data.nombre} onChange={e => onChange({ nombre: e.target.value })} placeholder="Juan Pérez" />
        </Field>
        <Field label="RUT">
          <Input value={data.rut} onChange={e => onChange({ rut: e.target.value })} placeholder="12.345.678-9" />
        </Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Edad">
          <Input type="number" min={18} max={99} value={data.edad} onChange={handleNum('edad')} placeholder="35" />
        </Field>
        <Field label="Estado civil">
          <Select value={data.estadoCivil} onValueChange={v => onChange({ estadoCivil: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="soltero">Soltero/a</SelectItem>
              <SelectItem value="casado">Casado/a</SelectItem>
              <SelectItem value="divorciado">Divorciado/a</SelectItem>
              <SelectItem value="viudo">Viudo/a</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Dependientes">
          <Input type="number" min={0} value={data.dependientes} onChange={handleNum('dependientes')} placeholder="0" />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Tipo de contrato">
          <Select value={data.tipoContrato} onValueChange={v => onChange({ tipoContrato: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dependiente">Dependiente</SelectItem>
              <SelectItem value="independiente">Independiente</SelectItem>
              <SelectItem value="honorarios">Honorarios</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Antigüedad laboral (meses)">
          <Input type="number" min={0} value={data.antiguedadMeses} onChange={handleNum('antiguedadMeses')} placeholder="24" />
        </Field>
      </div>
    </div>
  )
}

// ── Paso 2: Ingresos ─────────────────────────────────────────────
function StepIncome({ data, handleNum }: Pick<StepProps, 'data' | 'handleNum'>) {
  return (
    <div className="space-y-4">
      <SectionTitle>Ingresos mensuales (CLP)</SectionTitle>
      <Field label="Renta líquida mensual" hint="Sueldo líquido después de descuentos.">
        <Input type="number" min={0} value={data.rentaLiquida} onChange={handleNum('rentaLiquida')} placeholder="1.500.000" />
      </Field>
      <Field label="Ingresos variables (promedio)" hint="Comisiones, bonos. Se considera 50%.">
        <Input type="number" min={0} value={data.ingresosVariables} onChange={handleNum('ingresosVariables')} placeholder="200.000" />
      </Field>
      <Field label="Otros ingresos" hint="Arriendos, pensiones, rentas de capital.">
        <Input type="number" min={0} value={data.otrosIngresos} onChange={handleNum('otrosIngresos')} placeholder="0" />
      </Field>
    </div>
  )
}

// ── Paso 3: Deudas ───────────────────────────────────────────────
function StepDebts({ data, onChange, handleNum }: StepProps) {
  return (
    <div className="space-y-4">
      <SectionTitle>Deudas y obligaciones mensuales (CLP)</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Cuotas de créditos" hint="Consumo, automotriz, etc.">
          <Input type="number" min={0} value={data.cuotasCreditos} onChange={handleNum('cuotasCreditos')} placeholder="0" />
        </Field>
        <Field label="Pago tarjetas de crédito" hint="Pago mínimo o cuota pactada.">
          <Input type="number" min={0} value={data.pagoTarjetas} onChange={handleNum('pagoTarjetas')} placeholder="0" />
        </Field>
        <Field label="Pensiones alimenticias">
          <Input type="number" min={0} value={data.pensiones} onChange={handleNum('pensiones')} placeholder="0" />
        </Field>
        <Field label="Otras obligaciones">
          <Input type="number" min={0} value={data.otrasObligaciones} onChange={handleNum('otrasObligaciones')} placeholder="0" />
        </Field>
      </div>
      <div className="pt-3 border-t space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={data.morosidad}
            onCheckedChange={v => onChange({ morosidad: Boolean(v) })}
          />
          <span className="text-sm font-medium">¿Tiene morosidades o protestos vigentes?</span>
        </label>
        {data.morosidad && (
          <textarea
            className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            value={data.notasMorosidad}
            onChange={e => onChange({ notasMorosidad: e.target.value })}
            placeholder="Describe brevemente la situación..."
          />
        )}
      </div>
    </div>
  )
}

// ── Paso 4: Ahorro ───────────────────────────────────────────────
function StepSavings({ data, handleNum }: Pick<StepProps, 'data' | 'handleNum'>) {
  return (
    <div className="space-y-4">
      <SectionTitle>Ahorro / Pie disponible</SectionTitle>
      <p className="text-sm text-gray-500">Monto total disponible para el pie de la propiedad, en CLP.</p>
      <Field label="Pie disponible (CLP)" hint="Ahorros, subsidios u otros fondos para el pie.">
        <Input type="number" min={0} value={data.pieDisponible} onChange={handleNum('pieDisponible')} placeholder="15.000.000" />
      </Field>
    </div>
  )
}

// ── Paso 5: Co-solicitante ───────────────────────────────────────
function StepComplementary({ data, onChange, handleNum }: StepProps) {
  return (
    <div className="space-y-4">
      <SectionTitle>Co-solicitante (opcional)</SectionTitle>
      <p className="text-sm text-gray-500">Agrega un co-solicitante para aumentar la capacidad de compra.</p>

      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          checked={data.tieneComplementario}
          onCheckedChange={v => onChange({ tieneComplementario: Boolean(v) })}
        />
        <span className="text-sm font-medium">Agregar co-solicitante</span>
      </label>

      {data.tieneComplementario && (
        <div className="space-y-3 pt-3 border-t">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nombre">
              <Input value={data.comp_nombre} onChange={e => onChange({ comp_nombre: e.target.value })} placeholder="María López" />
            </Field>
            <Field label="RUT">
              <Input value={data.comp_rut} onChange={e => onChange({ comp_rut: e.target.value })} placeholder="11.222.333-4" />
            </Field>
          </div>
          <Field label="Relación">
            <Select value={data.comp_relacion} onValueChange={v => onChange({ comp_relacion: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conyuge">Cónyuge</SelectItem>
                <SelectItem value="conviviente">Conviviente civil</SelectItem>
                <SelectItem value="familiar">Familiar directo</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide pt-2">Ingresos del co-solicitante</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Renta líquida">
              <Input type="number" min={0} value={data.comp_rentaLiquida} onChange={handleNum('comp_rentaLiquida')} placeholder="0" />
            </Field>
            <Field label="Variables">
              <Input type="number" min={0} value={data.comp_ingresosVariables} onChange={handleNum('comp_ingresosVariables')} placeholder="0" />
            </Field>
            <Field label="Otros">
              <Input type="number" min={0} value={data.comp_otrosIngresos} onChange={handleNum('comp_otrosIngresos')} placeholder="0" />
            </Field>
          </div>

          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide pt-2">Deudas del co-solicitante</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Cuotas créditos">
              <Input type="number" min={0} value={data.comp_cuotasCreditos} onChange={handleNum('comp_cuotasCreditos')} placeholder="0" />
            </Field>
            <Field label="Pago tarjetas">
              <Input type="number" min={0} value={data.comp_pagoTarjetas} onChange={handleNum('comp_pagoTarjetas')} placeholder="0" />
            </Field>
            <Field label="Pensiones">
              <Input type="number" min={0} value={data.comp_pensiones} onChange={handleNum('comp_pensiones')} placeholder="0" />
            </Field>
            <Field label="Otras oblig.">
              <Input type="number" min={0} value={data.comp_otrasObligaciones} onChange={handleNum('comp_otrasObligaciones')} placeholder="0" />
            </Field>
          </div>
          <Field label="Pie adicional del co-solicitante (CLP)">
            <Input type="number" min={0} value={data.comp_pieDisponible} onChange={handleNum('comp_pieDisponible')} placeholder="0" />
          </Field>
        </div>
      )}
    </div>
  )
}

// ── Paso 6: Resumen ──────────────────────────────────────────────
function StepSummary({ data }: { data: FormData }) {
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between py-1 border-b border-dashed border-gray-200 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{title}</p>
      <div className="bg-gray-50 rounded-lg px-4 py-2">{children}</div>
    </div>
  )

  return (
    <div className="space-y-4">
      <SectionTitle>Resumen de datos</SectionTitle>
      <p className="text-sm text-gray-500">Revisa antes de evaluar.</p>
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
        <Section title="Personal">
          <Row label="Nombre"    value={data.nombre || '—'} />
          <Row label="Edad"      value={data.edad ? `${data.edad} años` : '—'} />
          <Row label="Contrato"  value={data.tipoContrato} />
          <Row label="Antigüedad" value={data.antiguedadMeses ? `${data.antiguedadMeses} meses` : '—'} />
        </Section>
        <Section title="Ingresos mensuales">
          <Row label="Renta líquida"  value={formatCLP(num(data.rentaLiquida))} />
          <Row label="Variables"      value={formatCLP(num(data.ingresosVariables))} />
          <Row label="Otros"          value={formatCLP(num(data.otrosIngresos))} />
        </Section>
        <Section title="Deudas mensuales">
          <Row label="Cuotas créditos" value={formatCLP(num(data.cuotasCreditos))} />
          <Row label="Tarjetas"        value={formatCLP(num(data.pagoTarjetas))} />
          <Row label="Pensiones"       value={formatCLP(num(data.pensiones))} />
          <Row label="Otras"           value={formatCLP(num(data.otrasObligaciones))} />
          <Row label="Morosidad"       value={data.morosidad ? '⚠ Sí' : 'No'} />
        </Section>
        <Section title="Ahorro">
          <Row label="Pie disponible" value={formatCLP(num(data.pieDisponible))} />
        </Section>
        {data.tieneComplementario && (
          <Section title={`Co-solicitante: ${data.comp_nombre || '—'}`}>
            <Row label="Renta líquida"  value={formatCLP(num(data.comp_rentaLiquida))} />
            <Row label="Variables"      value={formatCLP(num(data.comp_ingresosVariables))} />
            <Row label="Pie adicional"  value={formatCLP(num(data.comp_pieDisponible))} />
          </Section>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// RESULTADO
// ═══════════════════════════════════════════════════════════════
function ResultadoEval({
  eval_, ufDelDia, onConfirmar, onVolver,
}: {
  eval_: EvaluationOutput
  ufDelDia: number
  onConfirmar: () => void
  onVolver: () => void
}) {
  const porPie = eval_.propiedadMaxPorPieCombinada ?? eval_.propiedadMaxPorPie
  const porLtv = eval_.propiedadMaxPorLtvCombinada ?? eval_.propiedadMaxPorLtv
  const minCLP = Math.min(porPie, porLtv)
  const maxCLP = Math.max(porPie, porLtv)
  const minUF  = ufDelDia > 0 ? minCLP / ufDelDia : 0
  const maxUF  = ufDelDia > 0 ? maxCLP / ufDelDia : 0

  const apto = eval_.resultado !== 'no_apto'

  const badge = {
    apto:               'bg-green-100 text-green-800 border-green-200',
    apto_con_condiciones: 'bg-amber-100 text-amber-800 border-amber-200',
    no_apto:            'bg-red-100 text-red-800 border-red-200',
  }[eval_.resultado]

  const label = {
    apto:               'Apto',
    apto_con_condiciones: 'Apto con condiciones',
    no_apto:            'No apto',
  }[eval_.resultado]

  return (
    <div className="space-y-5">
      {/* Badge resultado */}
      <div className="flex items-center gap-3">
        <span className={cn('px-3 py-1 rounded-full text-sm font-semibold border', badge)}>
          {label}
        </span>
      </div>

      {/* Razones */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-1">
        {eval_.razones.map((r, i) => (
          <p key={i} className="text-sm text-gray-700">• {r}</p>
        ))}
      </div>

      {/* Capacidad de compra */}
      {apto && (
        <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-800">Capacidad de compra estimada</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 text-center border border-blue-100">
              <p className="text-xs text-gray-500 mb-1">Rango conservador</p>
              <p className="font-bold text-blue-800">{Math.round(minUF).toLocaleString('es-CL')} UF</p>
              <p className="text-xs text-gray-400">{formatCLP(minCLP)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center border border-blue-100">
              <p className="text-xs text-gray-500 mb-1">Rango optimista</p>
              <p className="font-bold text-blue-800">{Math.round(maxUF).toLocaleString('es-CL')} UF</p>
              <p className="text-xs text-gray-400">{formatCLP(maxCLP)}</p>
            </div>
          </div>
          <div className="text-xs text-gray-500 space-y-0.5">
            <p>• Dividendo máx: {formatCLP(eval_.dividendoMaximoCombinado ?? eval_.dividendoMaximo)}/mes</p>
            <p>• Crédito máx: {formatCLP(eval_.creditoMaximoCombinado ?? eval_.creditoMaximo)}</p>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex justify-between pt-2 border-t">
        <Button variant="outline" onClick={onVolver}>← Volver</Button>
        {apto ? (
          <Button onClick={onConfirmar} className="bg-blue-700 hover:bg-blue-800">
            Buscar unidades en este rango →
          </Button>
        ) : (
          <Button variant="secondary" onClick={onVolver}>Revisar datos</Button>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Sub-componentes UI internos
// ═══════════════════════════════════════════════════════════════
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-gray-800">{children}</h2>
}

function Field({
  label, hint, children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}
