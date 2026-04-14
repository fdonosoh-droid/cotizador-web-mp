# MAESTRO DE DESARROLLO — COTIZADOR WEB MERCADO PRIMARIO

<!-- META_START -->
| Campo | Valor |
|---|---|
| **Última actualización** | <!-- LAST_UPDATED -->2026-04-14<!-- /LAST_UPDATED --> |
| **Último commit** | <!-- COMMIT_HASH -->557ba8f<!-- /COMMIT_HASH --> — <!-- COMMIT_MSG -->fix: limitar rango optimista a máximo +15% sobre rango conservador<!-- /COMMIT_MSG --> |
| **Branch** | <!-- BRANCH -->main<!-- /BRANCH --> |
| **Progreso general** | <!-- PROGRESS -->Etapas 0–7 completadas · Módulo Perfilamiento completo · Mejoras post-lanzamiento M1–M29 aplicadas<!-- /PROGRESS --> |
<!-- META_END -->

---

## RESUMEN DE ESTADO POR ETAPA

| # | Etapa | Substages | Estado |
|---|---|---|---|
| 0 | Correcciones al modelo de datos (schema.sql) | 0.1 → 0.4 | ✅ COMPLETADO — ES.1-ES.4 + fix id_condicion nullable |
| 1 | Infraestructura de datos y stock | 1.1 → 1.5 | ✅ COMPLETADO — ExcelAdapter + PgAdapter + import script · P1.3 y P1.5 respondidas |
| 2 | Selección en cascada (Comuna→Entrega→Inmobiliaria→Proyecto→Unidad) | 2.1 → 2.6 | ✅ COMPLETADO — CascadeSelector + BrokerForm implementados |
| 3 | Precios, descuentos y bono pie | 3.1 → 3.6 | ✅ COMPLETADO — motor de cálculo implementado (3.1–3.5 ✅, 3.6 ✅ parcial) |
| 4 | Plan de pago y estructura del pie | 4.1 → 4.5 | ✅ COMPLETADO — implementado en cotizador.ts (casos estándar) · P3.C1–C3 pendientes (modalidades especiales) |
| 5 | Simulación hipotecaria y flujo | 5.1 → 5.3 | ✅ COMPLETADO — PMT 3 escenarios CAE, flujo mensual en cotizador.ts · amortización detallada pendiente |
| 6 | Evaluación de inversión a 5 años | 6.1 → 6.4 | ✅ COMPLETADO — plusvalía, ROI, cap rate en cotizador.ts · factor LTV 0.67 pendiente confirmación |
| 7 | Output, PDF y cotización final | 7.1 → 7.4 | ✅ COMPLETADO — 7.1 HTML ✅ · 7.2 PDF ✅ · 7.3 Email ✅ · 7.4 Historial ✅ |
| 8 | Módulo Perfilamiento de comprador | P1 → P4 | ✅ COMPLETADO — Motor evaluación · Modal 6 pasos · Búsqueda por rango · Integración CotizadorShell |

---

## PREGUNTAS BLOQUEANTES PENDIENTES DE RESPUESTA

> Las siguientes preguntas deben resolverse antes de iniciar las etapas indicadas.
> Marcar con [x] cuando estén respondidas y documentadas.

### Bloque A — Datos y stock (bloquea Etapa 1)
- [x] **P1.1** ¿El stock se carga desde Excel manual, base de datos o API? ¿Frecuencia de actualización?
  > **Respondida:** Fuente inicial = **Excel (INPUT_FILES.xlsx)**, hojas: STOCK NUEVOS, CONDICIONES_COMERCIALES, PROYECTOS, UF, aux. Fase producción = **PostgreSQL** (migración). Schema SQLite en `schema.sql` (dev), PostgreSQL en `schema_pg.sql` (prod). Actualización: carga manual.
- [ ] **P1.2** ¿Qué estados de stock existen además de "Disponible" y "Arrendado"? ¿Cuáles permiten cotizar?
- [x] **P1.3** ¿Estacionamiento y Bodega se cotizan solo como añadido a un depto, o también como unidades independientes?
  > **Respondida:** Solo como **bien conjunto obligatorio o complementario** a un departamento. No se cotizan como unidades independientes. La lógica actual de `getBienesConjuntos()` ya refleja esto correctamente.
- [x] **P1.4** ¿Se usa API externa para el valor UF (CMF/Mindicador) o el archivo Excel? ¿Qué pasa si falla?
  > **Respondida:** Fase inicial = **hoja UF de INPUT_FILES.xlsx** (17.784 registros diarios 1977→2026, carga masiva única). Fase producción = API CMF (`api.cmfchile.cl`) con actualización diaria. Fallback: último valor registrado en tabla `uf_valor`.

### Bloque B — Selección (bloquea Etapa 2)
- [x] **P2.1** ¿La jerarquía de selección es siempre Inmobiliaria → Proyecto → Unidad, o hay flujos alternativos?
  > **Respondida:** El orden es **Comuna → Entrega Aprox → Inmobiliaria → Proyecto → N° Unidad** (ver REGLAS 2.1–3.2). Cada filtro depende de todos los anteriores.
- [ ] **P2.2** ¿El usuario puede filtrar unidades por tipología, orientación, piso, precio antes de seleccionar?
- [x] **P2.3** ¿El campo BIENES CONJUNTOS indica que estac/bodega está incluido en el precio lista del depto?
  > **Respondida:** BIENES CONJUNTOS significa que la compra del estacionamiento/bodega indicado es **obligatoria** junto con el depto. **No están incluidos** en el precio lista del depto — se suman con su propio precio. El valor se obtiene buscando la unidad asociada en STOCK NUEVOS por número de unidad (formato "B - 64" = Bodega nro 64).

### Bloque C — Precios críticos (bloquea Etapa 3 completa)
- [x] **P3.A1** ¿El descuento aplica solo al departamento o puede aplicar al total (depto+estac+bodega)?
  > **Respondida (por Excel COTIZADOR E36):** El descuento aplica **solo al departamento**. Estacionamiento y bodega se suman sin descuento.
- [ ] **P3.A2** ¿El descuento siempre es porcentaje o puede ser un monto fijo en UF?
- [ ] **P3.A3** ¿Puede acumularse descuento del stock + descuento negociado adicional? ¿Quién autoriza?
- [x] **P3.B1** ¿El Bono Pie es aporte al banco (eleva tasación) o subsidio directo al pie del cliente?
  > **Respondida:** El Bono Pie **eleva el valor de compraventa ante el banco** (tasación), reduciendo el LTV que el banco percibe. Fórmula (del Excel COTIZADOR): `tasacion = credito_hip_base / (1 - pie_pct - bono_pie_pct)`. El banco ve un LTV de `(1-pie_pct-bono_pie_pct)` sobre la tasación, pero financia el mismo monto en UF (`valor_venta*(1-pie_pct)`).
- [ ] **P3.B2** Para INGEVEC (DESCUENTO=0%, BONO PIE=15%): ¿cómo se calcula el valor de venta y el valor a financiar?
- [ ] **P3.B3** ¿Bono Pie y Descuento pueden coexistir activamente en la misma unidad? (MAESTRA los tiene ambos)
- [ ] **P3.B4** ¿El banco tasa el inmueble al precio lista, al precio con descuento, o a otro valor? ¿El Bono Pie cambia esa base?
- [x] **P3.B5** Jerarquía cuando coexisten Descuento + Bono Pie: ¿cuál se aplica primero y sobre qué base?
  > **Respondida:** Se aplica **primero el descuento** al precio lista del depto → luego el **Bono Pie se calcula sobre el valor post-descuento** (valor_venta). Orden: precio_lista → aplicar descuento → valor_venta → calcular tasación con bono_pie.

### Bloque D — Plan de pago (bloquea Etapa 4)
- [x] **P3.C1** ¿"Pie Período Construcción" reemplaza al pie estándar para proyectos "En Construcción", o se suma?
  > **Respondida:** **Se suma** al pie estándar (no lo reemplaza). Porcentaje predefinido por inmobiliaria; cuotas decrecen mensualmente según avance de obra. Implementado en Camino B del cotizador.
- [x] **P3.C2** ¿Qué es el CUOTÓN (INGEVEC=2%)? ¿En qué hito del flujo se paga?
  > **Respondida:** Pago único adicional **a la inmobiliaria** (no al banco), pagado en promesa o escritura. Reduce el crédito hipotecario final. INGEVEC usa 2%. Implementado en Camino B.
- [x] **P3.C3** ¿Qué es PIE CRÉDITO DIRECTO? ¿Genera un plan de pago completamente diferente?
  > **Respondida:** La inmobiliaria financia directamente un porcentaje del valor. Tiene plan propio (% + plazo) y puede coexistir con el crédito hipotecario bancario. Implementado en Camino B.
