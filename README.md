# Cotizador Web — Mercado Primario

Aplicación web para generación de cotizaciones de compra de propiedades en mercado primario. Desarrollada para corredores de propiedades que operan bajo la marca **VIVEPROP**.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + Tailwind CSS 4.x |
| Lenguaje | TypeScript (strict) |
| Validación | Zod + react-hook-form |
| PDF | @react-pdf/renderer (server-side) |
| Email | Nodemailer (SMTP) |
| Excel | xlsx (importación de datos + exportación historial) |
| DB dev | SQLite (vía ExcelAdapter — archivo INPUT_FILES.xlsx) |
| DB prod | PostgreSQL 15+ |
| Deploy | Next.js `next start` en cualquier entorno Node.js |

---

## Requisitos previos

- Node.js 20+
- Archivo `INPUT_FILES.xlsx` con las hojas: `STOCK NUEVOS`, `CONDICIONES_COMERCIALES`, `PROYECTOS`, `UF`
- (Producción) PostgreSQL 15+ con el schema de `scripts/schema_pg.sql`

---

## Instalación y ejecución

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con los valores reales

# 3. Colocar el archivo de datos en la raíz del proyecto
#    INPUT_FILES.xlsx debe estar en: ./INPUT_FILES.xlsx

# 4. Desarrollo (hot reload)
npm run dev

# 5. Producción
npm run build
npm start -- -p 3003
```

---

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `DATA_SOURCE` | `excel` (dev) o `postgres` (prod) | Sí |
| `DATABASE_URL` | Conexión PostgreSQL (solo si `DATA_SOURCE=postgres`) | Prod |
| `SMTP_HOST` | Servidor SMTP para envío de emails | Opcional |
| `SMTP_PORT` | Puerto SMTP (ej: 587) | Opcional |
| `SMTP_USER` | Usuario SMTP | Opcional |
| `SMTP_PASS` | Contraseña SMTP o app password | Opcional |
| `EMAIL_FROM` | Remitente del email (ej: `"Cotizador <cot@empresa.cl>"`) | Opcional |
| `CMF_API_KEY` | API key CMF Chile para valor UF en tiempo real | Opcional |

> Si `CMF_API_KEY` no está configurado, el sistema usa el último valor de UF disponible en la base de datos.

---

## Carga de datos

### Modo desarrollo (Excel)

Colocar el archivo `INPUT_FILES.xlsx` en la raíz del proyecto. Debe contener las siguientes hojas:

| Hoja | Descripción |
|------|-------------|
| `STOCK NUEVOS` | Inventario de unidades (deptos, estacionamientos, bodegas) |
| `CONDICIONES_COMERCIALES` | Descuentos, bonos pie, cuotas, modalidades por proyecto y tipología |
| `PROYECTOS` | Datos maestros de proyectos (dirección, comuna, tipo entrega) |
| `UF` | Serie histórica de valores UF (desde 1977) |

### Modo producción (PostgreSQL)

```bash
# Crear tablas
psql -d cotizador -f scripts/schema_pg.sql

# Importar datos desde Excel
npm run import:excel
```

---

## Flujo de uso

```
1. Selección de unidad
   └─ Filtros en cascada: Comuna → Entrega → Inmobiliaria → Proyecto → N° Unidad
      (solo muestra opciones con stock disponible — proyectos sin unidades Disponible se ocultan)
   └─ Filtros adicionales: tipo, programa, piso, orientación, superficie
   └─ Agregar unidades adicionales: botón "+ Agregar Unidades" → estacionamiento / bodega
      (aparece al seleccionar un departamento; múltiples unidades posibles)
   └─ Botón "← Volver" disponible en cada paso para editar sin perder datos

2. Datos del cliente y corredor
   └─ Cliente: nombre, RUT (validado mod-11), email, teléfono
   └─ Corredor: nombre/empresa, email, teléfono (todos obligatorios)
   └─ Botón "← Volver a selección de unidad" para corregir la unidad

