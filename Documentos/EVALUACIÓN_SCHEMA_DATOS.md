# EVALUACIÓN TÉCNICA — `scripts/schema.sql`
## Cotizador Web Mercado Primario

**Fecha de evaluación:** 2026-03-24
**Evaluador:** Análisis técnico sobre schema versión `fb95d05`
**Archivo evaluado:** `scripts/schema.sql`
**Tablas analizadas:** 8 tablas, 1 vista, 19 índices, 20 CHECK constraints, 5 triggers

---

## 1. RESUMEN EJECUTIVO

| Aspecto | Calificación | Nota |
|---|---|---|
| Estructura relacional | CORRECTO | FKs bien definidas, cardinalidades correctas |
| Integridad referencial | CORRECTO | Constraints, checks, triggers consistentes |
| Decisiones de PK | CORRECTO | Surrogate + índice parcial bien resuelto |
| Snapshot de cotización | INCOMPLETO | Falta snapshot de inputs comerciales |
| Normalización de datos | INCOMPLETO | `dormitorios`, `tipo_unidad`, `programa` |
| Escalabilidad de escenarios | PROBLEMA | 3 CAE hardcodeados en columnas |
| Modelo de usuario/broker | AUSENTE | Sin entidad broker para sistema multi-usuario |
| Cobertura de objetivos de negocio | ~80% | Base sólida para Etapas 1–5 del maestro |

**Conclusión general:** El modelo es apto para iniciar el desarrollo de las Etapas 1 y 2. Antes de implementar la Etapa 3 (precios y descuentos) se deben resolver los problemas críticos descritos en la sección 3, ya que afectan directamente la integridad del histórico de cotizaciones y la confiabilidad del JOIN comercial.

---

## 2. FORTALEZAS DEL MODELO

### 2.1 Decisiones de clave primaria
- **Surrogate PKs** en todas las entidades: decisión correcta y documentada. La clave natural `(nemotecnico + tipo_unidad + numero_unidad)` tiene 73 duplicados y 916 valores NULL en `numero_unidad`, lo que la invalida como PK.
- **Índice único parcial** `uq_unidad_por_proyecto WHERE numero_unidad IS NOT NULL`: solución elegante y precisa. Evita duplicados reales sin rechazar los registros con NULL legítimos (bodegas/estacionamientos sin número asignado).

### 2.2 Configuración del motor SQLite
- **WAL + synchronous=NORMAL**: configuración óptima para SQLite embebido con lecturas concurrentes desde una aplicación web. Maximiza rendimiento de lectura sin sacrificar durabilidad ante escrituras ocasionales.
- **`PRAGMA foreign_keys = ON`**: FK enforcement explícito, esencial y correctamente declarado al inicio.

### 2.3 Auditabilidad
- **Triggers `updated_at`**: auditoría automática y consistente en todas las tablas editables. No depende de la aplicación para mantener la marca de tiempo.
- **`cotizacion` como snapshot de resultados**: arquitectura correcta. Los precios del stock cambian con el tiempo; el histórico de cotizaciones generadas no debe verse afectado por esos cambios.

### 2.4 Diseño operativo
- **`parametro_cotizador`**: excelente decisión. Separa la configuración de cálculo del código fuente. El administrador puede ajustar tasas CAE, plazos y porcentajes de pie sin necesidad de un nuevo deploy.
- **`bien_conjunto`**: resuelve correctamente la relación N:M entre departamento y sus bienes adicionales (estacionamiento, bodega). La restricción `chk_bc_distintos` previene auto-referencias.
- **`v_stock_cotizable`**: abstracción operativa correcta. El motor del cotizador no debería construir este JOIN en runtime; la vista encapsula la lógica de unión y los filtros de estado activo.

### 2.5 Validación de datos
- 20 CHECK constraints cubren rangos numéricos, valores booleanos y enumeraciones de dominio.
- La relación lógica `unidad ↔ condicion_comercial` está bien documentada como JOIN por `(id_proyecto + tipo_unidad + programa)`, sin intentar forzar una FK física que no corresponde al modelo.

---

## 3. PROBLEMAS IDENTIFICADOS

### 3.1 CRITICOS — afectan integridad del negocio

---

#### PROBLEMA C1: `cotizacion` no guarda snapshot de las condiciones comerciales usadas

**Ubicación:** `cotizacion` líneas 307–347

**Descripción:**
La tabla guarda `id_condicion` como FK a `condicion_comercial`, pero si esa condición es modificada en el futuro (nuevo porcentaje de descuento, nuevo bono pie), todas las cotizaciones históricas "verán" las condiciones nuevas al ser releídas o reimpresas. Los campos calculados (`precio_venta_uf`, `tasacion_uf`, `pie_total_uf`) están correctamente en snapshot, pero los INPUTS comerciales que los generaron no lo están.