- [ ] **P3.D1** INGEVEC tiene CUOTAS PIE=1 (pago único). ¿Cuándo se paga esa cuota?
- [ ] **P3.D2** ¿Las cuotas del pie son siempre mensuales e iguales, o pueden ser irregulares?
- [ ] **P4.1** ¿La Reserva es siempre $100.000 CLP o varía por proyecto/inmobiliaria? ¿Puede ser en UF?
- [ ] **P4.2** ¿El Upfront a la Promesa (2%) es fijo para todas las inmobiliarias o varía?
- [ ] **P4.3** ¿Existen hitos de pago adicionales (firma escritura, entrega llaves)? ¿Varían por inmobiliaria?
- [ ] **P4.4** ¿El Upfront es parte de las cuotas del pie o es un pago separado previo?

### Bloque E — Simulación (bloquea Etapa 5)
- [ ] **P5.1** ¿Los 3 escenarios de CAE son fijos (4%, 4.5%, 5%) o el broker puede cambiarlos?
- [ ] **P5.2** ¿El plazo de 30 años aplica a todas las inmobiliarias o hay restricciones?
- [ ] **P5.3** ¿La base del PMT es siempre Total_Descuento - Pie, o puede ser el CH_ajustado sobre tasación?

### Bloque F — Output (bloquea Etapa 7)
- [x] **P6.1** ¿Qué formato tiene la cotización final: PDF, pantalla imprimible, email, todo?
  > **Respondida:** Todos los formatos. Pantalla imprimible ✅ · PDF descargable ✅ · Envío por email ✅ (SMTP/nodemailer).
- [ ] **P6.2** ¿Se muestran los 3 escenarios CAE juntos o el broker elige uno?
- [x] **P6.3** ¿Debe registrarse quién generó cada cotización y cuándo (historial)?
  > **Respondida:** Sí. Implementado en `lib/services/historial.ts` + `TablaHistorial` + página `/historial`.
- [ ] **P6.4** ¿La cotización requiere aprobación antes de enviarse al cliente?

### Bloque G — Correcciones al schema (bloquea Etapa 0 completa)

> Decisiones técnicas requeridas antes de aplicar correcciones al `schema.sql`.
> Identificadas en [EVALUACIÓN_SCHEMA_DATOS.md](EVALUACIÓN_SCHEMA_DATOS.md) (2026-03-24).

- [x] **ES.1** ¿Se crea tabla maestra `programa` o se define un CHECK constraint? *(bloquea 0.1 → problema C2)*
  > **Respondida:** Opción A — tabla maestra `programa` con FK en `unidad` y `condicion_comercial`. Implementado en schema.sql v2 + schema_pg.sql v2.
- [x] **ES.2** ¿Los escenarios CAE se normalizan en tabla hija? *(bloquea 0.2 → problema I1)*
  > **Respondida:** Opción A — tabla `cotizacion_escenario` normaliza los 3 escenarios. Implementado.
- [x] **ES.3** ¿Se agrega `modalidad_pago` a `condicion_comercial`? *(bloquea 0.3 → mejora M1)*
  > **Respondida:** Opción A — campo `modalidad_pago TEXT CHECK(ESTANDAR|CONSTRUCCION|CREDITO_DIRECTO)`. Implementado.
- [x] **ES.4** ¿Se implementa la entidad `broker`? *(bloquea 0.4 → problema I4)*
  > **Respondida:** Opción A — entidad `broker` con FK en `cotizacion`. Upsert por RUT en servicio historial. Implementado.

---

## ETAPA 0 — CORRECCIONES AL MODELO DE DATOS

> **Objetivo:** Aplicar las correcciones identificadas en la evaluación de `schema.sql` antes de iniciar el desarrollo de las etapas funcionales. Garantiza integridad del histórico de cotizaciones, confiabilidad de joins y consistencia de tipos de datos.
> **Referencia:** [EVALUACIÓN_SCHEMA_DATOS.md](EVALUACIÓN_SCHEMA_DATOS.md)
> **Prerrequisito:** Respuestas a ES.1–ES.4.

---

### 0.1 — Correcciones críticas: snapshot y join de programa
<!-- SUBSTAGE:0.1 -->
**Estado:** `✅ COMPLETADO`
**Archivos modificados:** `scripts/schema.sql` · `scripts/schema_pg.sql`
**Implementado:**
- **C1** — Snapshot completo en `cotizacion`: descuento, bono_pie, cuoton, pie_periodo_constr, pie_credito_directo, reserva, modalidad_pago
- **C2** — Tabla maestra `programa` con FK en `unidad` y `condicion_comercial` (ES.1 ✅)
- Vista `v_stock_cotizable` actualizada con JOIN a `programa` y exposición de `id_condicion`
- Fix: `cotizacion.id_condicion` → NULL permitido (unidad puede no tener condición activa)
<!-- /SUBSTAGE -->

---

### 0.2 — Normalización de datos: dormitorios y tipo_unidad
<!-- SUBSTAGE:0.2 -->
**Estado:** `✅ COMPLETADO`
**Implementado:**
- **I2** — `dormitorios_num INTEGER` + `dormitorios_display TEXT` en schema y ExcelAdapter
- **I3** — CHECK constraint con 5 valores canónicos en `unidad.tipo_unidad`; import script normaliza con `TIPO_MAP`
- **M3** — `bienes_conjuntos` marcado como campo de trazabilidad (solo importación); lógica de negocio usa tabla `bien_conjunto`
<!-- /SUBSTAGE -->

---

### 0.3 — Corrección estructural: escenarios CAE y modalidad de pago
<!-- SUBSTAGE:0.3 -->
**Estado:** `✅ COMPLETADO`
**Implementado:**
- **I1** — Tabla `cotizacion_escenario` normaliza los 3 escenarios CAE (ES.2 ✅)
- **M1** — Campo `modalidad_pago TEXT CHECK` en `condicion_comercial` (ES.3 ✅); inferido al importar desde Excel
<!-- /SUBSTAGE -->

---

### 0.4 — Entidad Broker
<!-- SUBSTAGE:0.4 -->
**Estado:** `✅ COMPLETADO`
**Implementado:**
- **I4** — Tabla `broker (id_broker, nombre, rut, email, telefono, empresa, activo)` (ES.4 ✅)
- FK `cotizacion.id_broker` reemplaza `nombre_broker TEXT`
- Upsert por RUT en `lib/services/historial.ts` (`_guardarPG`)
<!-- /SUBSTAGE -->

---

## ETAPA 1 — INFRAESTRUCTURA DE DATOS Y STOCK

> **Objetivo:** Disponer de los datos del stock, la UF y los parámetros de configuración listos para ser consumidos por el cotizador.
> **Prerrequisito:** Respuestas a P1.1, P1.2, P1.3, P1.4.

---

### 1.1 — Modelo de datos del stock
<!-- SUBSTAGE:1.1 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** `src/models/stock.ts` | `src/types/stock.ts`
**Preguntas bloqueantes:** P1.1, P1.2, P1.3 + **Etapa 0.2 completada** (I2: dormitorios_num, I3: tipo_unidad canónico)
**Descripción:** Definir el schema/tipo del objeto Unidad con todos los campos de STOCK NUEVOS.
**Faltantes para completar:**
- [ ] Completar substage 0.2 antes de definir tipos (dormitorios_num, tipo_unidad canónico)
- [ ] Confirmar campos obligatorios vs opcionales por inmobiliaria
- [ ] Definir tipos de datos (SUPERFICIE UTIL viene como texto con coma decimal → normalizar)
- [ ] Definir enum de ESTADO STOCK (Disponible, Arrendado, ¿otros?)
- [ ] Definir enum de TIPO ENTREGA (Entrega Inmediata, En Construcción)
- [ ] Respuesta a P1.3 sobre estacionamiento/bodega independientes
<!-- /SUBSTAGE -->

---

### 1.2 — Carga y normalización del stock
<!-- SUBSTAGE:1.2 -->
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `lib/data/types.ts` — tipos TypeScript: StockRow, CondicionComercialRow, ProyectoRow, UnidadCotizable, UFRow
- `lib/data/repository.ts` — interfaz IStockRepository (getComunas, getEntregas, getInmobiliarias, getProyectos, getUnidades, getUFdelDia)
- `lib/data/excel-adapter.ts` — ExcelAdapter: parsea las 4 hojas de INPUT_FILES.xlsx con SheetJS, singleton cacheado, join stock+condiciones, split dormitorios
- `lib/data/index.ts` — exporta `stockRepository = new ExcelAdapter()`
**Notas de implementación:**
- Columnas con tildes mapeadas con escapes unicode (`BA\u00d1OS`, `CUOT\u00d3N`, etc.)
- `parseNum()` maneja texto con coma (`'43,35'` → `43.35`) y `#N/A`
- `parseDormitorios()` convierte `'1-1/2'` → `{ dormitoriosNum: 1.5, dormitoriosDisplay: '1-1/2' }`
- `PgAdapter` pendiente para Etapa de producción (fase 2)
- **Fix 2026-03-31:** `availableNemos()` — helper privado que construye un `Set<string>` de nemotécnicos con al menos una unidad `Disponible`. Todos los métodos del cascada (`getComunas`, `getEntregas`, `getInmobiliarias`, `getProyectos`) filtran contra este set → elimina proyectos/inmobiliarias fantasma que aparecían en los selects sin tener unidades disponibles.
<!-- /SUBSTAGE -->