3. Cotización
   └─ Parámetros editables: % pie, upfront, plazo, tasas CAE, plusvalía, arriendo estimado
   └─ Condiciones comerciales: aporte inmobiliaria, cuotas pie, pie construcción, cuotón, crédito directo
      (controles deshabilitados automáticamente si la condición base = 0)
   └─ Resultado: precios desglosados por unidad, plan de pie, crédito hipotecario,
      3 escenarios CAE, evaluación 5 años
   └─ Botón "← Volver" disponible antes de finalizar
   └─ "Ver Documento" → guarda en historial (irreversible) + muestra cotización
   └─ Acciones post-finalización: Imprimir / Descargar PDF / Enviar por Email
```

---

## Estructura del proyecto

```
cotizador-web-mp/
├── app/
│   ├── page.tsx                    # Página principal (cotizador)
│   ├── historial/page.tsx          # Historial de cotizaciones
│   ├── actions/stock.ts            # Server Actions (datos + cotizaciones)
│   └── api/cotizacion/
│       ├── pdf/route.ts            # POST: genera PDF | GET: recupera PDF del historial
│       ├── email/route.ts          # POST: envía cotización por email
│       └── export/route.ts         # GET: exporta historial a Excel
│
├── components/
│   ├── CotizadorShell.tsx          # Orquestador principal (pasos 1–3)
│   ├── cascade/CascadeSelector.tsx # Selector en cascada + unidades adicionales
│   ├── broker/BrokerForm.tsx       # Formulario cliente + corredor
│   ├── cotizacion/
│   │   ├── PanelCotizacion.tsx     # Panel con parámetros y resultados
│   │   ├── CotizacionTemplate.tsx  # Documento HTML imprimible
│   │   └── CotizacionPDF.tsx       # Documento PDF (@react-pdf/renderer)
│   └── historial/TablaHistorial.tsx # Tabla de cotizaciones con export
│
├── lib/
│   ├── calculators/cotizador.ts    # Motor de cálculo (fórmulas Excel replicadas)
│   ├── config/cotizadorConfig.ts   # Parámetros configurables (CAE, pie, plazos)
│   ├── data/
│   │   ├── types.ts                # StockRow, CondicionComercialRow, UnidadCotizable
│   │   ├── excel-adapter.ts        # Adaptador Excel (desarrollo)
│   │   ├── pg-adapter.ts           # Adaptador PostgreSQL (producción)
│   │   ├── repository.ts           # Interfaz IStockRepository
│   │   └── uf-service.ts           # Valor UF del día (CMF API + fallback)
│   └── services/historial.ts       # Persistencia de cotizaciones (JSON dev / PG prod)
│
├── scripts/
│   ├── schema.sql                  # DDL SQLite (desarrollo)
│   ├── schema_pg.sql               # DDL PostgreSQL (producción)
│   └── import_excel_pg.ts          # Importador Excel → PostgreSQL
│
├── public/
│   └── logo.png                    # Logo VIVEPROP (usado en app + PDF)
│
├── INPUT_FILES.xlsx                # Datos de stock y condiciones (NO versionar en prod)
├── .env.example                    # Plantilla de variables de entorno
└── next.config.ts                  # Configuración Next.js
```

---

## Motor de cálculo

El motor en `lib/calculators/cotizador.ts` replica exactamente las fórmulas del archivo Excel origen. Calcula:

| Sección | Descripción |
|---------|-------------|
| **Precios** | Precio lista, descuento (base + adicional), valor de venta |
| **Pie** | Pie total, reserva, upfront, saldo pie, cuotas pie |
| **Modalidades** | Cuotón (P3.C2), Pie Construcción (P3.C1), Crédito Directo (P3.C3) |
| **Tasación** | `valorVenta × (1−pie) / (1−pie−aporte)` — fórmula Excel maestra Calculadora BP+Mutuo |
| **Crédito hipotecario** | Tasación − pie total pagado a inmobiliaria |
| **Escenarios CAE** | 3 columnas: cuota mensual, flujo neto, flujo acumulado |
| **ROI 5 años** | `(plusvalía capital + flujo acumulado) / equity (pie pagado)` |
| **Cap Rate** | `(arriendo × 11 meses / UF) / tasación` |

### Parámetros editables en UI

- % de Pie: 0% – 40%
- Upfront a la promesa: configurable por inmobiliaria
- Plazo hipotecario: 20, 25 o 30 años
- Tasas CAE: 3 escenarios simultáneos (4.0% / 4.5% / 5.0% / 5.5%)
- Descuento adicional negociado
- Plusvalía anual estimada
- **Descuento adicional:** selector con default pre-cargado desde condiciones comerciales del proyecto
- **Arriendo mensual estimado: 3 valores independientes** (uno por escenario CAE)
- Aporte Inmobiliaria, Cuotas Pie, Pie Construcción, Cuotón, Crédito Directo

> Los controles de condiciones comerciales se deshabilitan automáticamente cuando el valor base de la condición es 0 (ej: si el proyecto no tiene Aporte Inmobiliaria, el selector queda bloqueado en 0%).

### Sección VALORES — desglose por unidad

La tabla de valores muestra una fila individual por cada unidad incluida en la cotización:

| Fila | Descripción |
|------|-------------|
| `Precio Lista Departamento` | Precio lista de la unidad principal |
| `Precio Lista Estacionamiento N°XX` | Por cada estacionamiento agregado |
| `Precio Lista Bodega N°XX` | Por cada bodega agregada |
| `Precio Lista Total` | Suma de todas las unidades |
| `Descuento Venta (X%)` | Solo aplica al departamento |
| `Valor de Venta` | Total post-descuento |

---

## Entregables generados

### Documento en pantalla
Renderizado como HTML imprimible con secciones: Cliente, Corredor, Proyecto, Características, Valores (desglose por unidad), Plan de Pie, Crédito Hipotecario, Escenarios CAE, Evaluación 5 Años.

### PDF descargable
Generado server-side con `@react-pdf/renderer`. Incluye logo VIVEPROP, mismas secciones que el template HTML. Descarga como `cotizacion-COT-YYYY-NNNN.pdf`.

### Email
Envía el PDF adjunto vía SMTP. Destinatarios: corredor (siempre) + cliente (opcional).

---

## Historial de cotizaciones

Disponible en `/historial`. Muestra las últimas 200 cotizaciones con:

- **Click en N° Cotización** → abre el PDF de esa cotización en nueva pestaña
- **Botón Descargar** → exporta todas las cotizaciones a `Historial_cotizaciones.xlsx`

**Persistencia:**
- Modo dev (`DATA_SOURCE=excel`): archivo `.cotizaciones-historial.json` en la raíz (incluido en `.gitignore`)
- Modo prod (`DATA_SOURCE=postgres`): tablas `cotizacion` + `cotizacion_escenario` + `broker`

---

## Modelo de datos

Ver [MODELO_DATOS_COTIZADOR.md](MODELO_DATOS_COTIZADOR.md) para el ERD completo.

Tablas principales:

| Tabla | Descripción |
|-------|-------------|
| `inmobiliaria` | Empresas inmobiliarias |
| `proyecto` | Proyectos con ubicación y tipo de entrega |
| `unidad` | Inventario de unidades (depto, estacionamiento, bodega) |
| `condicion_comercial` | Condiciones por proyecto + tipo + programa |
| `uf_valor` | Serie histórica UF (17.784 registros desde 1977) |
| `broker` | Corredores registrados |
| `cotizacion` | Cotizaciones generadas (snapshots inmutables) |
| `cotizacion_escenario` | 3 escenarios CAE por cotización |

---

## Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo con hot reload (Turbopack)
npm run build        # Build de producción
npm start            # Servidor de producción (default port 3000)
npm run type-check   # Verificación TypeScript sin compilar
npm run import:excel # Importa INPUT_FILES.xlsx → PostgreSQL
```

---

## Consideraciones de seguridad

- `.env.local` e `INPUT_FILES.xlsx` están en `.gitignore` — **nunca versionar**
- `.cotizaciones-historial.json` (modo dev) también en `.gitignore`
- RUTs validados con algoritmo de verificación chileno antes de guardar
- Emails validados con Zod antes de enviar

---

## Licencia

Uso interno VIVEPROP. Todos los derechos reservados.
