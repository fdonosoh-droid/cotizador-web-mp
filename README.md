# Cotizador Mercado Primario — VIVEPROP

Herramienta web interna para cotizar propiedades de mercado primario. Permite seleccionar unidades, evaluar la capacidad financiera del comprador, simular crédito hipotecario en 3 escenarios CAE, y generar cotizaciones en PDF/email.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + TypeScript strict |
| Estilos | Tailwind CSS 4.x + shadcn/ui |
| Datos (dev) | Excel via SheetJS (`INPUT_FILES.xlsx`) |
| Datos (prod) | PostgreSQL 15+ via `postgres` |
| PDF | `@react-pdf/renderer` |
| Email | Nodemailer (SMTP) |
| Formularios | react-hook-form + zod |
| Deploy | Vercel |

---

## Flujos principales

### Flujo estándar
1. **Selección de unidad** — cascada: Comuna → Entrega → Inmobiliaria → Proyecto → N° Unidad
2. **Agregar unidades adicionales** — estacionamientos y bodegas del mismo proyecto
3. **Datos de cliente y corredor** — con validación RUT módulo-11
4. **Cotización** — parámetros editables (pie%, CAE, plazo, plusvalía, arriendo)
5. **Generar documento** — PDF descargable, imprimible, envío por email
6. **Historial** — todas las cotizaciones en `/historial` + exportación Excel

### Flujo perfilamiento
1. Botón **"Perfilar comprador"** abre modal de evaluación financiera (6 pasos)
2. El motor calcula capacidad de compra (rango conservador y optimista en UF)
3. **ModalUnidades** muestra unidades disponibles en el rango con filtros multi-select
4. Al seleccionar, la unidad se carga en paso 1 con opción de agregar adicionales
5. Continúa con flujo estándar desde paso 2

---

## Instalación y ejecución local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# editar .env.local (ver sección Variables)

# 3. Colocar archivo de datos
# Copiar INPUT_FILES.xlsx a la raíz del proyecto

# 4. Ejecutar en desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Variables de entorno

```env
# Fuente de datos: 'excel' (dev) | 'postgres' (prod)
DATA_SOURCE=excel

# PostgreSQL (solo si DATA_SOURCE=postgres)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# SMTP para envío de cotizaciones por email
SMTP_HOST=smtp.ejemplo.com
SMTP_PORT=587
SMTP_USER=usuario@ejemplo.com
SMTP_PASS=contraseña
EMAIL_FROM=cotizador@viveprop.cl
```

---

## Importar datos a PostgreSQL

```bash
# Requiere DATABASE_URL en .env.local
npm run import:excel
```

El script es idempotente (upsert). Importa: programa, inmobiliaria, proyecto, unidad, condicion_comercial, uf_valor, bien_conjunto.

---

## Estructura de archivos clave

```
app/
  page.tsx                    — página principal (inyecta ufDelDia)
  historial/page.tsx          — historial de cotizaciones
  api/cotizacion/
    pdf/route.ts              — genera / regenera PDF
    email/route.ts            — envía cotización por email
    export/route.ts           — descarga historial como Excel
    salvar-excel/route.ts     — agrega fila al Historial_cotizaciones.xlsx

components/
  CotizadorShell.tsx          — orquestador principal (pasos 1→3 + perfilamiento)
  cascade/CascadeSelector.tsx — selector en cascada + unidades adicionales
  broker/BrokerForm.tsx       — formulario cliente + corredor
  cotizacion/
    PanelCotizacion.tsx       — motor UI: parámetros + resultados + acciones
    CotizacionTemplate.tsx    — documento HTML imprimible
    CotizacionPDF.tsx         — documento @react-pdf/renderer
  perfilamiento/
    PerfilamientoModal.tsx    — modal 6 pasos evaluación financiera
    ModalUnidades.tsx         — lista de unidades filtradas por rango
    UnidadesAdicionalesPanel.tsx — panel agregar bodega/estacionamiento
  ui/                         — componentes shadcn/ui (button, input, dialog, etc.)
    currency-input.tsx        — input con formato $xx.xxx.xxx (CLP)

lib/
  calculators/cotizador.ts    — motor de cálculo (precio, pie, PMT, ROI)
  data/
    repository.ts             — interfaz IStockRepository
    excel-adapter.ts          — adaptador ExcelJS (dev)
    pg-adapter.ts             — adaptador PostgreSQL (prod)
  perfilamiento/
    evaluation-engine.ts      — evaluar() — capacidad financiera del comprador
    actions.ts                — buscarUnidadesPorRango() + getAdicionales()
  services/
    historial.ts              — guardar/listar cotizaciones (JSON dev / PG prod)
    email.ts                  — envío SMTP

scripts/
  schema.sql                  — DDL SQLite (dev)
  schema_pg.sql               — DDL PostgreSQL (prod)
  import_excel_pg.ts          — importador Excel → PostgreSQL

Archivos/
  INPUT_FILES.xlsx            — fuente de datos (stock, condiciones, proyectos, UF)

Documentos/
  MAESTRO_DESARROLLO_COTIZADOR.md  — plan de desarrollo y estado detallado
  MODELO_DATOS_COTIZADOR.md        — documentación del modelo de datos
  ERD_COTIZADOR.md                 — diagrama entidad-relación (Mermaid)
  EVALUACIÓN_SCHEMA_DATOS.md       — evaluación técnica del schema inicial
```

---

## Módulo Perfilamiento

El motor de evaluación (`lib/perfilamiento/evaluation-engine.ts`) calcula:

- **Renta efectiva** = líquida + 50% variables + otros (solicitante + co-solicitante)
- **Deuda total** = cuotas + tarjetas + pensiones + otras obligaciones
- **Dividendo máximo** = renta efectiva × 25% − deuda total
- **Crédito máximo** = PMT inverso (dividendo máximo, CAE 5%, 30 años)
- **Propiedad máxima por pie** = pie disponible / piePct (20%)
- **Propiedad máxima por LTV** = crédito máximo / (1 − piePct)
- **Rango** = conservador: min(pie, LTV) · optimista: min(max(pie, LTV), conservador × 1.15)
- **Resultado**: `apto` / `apto_con_condiciones` / `no_apto`

---

## Documentación extendida

Ver [Documentos/MAESTRO_DESARROLLO_COTIZADOR.md](Documentos/MAESTRO_DESARROLLO_COTIZADOR.md) para el plan completo de desarrollo, estado por etapa, preguntas bloqueantes y registro de mejoras.