---

### 1.3 — Servicio de valor UF
<!-- SUBSTAGE:1.3 -->
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `lib/data/uf-service.ts` — `getUFdelDia()` con caché en memoria por día, `formatUF()`, `formatCLP()`, `ufToCLP()`
**Notas de implementación:**
- Caché diario en memoria (se limpia al reiniciar servidor)
- Fallback automático: si no hay registro del día → usa el último disponible en el archivo
- Fase producción: reemplazar `stockRepository.getUFdelDia()` por llamada a API CMF
<!-- /SUBSTAGE -->

---

### 1.4 — Tablas de configuración (parámetros)
<!-- SUBSTAGE:1.4 -->
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `lib/config/cotizadorConfig.ts` — CAE_OPTIONS, PIE_OPTIONS, PLAZO_OPTIONS, CONSTANTES, DEFAULTS
- `getReglaInmobiliaria(alianza, reglas)` — carga reglas por inmobiliaria desde Excel; fallback hardcoded
- `getParamNum(parametros, nombre, fallback)` — extrae parámetro numérico de la lista Excel
**Hojas Excel (INPUT_FILES.xlsx):**
- `REGLAS_INMOBILIARIAS` — columnas: ALIANZA, TIPO_CALCULO_BONO, LTV_MAX_PCT, PIE_CONJUNTOS_PCT, DESCRIPCION_BONO_PIE
- `PARAMETROS_CALCULO` — columnas: PARAMETRO, VALOR, TIPO, DESCRIPCION (15 parámetros del motor)
<!-- /SUBSTAGE -->

---

### 1.5 — Estructura de datos de inmobiliarias y proyectos
<!-- SUBSTAGE:1.5 -->
**Estado:** `✅ COMPLETADO`
**Archivos:** `lib/data/excel-adapter.ts` · `lib/data/pg-adapter.ts` · `lib/data/types.ts`
**Implementado:**
- Reglas comerciales por inmobiliaria vienen 100% del Excel (hoja CONDICIONES_COMERCIALES): descuento, bono_pie, cuotas_pie, pie_periodo_construccion, cuoton, pie_credito_directo
- No hay config adicional por inmobiliaria fuera del Excel — confirmado (P1.5: actualización = carga manual Excel)
- INGEVEC (descuento=0, bono=15%) y MAESTRA (descuento=10%, bono=10%) ambos cubiertos por el modelo paramétrico de `calcularCotizacion()`
- Estacionamiento/Bodega solo como bien conjunto obligatorio al depto — nunca unidades independientes (P1.3 ✅)
- Actualización del stock: carga manual Excel (`INPUT_FILES.xlsx`) → en producción `scripts/import_excel_pg.ts`
<!-- /SUBSTAGE -->

---

## ETAPA 2 — SELECCIÓN EN CASCADA

> **Objetivo:** UI de selección encadenada **Comuna → Entrega Aprox → Inmobiliaria → Proyecto → N° Unidad**. Cada dropdown se recarga al cambiar el anterior. La selección de N° Unidad dispara el auto-completado de todas las características de la propiedad.
> **Prerrequisito:** Etapa 1 completa. Respuesta P2.1 ✅ (respondida). Respuestas P2.2, P2.3 pendientes.
> **Reglas de referencia:** REGLAS_COTIZADOR.xlsx — Sección 2 (2.1–2.4) y Sección 3 (3.1–3.2).

---

### 2.1 — Selector de Comuna
<!-- SUBSTAGE:2.1 -->
**Estado:** `✅ COMPLETADO` (implementado como parte de CascadeSelector)
**Archivos creados:** `components/cascade/CascadeSelector.tsx`
<!-- /SUBSTAGE -->

---

### 2.2 — Selector de Entrega Aprox.
<!-- SUBSTAGE:2.2 -->
**Estado:** `✅ COMPLETADO` (implementado como parte de CascadeSelector)
<!-- /SUBSTAGE -->

---

### 2.3 — Selector de Inmobiliaria
<!-- SUBSTAGE:2.3 -->
**Estado:** `✅ COMPLETADO` (implementado como parte de CascadeSelector)
<!-- /SUBSTAGE -->

---

### 2.4 — Selector de Proyecto
<!-- SUBSTAGE:2.4 -->
**Estado:** `✅ COMPLETADO` (implementado como parte de CascadeSelector)
<!-- /SUBSTAGE -->

---

### 2.5 — Selector de N° Unidad y auto-completado
<!-- SUBSTAGE:2.5 -->
**Estado:** `✅ COMPLETADO` (incluido en CascadeSelector — Paso 5 N°Unidad)
**Notas:** Implementado en `components/cascade/CascadeSelector.tsx`. Filtra unidades con `estadoStock='Disponible'`. El resumen de unidad seleccionada (precio, tipología, m²) se muestra en `CotizadorShell`. BIENES CONJUNTOS (P2.3) pendiente de definición para Etapa 3.
<!-- /SUBSTAGE -->

---

### 2.6 — Formulario de datos del broker/cliente
<!-- SUBSTAGE:2.6 -->
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `lib/utils/rut.ts` — `validateRut()`, `formatRut()`, `cleanRut()`, `calcDV()`
- `components/broker/BrokerForm.tsx` — formulario con validación zod
**Campos del formulario:**
- **Cliente:** nombre, RUT (validación módulo-11), email, teléfono (opcional)
- **Corredor (obligatorios):** nombre/empresa, emailCorredor, telefonoCorredor — en grid de 3 columnas
**Notas:** RUT se valida con algoritmo módulo-11 estándar chileno. Auto-formato al perder foco (blur).
<!-- /SUBSTAGE -->

---

## ETAPA 3 — PRECIOS, DESCUENTOS Y BONO PIE

> **Objetivo:** Calcular correctamente el precio de venta y el valor base para el crédito hipotecario, para cada inmobiliaria.
> **Prerrequisito:** Etapa 2 completa. **TODAS las preguntas del Bloque C y D deben estar respondidas.**
> ⚠️ **Esta etapa está completamente bloqueada hasta responder P3.B1, P3.B2, P3.B4 y P3.B5.**

---

### 3.1–3.5 — Motor de cálculo (precio, descuento, bono pie, tasación, PMT)
<!-- SUBSTAGE:3.1 -->
<!-- SUBSTAGE:3.2 -->
<!-- SUBSTAGE:3.3 -->
<!-- SUBSTAGE:3.4 -->
<!-- SUBSTAGE:3.5 -->
**Estado:** `✅ COMPLETADO`
**Archivos:**
- `lib/calculators/cotizador.ts` — función `calcularCotizacion(input)` con todo el pipeline:
  - Precios lista: `precioListaDepto` (depto) + `preciosConjuntos[]` (unidades adicionales seleccionadas manualmente)
  - Descuento solo al depto (P3.A1 ✅)
  - Valor de venta = depto_desc + conjuntos (P3.B5 ✅: descuento primero)
  - Pie total, Reserva, Upfront (2%), Saldo Pie, Cuotas Pie (60 meses)
  - Tasación = valorVenta + bonoPie (P3.B1 ✅: eleva compraventa banco)
  - 3 escenarios CAE: PMT mensual CLP/UF, flujo mensual/acumulado 5 años
  - Evaluación 5 años: plusvalía, precio venta año 5 (haircut 95%), ROI 5 años, ROI anual, Cap Rate