**Impacto:**
- Imposibilidad de auditar una cotización histórica de forma fiel.
- Reimpresión de cotizaciones con valores distintos a los originales.
- Inconsistencia entre el valor mostrado al cliente y el valor registrado.

**Corrección sugerida:** Agregar campos de snapshot para los inputs comerciales:

```sql
-- Campos a agregar en la tabla cotizacion:
descuento_pct_snapshot        REAL     NOT NULL DEFAULT 0,
bono_pie_pct_snapshot         REAL     NOT NULL DEFAULT 0,
aporte_inmob_pct_snapshot     REAL     NOT NULL DEFAULT 0,
reserva_clp_snapshot          INTEGER  NOT NULL,
tipo_financiamiento           TEXT     NOT NULL DEFAULT 'HIPOTECARIO',
  -- CHECK (tipo_financiamiento IN ('HIPOTECARIO', 'CREDITO_DIRECTO'))
```

**Prioridad:** Resolver antes de implementar la tabla `cotizacion` definitiva.

---

#### PROBLEMA C2: `programa` es clave de JOIN sin tabla maestra ni validación

**Ubicación:** `unidad.programa` y `condicion_comercial.programa`

**Descripción:**
`programa` es la columna central del JOIN más crítico del sistema (el que conecta unidades con sus condiciones comerciales). Sin embargo, se almacena como TEXT libre sin CHECK constraint sobre valores válidos en `unidad`, y sin una tabla maestra que centralice los programas existentes.

Una diferencia de un carácter (mayúscula, tilde, espacio adicional) entre el valor en `unidad` y el valor en `condicion_comercial` provoca que el `LEFT JOIN` de `v_stock_cotizable` devuelva silenciosamente `NULL` para las condiciones comerciales. La cotización no falla con error — simplemente calcula con descuento 0 y bono pie 0 sin avisar.

**Impacto:**
- Falla silenciosa en producción: cotizaciones generadas sin condiciones comerciales.
- Difícil de detectar ya que no lanza error, solo produce valores incorrectos.

**Corrección sugerida:**

```sql
-- Opción A (recomendada): tabla maestra de programas
CREATE TABLE programa (
  id_programa  INTEGER  PRIMARY KEY,
  id_proyecto  INTEGER  NOT NULL REFERENCES proyecto(id_proyecto),
  codigo       TEXT     NOT NULL,
  descripcion  TEXT     NULL,
  CONSTRAINT uq_programa UNIQUE (id_proyecto, codigo)
);
-- Agregar FK en unidad y condicion_comercial hacia programa.codigo

-- Opción B (mínima viable): CHECK constraint con valores conocidos
-- Se mantiene la columna TEXT pero se valida contra un listado definido
```

**Prioridad:** Resolver antes de cargar datos de producción.

---

### 3.2 IMPORTANTES — afectan funcionalidad del cotizador

---

#### PROBLEMA I1: 3 escenarios CAE hardcodeados como columnas en `cotizacion`

**Ubicación:** `cotizacion` — columnas `cae_1`, `cae_2`, `cae_3`, `arriendo_1_clp`, `arriendo_2_clp`, `arriendo_3_clp`

**Descripción:**
Los tres escenarios de simulación hipotecaria están modelados como columnas paralelas en la misma fila. Si en el futuro se requiere un número diferente de escenarios (2, 4, o uno personalizado), se debe alterar el schema. Adicionalmente, los campos de resultado por escenario (arriendo, ROI, cap rate) están mezclados con los datos del encabezado de cotización, lo que engrosa la tabla a 38 columnas.

**Corrección sugerida:** Normalizar en tabla hija:

```sql
CREATE TABLE cotizacion_escenario (
  id_escenario    INTEGER  PRIMARY KEY,
  id_cotizacion   INTEGER  NOT NULL REFERENCES cotizacion(id_cotizacion) ON DELETE CASCADE,
  n_escenario     INTEGER  NOT NULL,   -- 1, 2, 3
  cae             REAL     NOT NULL,
  cuota_uf        REAL     NOT NULL,
  arriendo_clp    INTEGER  NULL,
  roi_anual       REAL     NULL,
  cap_rate        REAL     NULL,
  CONSTRAINT uq_escenario UNIQUE (id_cotizacion, n_escenario)
);
```

**Prioridad:** Resolver antes de implementar `cotizacion` definitiva.

---

#### PROBLEMA I2: `unidad.dormitorios` como TEXT impide filtros numéricos

**Ubicación:** `unidad.dormitorios TEXT NULL`