- `components/cotizacion/PanelCotizacion.tsx` — UI completa con parámetros editables y tablas de resultado
**Fórmulas verificadas celda a celda** contra `INPUT_FILES.xlsx → hoja COTIZADOR`.
**Cambios 2026-03-31:**
- Eliminado `getBienesConjuntos()` del flujo del cotizador — el campo `bienesConjuntos` del stock era referencia, no se consumía automáticamente.
- `preciosConjuntos` ahora se alimenta exclusivamente desde `unidadesAdicionales` (selección manual vía "Agregar Unidades" en CascadeSelector).
- `ResultadoCotizacion.precioListaOtros` sigue siendo la suma; los detalles por unidad se muestran desde el array `unidadesAdicionales` en los templates.
**Corrección 2026-04-01 — Fórmula tasación/aporte inmobiliaria (Excel maestra Calculadora BP+Mutuo):**
- **Antes (incorrecto):** `bonoPieUF = valorVentaUF × bonoPiePct` → `tasacionUF = valorVentaUF + bonoPieUF`. El % se aplicaba sobre el valor de venta → columna % mostraba 9.1% en lugar de 10%.
- **Ahora (correcto, según celdas D31/D33/D35/D36 de Excel maestra):**
  ```
  chPct       = 1 − piePct − bonoPiePct               // D33: fracción CH puro
  tasacionUF  = valorVenta × (1−pie) / chPct           // D35: tasación despejada
  bonoPieUF   = tasacionUF × bonoPiePct                // D36: aporte en UF
  ```
- El % del aporte se aplica sobre la **tasación** (no sobre el valor de venta) → label (10%) y columna % ahora son consistentes.
- Sin bono pie: `tasacionUF = valorVentaUF` (sin cambio).
<!-- /SUBSTAGE -->

---

### 3.6 — Matriz de reglas por inmobiliaria
<!-- SUBSTAGE:3.6 -->
**Estado:** `✅ COMPLETADO`
**Implementado:**
- `tipoCalculoBono: 'maestra' | 'precio-lista-depto' | 'precio-lista-total'` en `InputCotizacion`
- `ltvMaxPct: number` — 0.80 para Maestra (LTV 80%), 1.0 para el resto
- `pieConjuntosPct?: number` — % de pie para bienes conjuntos; Maestra usa `piePct` (igual que depto)
- Reglas cargadas dinámicamente desde hoja `REGLAS_INMOBILIARIAS` de INPUT_FILES.xlsx
- `PanelCotizacion` llama `getReglasInmobiliarias()` en cada cotización y pasa regla al motor
**Reglas por inmobiliaria:**

| Inmobiliaria | tipoCalculoBono | LTV | Pie Conjuntos |
|---|---|---|---|
| MAESTRA | `maestra` | 80% | igual que depto (piePct) |
| INGEVEC | `precio-lista-depto` | 100% | 20% fijo |
| URMENETA | `precio-lista-total` | 100% | 20% fijo |
| Resto | `precio-lista-depto` | 100% | 20% fijo |

**Fórmulas por tipo:**
- **Maestra:** `tasación = valorVenta×(1−pie)/(1−pie−bono)` · `CH = tasación×80%` · `aporte = tasación−pie−CH`
- **precio-lista-depto:** `bonoPieUF = precioListaDepto×bono%` · `CH = valorVenta−pieTotalUF−aporte`
- **precio-lista-total:** `bonoPieUF = precioListaTotal×bono%` · `CH = valorVenta−pieTotalUF−aporte`
<!-- /SUBSTAGE -->

---

## ETAPA 4 — PLAN DE PAGO Y ESTRUCTURA DEL PIE

> **Objetivo:** Calcular la estructura completa del pie: reserva, upfront, saldo, cuotas.
> **Prerrequisito:** Etapa 3 completa. Respuestas a P4.1–P4.4 y P3.C1–P3.D2.

---

### 4.1 — Pie total y porcentaje de pie
<!-- SUBSTAGE:4.1 -->
**Estado:** `✅ COMPLETADO` (caso estándar implementado en `lib/calculators/cotizador.ts`)
**Implementado:**
- `pieTotalUF = valorVentaUF * piePct` [E40]
- Selector de pie% en UI (5%–40% de a 5%) en `PanelCotizacion.tsx`
- P3.C1 (PIE PERÍODO CONSTRUCCIÓN) pendiente para modalidad especial
<!-- /SUBSTAGE -->

---

### 4.2 — Reserva
<!-- SUBSTAGE:4.2 -->
**Estado:** `✅ COMPLETADO` (implementado; P4.1 respuesta pendiente pero el motor funciona con el valor del stock)
**Implementado:**
- `reservaUF = reservaCLP / valorUF` [E41]
- `reservaCLP` se lee de `unidad.reserva` del stock
- P4.1: si la reserva puede estar en UF, se requiere ajuste menor
<!-- /SUBSTAGE -->

---

### 4.3 — Upfront a la Promesa
<!-- SUBSTAGE:4.3 -->
**Estado:** `✅ COMPLETADO` (implementado; confirmación P4.2 pendiente)
**Implementado:**
- `upfrontUF = round(valorVentaUF * 0.02, 2)` [E42] — 2% fijo (constante en `cotizadorConfig.ts`)
- P4.2: si varía por inmobiliaria, se parametriza desde `CondicionComercialRow`
<!-- /SUBSTAGE -->

---

### 4.4 — Saldo pie, cuotas y plan de pago
<!-- SUBSTAGE:4.4 -->
**Estado:** `✅ COMPLETADO` (caso estándar implementado; modalidades especiales pendientes)
**Implementado:**
- `saldoPieUF = pieTotalUF - reservaUF - upfrontUF` [E43]
- `cuotasPieN = 60` · `valorCuotaPieUF = saldoPieUF / 60` [E58]
- Para INGEVEC (cuotas=1): el motor calcula 1 cuota → correcto aritméticamente
**Pendiente:**
- P3.D1: ¿cuándo se paga la cuota única de INGEVEC?
- P3.C2: CUOTÓN (pago especial 2% INGEVEC)
- P4.3: hitos adicionales de pago
<!-- /SUBSTAGE -->

---

### 4.5 — Crédito hipotecario sobre precio de venta
<!-- SUBSTAGE:4.5 -->
**Estado:** `✅ COMPLETADO` (implementado; P5.3 pendiente pero motor funciona)
**Implementado:**
- `creditoHipFinalUF = valorVentaUF - piePagadoUF` [E60]
- Base del PMT = `creditoHipFinalUF * valorUF` (CLP)
- P5.3: si la base es ch_ajustado en lugar de ch_final, se ajusta el input del PMT
<!-- /SUBSTAGE -->

---

## ETAPA 5 — SIMULACIÓN HIPOTECARIA Y FLUJO

> **Objetivo:** Calcular cuotas mensuales del crédito para 3 escenarios de CAE, y el flujo arriendo vs cuota.
> **Prerrequisito:** Etapa 4 completa. Respuestas a P5.1, P5.2, P5.3.

---

### 5.1 — Cálculo de cuota hipotecaria (PMT) — 3 escenarios
<!-- SUBSTAGE:5.1 -->
**Estado:** `✅ COMPLETADO` (implementado en `lib/calculators/cotizador.ts`)
**Implementado:**
- `pmt(tasa, n, pv)` JavaScript equivalente a Excel PMT
- 3 escenarios CAE: editables en UI (selector), default [4%, 4.5%, 5%]
- Plazo: editable en UI (selector), default 30 años
- Cuota en CLP y UF para cada escenario
- Edge case CAE=0: `cuota = pv / n` (división lineal)
<!-- /SUBSTAGE -->

---

### 5.2 — Flujo mensual neto (arriendo vs cuota)
<!-- SUBSTAGE:5.2 -->
**Estado:** `✅ COMPLETADO` (implementado en `lib/calculators/cotizador.ts` + `PanelCotizacion.tsx`)
**Implementado:**
- `flujoMensual = arriendoCLP - cuotaCHP_clp` por cada escenario CAE
- `flujoAcumulado = flujoMensual * 11 * 5` (11 meses/año × 5 años)
- UI: campo de arriendo editable con formato CLP, 3 valores por escenario
- Indicador visual: verde (positivo) / rojo (negativo) en tabla de escenarios
<!-- /SUBSTAGE -->

---

### 5.3 — Tabla de amortización hipotecaria
<!-- SUBSTAGE:5.3 -->
**Estado:** `🔴 PENDIENTE` (cálculo de saldo a 60 meses implementado en 6.2 via fórmula cerrada; tabla completa no implementada)
**Faltantes para completar:**
- [ ] Calcular y mostrar tabla mes a mes de capital/interés pagado (no urgente)
- [ ] Fórmula cerrada del saldo a N meses ya existe en 6.2
<!-- /SUBSTAGE -->

---

## ETAPA 6 — EVALUACIÓN DE INVERSIÓN A 5 AÑOS

> **Objetivo:** Calcular el retorno de inversión, Cap Rate y ROI proyectado a 5 años.
> **Prerrequisito:** Etapa 5 completa.

---

### 6.1 — Flujo acumulado y plusvalía
<!-- SUBSTAGE:6.1 -->
**Estado:** `✅ COMPLETADO` (implementado en `lib/calculators/cotizador.ts` + UI)
**Implementado:**
- `flujoAcumulado = flujoMensual * 11 * 5` por escenario [E75]
- `plusvaliaAcumulada = (1 + plusvaliaAnualPct)^5 - 1`
- `precioVentaAnio5CLP = valorVentaCLP * (1 + plusvaliaAcumulada) * 0.95` [E82]
- UI: campo plusvalía% editable (default 2%), se aplica igual en los 3 escenarios
<!-- /SUBSTAGE -->

---

### 6.2 — CH amortizado en 60 meses (factor LTV 0.67)
<!-- SUBSTAGE:6.2 -->
**Estado:** `✅ COMPLETADO` (implementado en `lib/calculators/cotizador.ts`)
**Implementado:**
- Fórmula cerrada de saldo a 60 meses para los 3 escenarios
- `amortizado = (ch_plan_clp - saldo) * 0.67` (FACTOR_LTV constante)
- Edge case CAE=0: amortización lineal
**Pendiente:**
- [ ] Confirmar origen del factor 0.67 con el equipo (posiblemente restricción legal LTV máximo banco)
<!-- /SUBSTAGE -->

---

### 6.3 — Cap Rate
<!-- SUBSTAGE:6.3 -->
**Estado:** `✅ COMPLETADO` (implementado en `lib/calculators/cotizador.ts`)
**Implementado:**
- `capRate = (arriendoCLP * 11 / valorUF) / tasacionUF` [E86]
- Calculado para los 3 escenarios (cada uno con su arriendo)
- Mostrado como % con 2 decimales en CotizacionTemplate y CotizacionPDF
<!-- /SUBSTAGE -->

---

### 6.4 — ROI a 5 años y ROI anual compuesto
<!-- SUBSTAGE:6.4 -->
**Estado:** `✅ COMPLETADO` (implementado en `lib/calculators/cotizador.ts`)
**Implementado (P3.B1 ✅):**
- `Si bonoPie > 0: base = creditoHipFinalCLP; Si no: base = tasacionCLP`
- `roi5a = (precioVentaAnio5CLP - base + flujoAcumulado + amortizado) / base` [E88]
- `roiAnual = (1 + roi5a)^(1/5) - 1`
- Mostrado como % con 2 decimales
<!-- /SUBSTAGE -->

---

## ETAPA 7 — OUTPUT, PDF Y COTIZACIÓN FINAL

> **Objetivo:** Generar la cotización en el formato requerido con todos los datos calculados.
> **Prerrequisito:** Etapas 1–6 completas. Respuestas a P6.1–P6.4.

---

### 7.1 — Diseño del documento de cotización
<!-- SUBSTAGE:7.1 -->
**Estado:** `✅ COMPLETADO`
**Archivos:**
- `components/cotizacion/CotizacionTemplate.tsx` — documento HTML imprimible con @media print
  - Secciones: Cliente, Corredor, Proyecto, Características, Valores, Plan de Pie, Crédito Hipotecario, Escenarios CAE, Evaluación 5 años, Disclaimer
  - `#print-cotizacion` wrapper + `app/globals.css` @media print (A4 portrait, 15mm/12mm márgenes)
**Cambios 2026-03-31:**
- Sección "Corredor/Cliente" separada en dos: **CLIENTE** (nombre, RUT, email, teléfono) y **CORREDOR** (nombre corredor, email, teléfono)
- Sección VALORES: desglose individual por unidad — fila separada por `Precio Lista Departamento`, `Precio Lista Estacionamiento N°XX`, `Precio Lista Bodega N°XX` en lugar de línea genérica "Bienes Conjuntos (obligatorio)"
- Prop `unidadesAdicionales?: UnidadCotizable[]` agregada al componente
<!-- /SUBSTAGE -->

---

### 7.2 — Generación de PDF
<!-- SUBSTAGE:7.2 -->
**Estado:** `✅ COMPLETADO`
**Archivos:**
- `components/cotizacion/CotizacionPDF.tsx` — documento @react-pdf/renderer (StyleSheet, Document/Page/View/Text)
- `app/api/cotizacion/pdf/route.ts` — POST /api/cotizacion/pdf (genera nuevo) + GET /api/cotizacion/pdf?numero=COT-XXXX (regenera desde historial)
- `lib/utils/correlativo.ts` — `siguienteNumeroCotizacion()`, formato COT-2026-0001, resets anual
- `app/actions/stock.ts` — `getNumeroCotizacion()` + `getCotizacionPayloadAction()` server actions
**Notas:** Número de cotización se genera al hacer "Ver Documento". Correlativo basado en archivo `.cotizaciones-seq.json` (ignorado en git).
**Cambios 2026-03-31:**
- Sección VALORES en PDF: desglose individual por unidad (igual que Template HTML) — una fila por `tipoUnidad` + `numeroUnidad`
- Prop `unidadesAdicionales?: UnidadCotizable[]` agregada a `CotizacionPDFProps`
- Regeneración desde historial vía GET: lee `pdfPayload` del JSON (incluye `unidadesAdicionales`)
<!-- /SUBSTAGE -->

---

### 7.3 — Envío por email
<!-- SUBSTAGE:7.3 -->
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `lib/services/email.ts` — servicio nodemailer SMTP lazy; HTML con resumen + tabla escenarios CAE; PDF como adjunto
- `app/api/cotizacion/email/route.ts` — POST /api/cotizacion/email: genera PDF + llama enviarCotizacion()
**Integración UI:** botón "✉ Enviar por Email" en PanelCotizacion → formulario inline teal con campo email cliente (opcional); siempre envía al broker; toast ok/error
**Variables necesarias en .env.local:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
<!-- /SUBSTAGE -->

---

### 7.4 — Historial de cotizaciones
<!-- SUBSTAGE:7.4 -->
**Estado:** `✅ COMPLETADO`
**Archivos:**
- `lib/services/historial.ts` — dual-mode: JSON dev / PostgreSQL prod; upsert broker por RUT; inserta cotizacion + 3 escenarios
- `app/actions/stock.ts` — `guardarCotizacionAction()` + `listarCotizacionesAction()` + `getCotizacionPayloadAction()`
- `components/historial/TablaHistorial.tsx` — Client Component con `useEffect`; tabla; N° cotización como `<a>` → abre PDF en nueva pestaña
- `app/historial/page.tsx` — página /historial
- `app/api/cotizacion/export/route.ts` — GET → genera `Historial_cotizaciones.xlsx` con todas las cotizaciones
**Integración UI:** "Ver Documento" dispara guardar (fire-and-forget); enlace "Historial" en navbar de CotizadorShell
**Cambios 2026-03-31:**
- `pdfPayload` en `HistorialEntry` ahora incluye `unidadesAdicionales?: UnidadCotizable[]` para regenerar PDF con desglose correcto
- `GuardarCotizacionInput` incluye campo `unidadesAdicionales?`
<!-- /SUBSTAGE -->

---


---

## MEJORAS Y CORRECCIONES POST-LANZAMIENTO

> Cambios aplicados sobre el sistema ya funcional. No corresponden a substages del plan original.

### 2026-03-31 — MEJORAS Y CORRECCIONES 31032026

#### M1 — Separación Cliente / Corredor en documento y formulario
- `BrokerForm.tsx`: sección "Corredor" añadida con campos obligatorios: `empresa`, `emailCorredor`, `telefonoCorredor` (grid 3 columnas, validados con Zod)
- `CotizacionTemplate.tsx` + `CotizacionPDF.tsx`: sección CORREDOR/CLIENTE separada en dos secciones distintas — **CLIENTE** (datos del comprador) y **CORREDOR** (datos del intermediario)
- `CotizadorShell.tsx`: resumen del paso 2 muestra línea cliente + línea corredor separadas

#### M2 — Condiciones comerciales deshabilitadas cuando base = 0
- `PanelCotizacion.tsx`: selectores de Bono Pie, Pie Construcción, Cuotón, Crd. Directo se deshabilitan (`disabled`) cuando la condición base de la unidad = 0
- Label "no aplica" en rojo cuando el campo está bloqueado

#### M3 — Unidades adicionales (Agregar Estacionamiento/Bodega)
- `CascadeSelector.tsx`: botón "+ Agregar Unidades" visible al seleccionar un depto; filtra `tipoUnidad !== 'Departamento'`, excluye ya agregadas; lista con botones "Quitar"
- `CascadeSelection` type: `unidadesAdicionales: UnidadCotizable[]` propagado a `CotizadorShell` y `PanelCotizacion`
- `PanelCotizacion.tsx`: `preciosConjuntos = unidadesAdicionales.map(u => u.precioLista)` reemplaza llamada a `getBienesConjuntos()`