**Descripción:**
El campo acepta valores como `'1'`, `'2'`, `'1-1/2'`, `'BO'`, `'#N/A'`, que no son comparables ni ordenables numéricamente. El cotizador necesitará un filtro del tipo "mostrar unidades de 2 dormitorios" que con el tipo TEXT actual requiere lógica de parseo frágil.

**Corrección sugerida:**

```sql
-- Separar en dos campos:
dormitorios_num     INTEGER  NULL,  -- para filtros y ordenamiento: 0, 1, 2, 3...
dormitorios_display TEXT     NULL,  -- etiqueta de presentación: '1-1/2', 'BO', etc.
```

**Prioridad:** Resolver en Etapa 2 (filtros de selección de unidad).

---

#### PROBLEMA I3: `tipo_unidad` acepta variantes de case del mismo tipo

**Ubicación:** `CONSTRAINT chk_unidad_tipo` en tabla `unidad`

**Descripción:**
El constraint permite simultáneamente `'Local Comercial'`, `'Local comercial'` y `'Local'` — tres representaciones del mismo tipo. Del mismo modo, `'Estacionamiento'`, `'Estacionamiento Moto'`, `'Estacionamiento Comercial'` y `'Estacionamiento local'` conviven como valores válidos distintos, aunque representan variantes del mismo tipo base.

Tener variantes de case en el constraint de validación significa que la normalización fue incompleta y el problema fue absorbido por el schema en lugar de corregirse. Esto obliga a lógica defensiva en cada query que filtre por tipo de unidad.

**Corrección sugerida:** Normalizar los valores en el proceso de importación y reducir el CHECK a un conjunto canónico sin duplicados:

```sql
CONSTRAINT chk_unidad_tipo CHECK (tipo_unidad IN (
  'Departamento',
  'Estacionamiento',
  'Estacionamiento Moto',
  'Bodega',
  'Local Comercial'
))
```

**Prioridad:** Resolver antes de la importación masiva de datos.

---

#### PROBLEMA I4: No existe entidad `broker`

**Ubicación:** `cotizacion.nombre_broker TEXT NOT NULL`

**Descripción:**
El broker se almacena como texto libre. En un sistema multi-broker esto impide:
- Filtrar el historial de cotizaciones por broker.
- Controlar qué proyectos o inmobiliarias puede ver/cotizar cada broker.
- Generar reportes de actividad por broker.
- Autenticar y autorizar operaciones.

**Corrección sugerida:**

```sql
CREATE TABLE broker (
  id_broker   INTEGER  PRIMARY KEY,
  nombre      TEXT     NOT NULL,
  email       TEXT     NOT NULL,
  activo      INTEGER  NOT NULL DEFAULT 1,
  created_at  TEXT     NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT     NOT NULL DEFAULT (datetime('now')),
  CONSTRAINT uq_broker_email UNIQUE (email),
  CONSTRAINT chk_broker_activo CHECK (activo IN (0, 1))
);
-- Reemplazar nombre_broker TEXT por:
-- id_broker INTEGER NOT NULL REFERENCES broker(id_broker)
```

**Prioridad:** Resolver antes de Etapa 7 (output y registro de cotizaciones).

---

### 3.3 MEJORAS — deuda técnica manejable

---

#### MEJORA M1: `condicion_comercial` sin discriminador de modalidad de pago

**Ubicación:** `condicion_comercial` — columnas `cuotas_pie`, `pie_periodo_construccion`, `cuoton`, `pie_credito_directo`

**Descripción:**
Los cuatro campos conviven en la misma fila pero aplican a modalidades de pago mutuamente excluyentes (estándar, en construcción, crédito directo). Sin un discriminador, la aplicación debe inferir cuál modalidad aplica a cada registro leyendo qué campos tienen valor distinto de cero, lo cual es frágil y difícil de mantener.

Este problema está directamente relacionado con las preguntas bloqueantes P3.C1–P3.C3 del MAESTRO_DESARROLLO_COTIZADOR.

**Corrección sugerida:**

```sql
-- Agregar campo discriminador:
modalidad_pago  TEXT  NOT NULL DEFAULT 'ESTANDAR',
  CONSTRAINT chk_modalidad CHECK (modalidad_pago IN (
    'ESTANDAR', 'CONSTRUCCION', 'CREDITO_DIRECTO'
  ))
```

**Prioridad:** Resolver una vez respondidas las preguntas bloqueantes P3.C1–P3.C3.

---

#### MEJORA M2: `proyecto.periodo_entrega` sin formato estándar

**Ubicación:** `proyecto.periodo_entrega TEXT NOT NULL`