#### M4 — Desglose por unidad en sección VALORES (precios)
- Reemplaza la fila genérica "Bienes Conjuntos" por una fila individual por unidad:
  - `Precio Lista Departamento` (usa `unidad.tipoUnidad`)
  - `Precio Lista Estacionamiento N°XX` / `Precio Lista Bodega N°XX` (por cada `unidadesAdicionales[i]`)
- Aplicado en: `ResultadoPanel` (PanelCotizacion), `CotizacionTemplate`, `CotizacionPDF`
- `unidadesAdicionales` persistido en `pdfPayload` del historial para regeneración correcta

#### M5 — Historial: abrir PDF + exportar Excel
- N° Cotización en `TablaHistorial` es un enlace `<a>` que llama `GET /api/cotizacion/pdf?numero=XXX` y abre en nueva pestaña
- `app/api/cotizacion/export/route.ts`: `GET /api/cotizacion/export` genera `Historial_cotizaciones.xlsx` con SheetJS
- `TablaHistorial.tsx` convertido a Client Component con `useEffect` + botón "⬇ Descargar Excel"

#### M6 — Corrección filtro en cascada (proyectos sin stock)
- `ExcelAdapter.availableNemos()`: helper privado que construye `Set<string>` de nemotécnicos con al menos una unidad `Disponible`
- Todos los métodos del cascada filtran contra `availableNemos()` → ningún proyecto/inmobiliaria/entrega/comuna aparece si no tiene unidades disponibles
- Elimina el bug donde el mismo proyecto aparecía bajo dos inmobiliarias distintas (una sin stock real)

#### M7 — Navegación "Volver" entre pasos
- `CotizadorShell.tsx`: "← Volver a selección de unidad" en paso 2 (BrokerForm) → regresa a paso 1
- `PanelCotizacion.tsx`: prop `onVolver?: () => void`; botón "← Volver" visible cuando `!showDoc` → regresa a paso 2
- Una vez ejecutado "Ver Documento" (cotización guardada en historial), el botón desaparece → la cotización queda finalizada y no editable

#### M10 — Corrección fórmula tasación / Aporte Inmobiliaria (2026-04-01)
- **Problema:** columna % de "Aporte Inmobiliaria" mostraba 9.1% aunque la condición comercial es 10%. La fórmula aplicaba el % sobre el Valor de Venta en vez de la Tasación.
- **Corrección en `lib/calculators/cotizador.ts`:** implementada fórmula de Excel maestra (Calculadora BP+Mutuo, celdas D33/D35/D36):
  - `tasacionUF = valorVenta × (1−pie) / (1−pie−bono)` (tasación despejada)
  - `bonoPieUF  = tasacionUF × bonoPiePct` (aporte sobre tasación)
- Label, columna UF, columna % y columna $ ahora son 100% consistentes con la condición comercial.

#### M11 — Renombramiento "Bono Pie" → "Aporte Inmobiliaria" (2026-04-01)
- `PanelCotizacion.tsx`: label selector → "Aporte Inmobiliaria (%)"
- `CotizacionTemplate.tsx` + `CotizacionPDF.tsx`: fila tabla → "Aporte Inmobiliaria (X%)"
- `CotizadorShell.tsx`: badge resumen → "Aporte Inmob. X%"
- Modelos de datos, cálculos y variables internas sin cambio (siguen usando `bonoPie`, `bonoPiePct`)

#### M12 — Descuento: input libre → select con default de condiciones comerciales (2026-04-01)
- `PanelCotizacion.tsx`: campo "Descuento adicional (%)" cambiado de `<input type="number">` a `<select>`
- Default pre-seleccionado = `unidad.descuento` (condición comercial del proyecto)
- Opciones disponibles: 0% a 10% + valor base de la unidad si no está en la lista (`withBase`)
- Calculador: `descuentoPct = 0`, `descuentoAdicionalPct = totalSeleccionado` (absorbe el total)
- Template y PDF: label simplificado a `"Descuento Venta (X%)"` sin desglose "base + adicional"
- `lib/config/cotizadorConfig.ts`: nueva constante `DESCUENTO_ADICIONAL_OPTIONS`

#### M13 — Corrección labels UI (2026-04-01)
- "Crd. Directo" → "Crédito Directo" en Fila B de PanelCotizacion
- Textos "base X%" → `text-sm font-bold text-blue-900` (mismo tamaño que label, negrita, azul navy)
- Textos "no aplica" → sin cambio (`text-xs text-red-400`)
- Display opciones descuento: enteros sin decimal (10% en vez de 10.0%)

#### M14 — Disclaimer de cotización actualizado (2026-04-01)
- `CotizacionTemplate.tsx` + `CotizacionPDF.tsx`: texto del pie de página reemplazado por versión más cordial y comercial
- "Cotización generada el..." → "Cotización emitida el..."

### 2026-04-14 — MEJORAS Y CORRECCIONES 14042026

#### M29 — Rango optimista perfilamiento limitado a +15% sobre conservador (2026-04-14)
- `PerfilamientoModal.tsx`: `ResultadoEval` y `handleConfirmar` limitan `maxCLP`/`maxUF` a `min * 1.15`
- Evita diferencias desproporcionadas entre rango conservador y optimista en la pantalla de resultado y en la búsqueda de unidades

#### M28 — Formato $xx.xxx.xxx en campos CLP del perfilamiento (2026-04-14)
- `components/ui/currency-input.tsx`: nuevo componente `CurrencyInput` (type="text" + inputMode="numeric"); formatea al perder foco, muestra número limpio al enfocar; auto-selecciona contenido
- `PerfilamientoModal.tsx`: reemplaza todos los `<Input type="number">` de montos CLP por `<CurrencyInput>` en StepIncome, StepDebts, StepSavings, StepComplementary

#### M27 — Panel de unidades adicionales en paso 1 al venir de perfilamiento (2026-04-14)
- `CotizadorShell.tsx`: cuando `fromPerfilamiento === true`, muestra `<UnidadesAdicionalesPanel>` debajo del resumen de unidad seleccionada
- `UnidadesAdicionalesPanel.tsx`: nuevo componente que replica la funcionalidad de adicionales del CascadeSelector; carga vía `getAdicionales(nemotecnico)`, permite agregar/quitar estacionamientos y bodegas
- `handleAdicionalesToPerfilamiento()`: actualiza `selection.unidadesAdicionales` sin romper el resto de la selección

#### M26 — Mejoras UX ModalUnidades (2026-04-13 → 2026-04-14)
- **Filtros multi-select:** Programa, Comuna y Tipo de entrega usan `Set<string>`; 0 seleccionados = mostrar todos; chips con toggle visual
- **Tipo de entrega:** opciones fijas `['Entrega Inmediata', 'Entrega Futura']`
- **Precio lista:** elimina precio tachado/precio con descuento; muestra únicamente `precioLista` con label "Precio lista"
- **Unidades adicionales en modal:** al seleccionar una unidad principal, carga bodegas/estacionamientos disponibles vía `getAdicionales()`; selección múltiple con Checkbox; se pasan como array a `onSeleccionar`
- **Botón "Perfilar comprador":** estilo `bg-blue-600 text-white` (mismo color que recuadro de unidad)

### 2026-04-13 — MÓDULO PERFILAMIENTO DE COMPRADOR

> Nuevo módulo completo agregado sobre el sistema base. Permite evaluar la capacidad financiera del comprador y pre-filtrar unidades por rango de precio resultante.

#### P1 — Motor de evaluación financiera (2026-04-13)
- `lib/perfilamiento/types/evaluation.ts`: tipos `FormData`, `EvalParams`, `EvaluationOutput`, `UFData`, `ResultadoEvaluacion`, `initialFormData`
- `lib/perfilamiento/types/property-evaluation.ts`: tipos `PropertyFormData`, `PropertyEvalOutput`
- `lib/perfilamiento/evaluation-engine.ts`: función `evaluar(data, params, ufData?)` — calcula renta efectiva, capacidad de deuda, crédito máximo, dividendo máximo, propiedad máxima por pie y por LTV; incluye co-solicitante; resultado: `apto | apto_con_condiciones | no_apto`
- `lib/perfilamiento/property-engine.ts`: función `evaluarPropiedad(data, uf, params)`
- `lib/perfilamiento/evaluation-engine.ts`: `defaultParams` exportado; formatters `formatCLP`, `formatUF`

#### P2 — PerfilamientoModal — formulario 6 pasos (2026-04-13)
- `components/perfilamiento/PerfilamientoModal.tsx`: modal Dialog con 6 pasos secuenciales + pantalla de resultado
  - Paso 1 — Personal: nombre, RUT, edad, estado civil, dependientes, tipo contrato, antigüedad
  - Paso 2 — Ingresos: renta líquida, variables (50%), otros
  - Paso 3 — Deudas: cuotas créditos, tarjetas, pensiones, otras; checkbox morosidad
  - Paso 4 — Ahorro / Pie: pie disponible CLP
  - Paso 5 — Co-solicitante (opcional): mismos campos de ingresos, deudas y pie
  - Paso 6 — Resumen: revisión antes de evaluar
  - Resultado: badge apto/apto_con_condiciones/no_apto · razones · rango conservador y optimista (UF + CLP) · dividendo y crédito máximo · botón "Buscar unidades en este rango"
- `RangoCapacidad` exportado: `{ minUF, maxUF, creditoMaxCLP, dividendoMaxCLP, resultado }`

#### P3 — Server action y búsqueda por rango (2026-04-13)
- `lib/perfilamiento/actions.ts` (`'use server'`): `buscarUnidadesPorRango(minUF, maxUF)` — filtra Disponibles, tipo Departamento/Casa, con tolerancia ±10%; `getAdicionales(nemotecnico)` — devuelve Bodega/Estacionamiento Disponibles de un proyecto
- `lib/data/repository.ts`: `getAllUnidadesPorRango(minUF, maxUF)` agregado a interfaz `IStockRepository`
- `lib/data/excel-adapter.ts` + `pg-adapter.ts`: implementación del nuevo método

#### P4 — Integración en CotizadorShell (2026-04-13)
- `CotizadorShell.tsx`: prop `ufDelDia: number`; estado `fromPerfilamiento`; botón "Perfilar comprador" en navbar; `handleUnidadSeleccionada()` construye `CascadeSelection` completo desde `UnidadCotizable`; `ModalUnidades` y `PerfilamientoModal` orquestados
- `app/page.tsx`: convertida a async; obtiene `ufDelDia` desde `stockRepository.getUFdelDia()` e inyecta a `CotizadorShell`
- Flujo: PerfilamientoModal → RangoCapacidad → ModalUnidades (filtros + selección) → CotizadorShell paso 1 (con UnidadesAdicionalesPanel) → pasos 2–3 normales

### 2026-04-10 — MEJORAS Y CORRECCIONES 10042026

#### M25 — Reorganización del repositorio (2026-04-13)
- Archivos Excel e inputs movidos a `Archivos/`
- Documentos Markdown movidos a `Documentos/`

#### M24 — Historial: guardar al imprimir / descargar PDF (2026-04-10)
- `PanelCotizacion.tsx`: acción "Ver Documento" y "Descargar PDF" llaman a `guardarCotizacionAction()` como fire-and-forget antes de ejecutar su acción principal
- `app/api/cotizacion/salvar-excel/route.ts`: nueva API `POST /api/cotizacion/salvar-excel` que agrega la cotización al archivo `Historial_cotizaciones.xlsx` en prod y dev

#### M23 — Fixes al llenado de historial Excel (2026-04-10)
- Serie de correcciones a `salvar-excel`: compatibilidad prod/dev, paths `/tmp` en Vercel, escritura síncrona (`XLSX.write()` + `fs.writeFileSync()`)
- Migración temporal a CSV para evitar bloqueos de archivo; revertida a xlsx con API route separada

#### M21 — Bloqueo de edición % Pie Construcción y % Crédito Directo (2026-04-10)
- `PanelCotizacion.tsx`: campos "% Pie en Construcción" y "% Crédito Directo" cambiados a `disabled` — son fijos por condición comercial, no editables por el corredor
- Eliminada visualización de textos de valores base para estos campos

### 2026-04-05 — MEJORAS Y CORRECCIONES 05042026

#### M15 — Migración a parámetros dinámicos desde Excel (2026-04-05)
- `INPUT_FILES.xlsx`: hojas `REGLAS_INMOBILIARIAS` y `PARAMETROS_CALCULO` creadas con reglas extraídas de hojas de análisis
- `lib/data/types.ts`: tipos `ReglaInmobiliariaRow` y `ParametroCalculoRow`
- `lib/data/excel-adapter.ts`: loaders con caché para ambas hojas; `PgAdapter` con stubs (pendiente migración PG)
- `lib/data/repository.ts` + `pg-adapter.ts`: interfaz `IStockRepository` actualizada; stubs en PgAdapter
- `lib/data/index.ts`: re-exporta los nuevos tipos
- `app/actions/stock.ts`: server actions `getReglasInmobiliarias()` y `getParametrosCalculo()`
- `lib/config/cotizadorConfig.ts`: `getReglaInmobiliaria(alianza, reglas)` y `getParamNum()` reemplazan funciones hardcoded deprecadas
- `lib/calculators/cotizador.ts`: `pieConjuntosPct` como input opcional (default 0.20)
- `components/cotizacion/PanelCotizacion.tsx`: carga reglas en `handleCotizar` vía `Promise.all`, usa `getReglaInmobiliaria`

#### M16 — Corrección cálculo Maestra con bienes conjuntos (2026-04-05)
- **Problema:** para Maestra con bienes conjuntos, los conjuntos pagaban 20% de pie (regla genérica), cuando la fórmula D35 implica que el pie aplica sobre el `valorVentaUF` completo (depto + conjuntos al mismo `piePct`)
- **Corrección en `lib/calculators/cotizador.ts`:**
  - `PIE_CONJUNTOS_PCT = tipoCalculoBono === 'maestra' ? piePct : (pieConjuntosPct ?? 0.20)`
  - `pieCreditoHipUF = pieTotalUF` (antes era solo `pieTotalDeptoUF`)
- **Resultado:** `PieTotal = valorVentaUF × piePct` · `SaldoPie` y `AporteInmobiliaria` ahora correctos para Maestra con conjuntos
- Verificado con caso real: Pie=331.75 UF ✓ · SaldoPie=262.9 UF ✓ · Aporte=414.69 UF ✓

#### M17 — Corrección % Pie Total en Plan de Pago con bienes conjuntos (2026-04-05)
- `CotizacionTemplate.tsx` + `CotizacionPDF.tsx`: columna `%` de fila "Pie Total" cambiada de `r.piePct` a `r.pieTotalUF / r.valorVentaUF`
- Antes: mostraba % del depto (ej. 10%); con conjuntos el % efectivo era mayor
- Ahora: muestra el % real sobre valorVentaUF (refleja contribución de conjuntos a 20% / piePct según inmobiliaria)

#### M18 — Disclaimer pie de cotización (texto definitivo) (2026-04-05)
- `CotizacionTemplate.tsx` + `CotizacionPDF.tsx`: primer párrafo cambia a "Esta cotización **es referencial** y ha sido elaborada..."
- "Cotización emitida el {fecha}" → "Cotización emitida {fecha}" (elimina "el" redundante)

#### M19 — Botón "Nueva Cotización" en navbar (2026-04-05)
- `CotizadorShell.tsx`: botón "← Nueva Cotización" aparece en el navbar únicamente en el paso 3 (Cotización)
- Al hacer clic resetea `step → 'select'`, `selection → null`, `broker → null`
- Idéntico al botón de `/historial` en apariencia (border azul)

#### M20 — Ordenamiento ascendente numérico en filtros (2026-04-05)
- `CascadeSelector.tsx`: función `distinct()` actualizada para ordenar numéricamente (`1, 2…16`) en vez de lexicográfico (`1, 10, 11…2`)
- Dropdown "N° Unidad": array `unidadesFiltradas` ordenado por `numeroUnidad` numérico antes de mapear opciones
- Afecta filtros: Piso, N° Unidad (los demás filtros son strings no numéricos)

#### M8 — Corrección CSS (headers en next.config.ts)
- `next.config.ts`: eliminado bloque `headers()` que aplicaba `Content-Type: text/html` a todos los archivos incluidos CSS → los estilos ahora se cargan correctamente

---

## INFRAESTRUCTURA ADICIONAL (fuera del plan original)

> Componentes implementados que no estaban en el plan de etapas original pero son necesarios para producción.

### PgAdapter — Adaptador PostgreSQL
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `lib/db/client.ts` — cliente PostgreSQL lazy via `getDb()`; singleton con hot-reload seguro en dev
- `lib/data/pg-adapter.ts` — `PgAdapter` implementa los 7 métodos de `IStockRepository` sobre `v_stock_cotizable`
- `lib/data/uf-format.ts` — funciones puras client-safe (`formatUF`, `formatCLP`, `ufToCLP`); rompe cadena de import hacia `postgres` en bundle cliente
- `lib/data/index.ts` — require dinámico según `DATA_SOURCE`; evita bundling de `postgres` en cliente
- `next.config.ts` — `serverExternalPackages: ['postgres']`
**Activación:** `DATA_SOURCE=postgres` en `.env.local` (requiere `DATABASE_URL` y datos importados)