**Descripción:**
Almacena valores de texto libre como `'Q1 2026'`, `'1er Semestre 2025'`, `'Dic 2026'`. No son ordenables ni filtrables de forma confiable. El cotizador necesitará mostrar proyectos ordenados por fecha estimada de entrega.

**Corrección sugerida:** Usar formato `'YYYY-MM'` (texto ISO parcial) o agregar un campo paralelo:

```sql
fecha_entrega_est  TEXT  NULL,  -- 'YYYY-MM-DD' o 'YYYY-MM', para ordenamiento
-- Mantener periodo_entrega TEXT para display ('1er Semestre 2026')
```

---

#### MEJORA M3: `bienes_conjuntos TEXT` en `unidad` queda como doble fuente de verdad

**Ubicación:** `unidad.bienes_conjuntos TEXT NULL`

**Descripción:**
Una vez que la tabla `bien_conjunto` esté populada, el campo `unidad.bienes_conjuntos` (texto crudo `'B - 1 B'`) queda redundante. Tener dos fuentes de la misma información introduce riesgo de inconsistencia.

**Acción requerida:** Definir formalmente el ciclo de vida de este campo:
- Opción A: marcar como deprecado post-importación y eliminar en una migración futura.
- Opción B: renombrar a `bienes_conjuntos_raw` y documentarlo exclusivamente como campo de trazabilidad de importación, nunca usado en lógica de negocio.

---

#### MEJORA M4: `uf_valor` sin campo de fuente ni validación de variación anómala

**Ubicación:** `uf_valor` tabla completa

**Descripción:**
No hay registro de qué fuente provee cada valor (CMF, mindicador, carga manual). Tampoco hay validación de rango que detecte variaciones anómalas (UF no puede subir un 10% en un día).

**Corrección sugerida:**

```sql
-- Agregar:
fuente          TEXT  NULL,  -- 'CMF', 'MINDICADOR', 'MANUAL'
-- CHECK sobre variacion_diaria:
CONSTRAINT chk_uf_variacion CHECK (
  variacion_diaria IS NULL
  OR (variacion_diaria >= -0.01 AND variacion_diaria <= 0.01)
)
```

---

#### MEJORA M5: Sin historial de precios de unidad

**Ubicación:** `unidad.precio_lista_uf REAL NOT NULL`

**Descripción:**
Solo almacena el precio actual. Cuando cambia, la historia se pierde. Para análisis de variación de precios o comparación con cotizaciones antiguas, no hay referencia histórica.

**Acción sugerida a futuro:** Crear tabla `unidad_precio_hist (id_unidad, precio_uf, fecha_desde, fecha_hasta, motivo_cambio)`. No es bloqueante para el desarrollo inicial.

---

## 4. PLAN DE CORRECCIÓN RECOMENDADO

### Antes de Etapa 1 (datos y stock)
- [ ] **C2** — Definir tabla `programa` o CHECK constraint sobre `unidad.programa`
- [ ] **I3** — Normalizar valores canónicos de `tipo_unidad` en importación
- [ ] **M3** — Definir ciclo de vida de `unidad.bienes_conjuntos`

### Antes de Etapa 3 (precios y descuentos)
- [ ] **C1** — Agregar campos snapshot de condiciones comerciales en `cotizacion`
- [ ] **I1** — Normalizar escenarios CAE en tabla `cotizacion_escenario`
- [ ] **M1** — Agregar `modalidad_pago` discriminador en `condicion_comercial`

### Antes de Etapa 2 (selección de unidad)
- [ ] **I2** — Separar `dormitorios` en `dormitorios_num` + `dormitorios_display`

### Antes de Etapa 7 (output y registro)
- [ ] **I4** — Crear tabla `broker` y reemplazar `nombre_broker TEXT`

### Deuda técnica (post-lanzamiento v1)
- [ ] **M2** — Estandarizar formato de `periodo_entrega`
- [ ] **M4** — Agregar campo `fuente` en `uf_valor`
- [ ] **M5** — Crear tabla `unidad_precio_hist`

---

## 5. REFERENCIAS

| Documento | Relación |
|---|---|
| [scripts/schema.sql](scripts/schema.sql) | Archivo evaluado |
| [MODELO_DATOS_COTIZADOR.md](MODELO_DATOS_COTIZADOR.md) | Documentación del modelo |
| [ERD_COTIZADOR.md](ERD_COTIZADOR.md) | Diagrama entidad-relación |
| [MAESTRO_DESARROLLO_COTIZADOR.md](MAESTRO_DESARROLLO_COTIZADOR.md) | Plan de desarrollo y preguntas bloqueantes |
| [MODELO_DATOS_COTIZADOR.xlsx](MODELO_DATOS_COTIZADOR.xlsx) | Modelo en Excel con PKs, FKs y relaciones |