### Script de importación Excel → PostgreSQL
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `scripts/import_excel_pg.ts` — 7 pasos: programa → inmobiliaria → proyecto → unidad → condicion_comercial → uf_valor → bien_conjunto; idempotente (ON CONFLICT upsert); batches de 500 filas; carga .env.local automáticamente
**Uso:** `npm run import:excel` (requiere `DATABASE_URL` en entorno o `.env.local`)

### Correlativo dual-mode
**Estado:** `✅ COMPLETADO`
**Implementado:** `lib/utils/correlativo.ts` — dual-mode: JSON dev / tabla `correlativo` PG prod. Clave `cotizacion_<YYYY>` con `INSERT ... ON CONFLICT DO UPDATE` (atómico, reinicio anual automático). Tabla agregada a `schema.sql` y `schema_pg.sql`.

## TECH STACK DECIDIDO

> Decisiones de arquitectura técnica confirmadas. Estas decisiones son vinculantes para todas las etapas.

### Framework y runtime

| Capa | Tecnología | Versión | Notas |
|---|---|---|---|
| **UI / Frontend** | React | **19** | Server Components, Actions, `use()` hook |
| **Framework web** | Next.js | **15** (App Router) | Bundla React 19; Server Actions para data layer |
| **Lenguaje** | TypeScript | 5.x | Strict mode |
| **Estilos** | Tailwind CSS | 4.x | + shadcn/ui para componentes |

### Base de datos y datos

| Fase | Motor | Herramienta | Archivo de schema |
|---|---|---|---|
| **Desarrollo / inicial** | SQLite (embebido) | `better-sqlite3` | `scripts/schema.sql` |
| **Producción** | **PostgreSQL 15+** | `drizzle-orm` + `postgres` | `scripts/schema_pg.sql` |
| **Fuente de datos** | Excel | `xlsx` library | `INPUT_FILES.xlsx` |

### Patrón de acceso a datos

```
src/lib/data/
  types.ts          ← tipos compartidos
  repository.ts     ← interfaz IStockRepository (misma API en ambas fases)
  excel-adapter.ts  ← fase inicial: lee INPUT_FILES.xlsx
  pg-adapter.ts     ← fase producción: lee PostgreSQL
  index.ts          ← exporta el adaptador activo (ENV: DATA_SOURCE=excel|postgres)
```

### Librerías clave confirmadas

| Propósito | Librería |
|---|---|
| Parser Excel | `xlsx` (SheetJS) |
| PDF generation | `@react-pdf/renderer` |
| PostgreSQL client | `postgres` (Drizzle) |
| Validación formularios | `react-hook-form` + `zod` |
| RUT chileno | `rutjs` o validación custom |

---

## DOCUMENTOS DE REFERENCIA

| Documento | Descripción |
|---|---|
| [scripts/schema.sql](scripts/schema.sql) | DDL SQLite — 8 tablas, 1 vista, 19 índices, 5 triggers |
| [EVALUACIÓN_SCHEMA_DATOS.md](EVALUACIÓN_SCHEMA_DATOS.md) | Evaluación técnica del schema con 9 problemas identificados y plan de corrección |
| [MODELO_DATOS_COTIZADOR.md](MODELO_DATOS_COTIZADOR.md) | Documentación completa del modelo de datos |
| [ERD_COTIZADOR.md](ERD_COTIZADOR.md) | Diagrama entidad-relación (Mermaid) |
| [MODELO_DATOS_COTIZADOR.xlsx](MODELO_DATOS_COTIZADOR.xlsx) | Modelo en Excel con PKs, FKs, índices, constraints y datos semilla |
| [REGLAS_COTIZADOR.xlsx](REGLAS_COTIZADOR.xlsx) | Reglas de cálculo y selección documentadas desde el COTIZADOR Excel |

---

## HISTORIAL DE COMMITS

<!-- HISTORIAL_START -->
| Fecha | Commit | Branch | Descripción |
|---|---|---|---|
| 2026-04-14 | 557ba8f | main | M29: limitar rango optimista a máximo +15% sobre conservador |
| 2026-04-14 | 430d8f5 | main | M28: formato $xx.xxx.xxx en campos CLP del perfilamiento (CurrencyInput) |
| 2026-04-14 | 393de4b | main | M27: panel de unidades adicionales en paso 1 al venir de perfilamiento |
| 2026-04-14 | cdc7a4a | main | M26: ModalUnidades — filtro Tipo de entrega (Inmediata / Futura) |
| 2026-04-13 | f8414ac | main | M26: ModalUnidades — precio lista sin tachado ni descuento |
| 2026-04-13 | d96fbc5 | main | M26: ModalUnidades — multi-select filtros, unidades adicionales, botón perfilar azul |
| 2026-04-13 | 30bca0b | main | P4: integración perfilador completa en CotizadorShell |
| 2026-04-13 | 31ad15c | main | P1–P3: motor evaluación + PerfilamientoModal + buscarUnidadesPorRango + ModalUnidades |
| 2026-04-13 | 6208ee1 | main | M25: reorganiza proyecto — xlsx a Archivos/, docs a Documentos/ |
| 2026-04-13 | ca5ecd9 | main | fix: cotizaciones históricas |
| 2026-04-13 | c24da7a | main | fix: reemplazar xlsx por CSV en historial (sin dependencias, sin bloqueos) |
| 2026-04-10 | 9f1fedb | main | M24: salvar-excel — soporte prod/dev, paths /tmp en Vercel |
| 2026-04-10 | 695fc39 | main | M21: elimina visualización de textos base en Pie Construcción y Crédito Directo |
| 2026-04-10 | d7a1056 | main | M21: bloqueo edición % pie construcción y % crédito directo |
| 2026-04-10 | 0e2b602 | main | M24: guardar historial al imprimir/descargar PDF |
| 2026-04-05 | 520c7a8 | main | M20: ordena Piso y N Unidad en forma ascendente numerica |
| 2026-04-05 | d04deab | main | M19: agrega boton Nueva Cotizacion en navbar al llegar al paso 3 |
| 2026-04-05 | a46b549 | main | M18: actualiza texto disclaimer pie de cotizacion |
| 2026-04-05 | caa20b9 | main | M16: corrige calculo de pie para Maestra con bienes conjuntos |
| 2026-04-05 | 536833b | main | M17: corrige % Pie Total en Plan de Pago cuando hay bienes conjuntos |
| 2026-04-05 | f3f4410 | main | M15: migra config a parametros dinamicos desde Excel (REGLAS_INMOBILIARIAS + PARAMETROS_CALCULO) |
| 2026-04-02 | 3210912 | main | CREA ANALISIS DE FUNCIONALIDADES CALCULOS |
| 2026-03-31 | 97a302b | main | auto: actualiza maestro de desarrollo antes del push |
| 2026-03-31 | bf34457 | main | M4: desglose por unidad en precios (Depto / Estac / Bodega individualmente) |
| 2026-03-31 | afc5eb4 | main | M5–M8: historial PDF+Excel, corrección filtro cascada (availableNemos), botones Volver, fix CSS headers |
| 2026-03-31 | a7ed60a | main | M3+M5: Agregar Unidades (estac/bodega) + Historial Descargar Excel |
| 2026-03-31 | c9a2fa6 | main | M1+M2: corredor en formulario, condiciones comerciales deshabilitadas cuando base=0 |
| 2026-03-31 | fea1e53 | main | Navbar: texto "Cotizador Mercado Primario" + corrección CSS (eliminado headers() en next.config.ts) |
| 2026-03-30 | d80d79c | main | MAESTRO actualizado; Etapa 0 completa; Camino B: CUOTÓN, PIE CONSTRUCCIÓN, CRÉDITO DIRECTO |
| 2026-03-29 | ae3c337 | main | Camino A: CotizacionTemplate HTML + @media print, CotizacionPDF @react-pdf/renderer, correlativo COT-2026-XXXX |
| 2026-03-29 | — | main | Etapa 3: motor calcularCotizacion, PanelCotizacion 3 escenarios CAE, P3.B1/B5/A1/P2.3 respondidas |
| 2026-03-29 | — | main | Etapas 1.2–1.4 + 2.1–2.6: data layer, CascadeSelector 5 pasos, BrokerForm RUT, CotizadorShell |
| 2026-03-29 | — | main | Scaffold Next.js 15 + React 19 + TypeScript strict + Tailwind CSS 4.x |
| 2026-03-24 | — | main | Rediseño filtrado en cascada: Comuna→Entrega→Inmobiliaria→Proyecto→Unidad |
| 2026-03-24 | — | main | Evaluación técnica schema.sql + MODELO_DATOS_COTIZADOR.xlsx |
| 2026-03-23 | d0eea66 | main | carga archivo para determinar logicas y calculos |
| 2026-03-23 | 1f000af | main | crea docs de trabajo |
<!-- HISTORIAL_END -->
