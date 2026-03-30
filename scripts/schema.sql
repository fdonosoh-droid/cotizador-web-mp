-- ============================================================
-- SCHEMA: COTIZADOR WEB MERCADO PRIMARIO — SQLite (DESARROLLO)
-- Motor:  SQLite — fase inicial / prototipo local
-- Stack:  React 19 + Next.js 15 (fase Excel) → PostgreSQL (producción)
-- Fuente: INPUT_FILES.xlsx — hojas STOCK NUEVOS, CONDICIONES_COMERCIALES,
--         PROYECTOS, UF, aux
-- ============================================================
-- USO:
--   • Este archivo es el schema de DESARROLLO (SQLite local).
--   • El schema de PRODUCCIÓN (PostgreSQL) está en scripts/schema_pg.sql.
--   • Migración: Excel (INPUT_FILES.xlsx) → SQLite (dev) → PostgreSQL (prod)
-- ============================================================
-- REVISIÓN v2 — 2026-03-30
--   ES.1  Tabla maestra `programa` con FK en unidad y condicion_comercial
--   ES.2  Tabla hija `cotizacion_escenario` normaliza los 3 escenarios CAE
--   ES.3  Campo `modalidad_pago` en condicion_comercial (P3.C1–P3.C3)
--   ES.4  Entidad `broker` con FK en cotizacion (reemplaza nombre_broker TEXT)
--   C1    Snapshot de condiciones comerciales en cotizacion
--   I2    dormitorios separado: dormitorios_num + dormitorios_display
--   I3    tipo_unidad: valores canónicos sin duplicados de case
--   I4    numero_cotizacion (correlativo COT-YYYY-XXXX) en tabla cotizacion
-- ============================================================
-- Convenciones SQLite:
--   • Surrogate PK INTEGER en todas las entidades
--   • TEXT en lugar de VARCHAR (SQLite ignora longitud, documenta intención)
--   • Booleanos como INTEGER 0/1 (SQLite no tiene BOOLEAN nativo)
--   • Fechas como TEXT 'YYYY-MM-DD' para portabilidad
--   • Todos los porcentajes almacenados como decimal [0,1]
--   • created_at / updated_at en todas las tablas editables
--   • Triggers automáticos para updated_at
-- ============================================================

PRAGMA foreign_keys  = ON;
PRAGMA journal_mode  = WAL;
PRAGMA synchronous   = NORMAL;

-- ============================================================
-- TABLA 1: inmobiliaria
-- ============================================================
-- Fuente       : columna ALIANZA de PROYECTOS / STOCK NUEVOS
-- Cardinalidad : ~5 registros (INGEVEC, MAESTRA, RVC, TOCTOC, URMENETA)
-- Mantenedor   : Admin — CRUD completo
-- ============================================================
CREATE TABLE IF NOT EXISTS inmobiliaria (
  id_inmobiliaria   INTEGER   PRIMARY KEY,
  nombre            TEXT      NOT NULL,
  activo            INTEGER   NOT NULL DEFAULT 1,
  created_at        TEXT      NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT      NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT uq_inmobiliaria_nombre  UNIQUE (nombre),
  CONSTRAINT chk_inmobiliaria_activo CHECK (activo IN (0, 1))
);

CREATE TRIGGER IF NOT EXISTS trg_inmobiliaria_upd
  AFTER UPDATE ON inmobiliaria FOR EACH ROW
  BEGIN
    UPDATE inmobiliaria SET updated_at = datetime('now')
    WHERE id_inmobiliaria = NEW.id_inmobiliaria;
  END;

-- ============================================================
-- TABLA 2: programa  [ES.1 — NUEVO]
-- ============================================================
-- Catálogo de tipologías/programas de unidades.
-- Fuente       : columna PROGRAMA de STOCK NUEVOS y CONDICIONES_COMERCIALES
-- Cardinalidad : ~15 valores únicos (2D1B, 1D1B, Bodega, Estacionamiento…)
-- Rol           : clave de JOIN entre unidad y condicion_comercial
--                (reemplaza el TEXT directo — C2 corregido)
-- Mantenedor   : Admin — CRUD completo + script de importación
-- ============================================================
CREATE TABLE IF NOT EXISTS programa (
  id_programa   INTEGER   PRIMARY KEY,
  codigo        TEXT      NOT NULL,     -- '2D1B', 'Bodega', 'Estacionamiento', etc.
  descripcion   TEXT      NULL,         -- descripción legible (opcional)
  activo        INTEGER   NOT NULL DEFAULT 1,
  created_at    TEXT      NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT      NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT uq_programa_codigo  UNIQUE (codigo),
  CONSTRAINT chk_programa_activo CHECK (activo IN (0, 1))
);

CREATE TRIGGER IF NOT EXISTS trg_programa_upd
  AFTER UPDATE ON programa FOR EACH ROW
  BEGIN
    UPDATE programa SET updated_at = datetime('now')
    WHERE id_programa = NEW.id_programa;
  END;

-- ============================================================
-- TABLA 3: proyecto
-- ============================================================
-- Fuente       : hoja PROYECTOS (99 filas, nemotecnico único)
-- Mantenedor   : Admin — CRUD completo
-- ============================================================
CREATE TABLE IF NOT EXISTS proyecto (
  id_proyecto       INTEGER   PRIMARY KEY,
  id_inmobiliaria   INTEGER   NOT NULL,
  nemotecnico       TEXT      NOT NULL,   -- clave natural (ABD, TOC, etc.)
  nombre_proyecto   TEXT      NOT NULL,
  comuna            TEXT      NOT NULL,
  direccion         TEXT      NOT NULL,
  tipo_entrega      TEXT      NOT NULL DEFAULT 'Entrega Futura',
  periodo_entrega   TEXT      NOT NULL,
  activo            INTEGER   NOT NULL DEFAULT 1,
  created_at        TEXT      NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT      NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT fk_proyecto_inmobiliaria
    FOREIGN KEY (id_inmobiliaria) REFERENCES inmobiliaria(id_inmobiliaria)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT uq_proyecto_nemotecnico   UNIQUE (nemotecnico),
  CONSTRAINT uq_proyecto_nombre        UNIQUE (id_inmobiliaria, nombre_proyecto),
  CONSTRAINT chk_proyecto_tipo_entrega CHECK (tipo_entrega IN ('Entrega Inmediata', 'Entrega Futura')),
  CONSTRAINT chk_proyecto_activo       CHECK (activo IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_proyecto_inmobiliaria ON proyecto (id_inmobiliaria);
CREATE INDEX IF NOT EXISTS idx_proyecto_activo       ON proyecto (activo, id_inmobiliaria);
-- Índice para la cascada de selección: Comuna → Entrega Aprox → Inmobiliaria → Proyecto
CREATE INDEX IF NOT EXISTS idx_proyecto_cascada
  ON proyecto (comuna, tipo_entrega, id_inmobiliaria, activo)
  WHERE activo = 1;

CREATE TRIGGER IF NOT EXISTS trg_proyecto_upd
  AFTER UPDATE ON proyecto FOR EACH ROW
  BEGIN
    UPDATE proyecto SET updated_at = datetime('now')
    WHERE id_proyecto = NEW.id_proyecto;
  END;

-- ============================================================
-- TABLA 4: unidad
-- ============================================================
-- Fuente       : hoja STOCK NUEVOS (8.646 filas, 21 columnas)
-- Normalizado  : dormitorios → dormitorios_num + dormitorios_display (I2)
--                tipo_unidad → valores canónicos sin duplicados de case (I3)
--                programa → FK a tabla programa (ES.1)
-- Surrogate PK : necesaria — (nemo + tipo_unidad + num_unidad)
--                tiene 73 duplicados y 916 valores NULL en num_unidad
-- Mantenedor   : Admin — CRUD + importación masiva desde Excel
-- ============================================================
CREATE TABLE IF NOT EXISTS unidad (
  id_unidad             INTEGER   PRIMARY KEY,
  id_proyecto           INTEGER   NOT NULL,
  id_programa           INTEGER   NOT NULL,   -- [ES.1] FK → programa
  numero_unidad         INTEGER   NULL,       -- NULL para bodegas/estac sin número asignado
  tipo_unidad           TEXT      NOT NULL,
  piso_producto         INTEGER   NOT NULL DEFAULT 0,
  orientacion           TEXT      NULL,
  dormitorios_num       INTEGER   NULL,       -- [I2] para filtros numéricos: 0,1,2,3 (1.5 = studio)
  dormitorios_display   TEXT      NULL,       -- [I2] etiqueta UI: '1', '2', '1-1/2', 'BO', '#N/A'
  banios                INTEGER   NULL,
  superficie_terreno_m2 REAL      NOT NULL DEFAULT 0,
  superficie_util_m2    REAL      NULL,
  superficie_terraza_m2 REAL      NULL,
  superficie_total_m2   REAL      NOT NULL,
  precio_lista_uf       REAL      NOT NULL,
  estado_stock          TEXT      NOT NULL DEFAULT 'Disponible',
  bienes_conjuntos      TEXT      NULL,       -- texto crudo — solo trazabilidad importación (M3)
  created_at            TEXT      NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT      NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT fk_unidad_proyecto
    FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_unidad_programa
    FOREIGN KEY (id_programa) REFERENCES programa(id_programa)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  -- [I3] Tipos canónicos (normalizar en importación, 1 valor por concepto)
  CONSTRAINT chk_unidad_tipo CHECK (tipo_unidad IN (
    'Departamento',
    'Estacionamiento',
    'Estacionamiento Moto',
    'Bodega',
    'Local Comercial'
  )),
  CONSTRAINT chk_unidad_estado CHECK (estado_stock IN (
    'Disponible', 'Reservado', 'Vendido', 'Arrendado', 'En Recolocación'
  )),
  CONSTRAINT chk_unidad_precio CHECK (precio_lista_uf > 0),
  CONSTRAINT chk_unidad_sup   CHECK (superficie_total_m2 >= 0)
);

-- Unicidad parcial: solo cuando numero_unidad NO es NULL
CREATE UNIQUE INDEX IF NOT EXISTS uq_unidad_por_proyecto
  ON unidad (id_proyecto, tipo_unidad, numero_unidad)
  WHERE numero_unidad IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_unidad_proyecto    ON unidad (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_unidad_disponibles ON unidad (id_proyecto, estado_stock, tipo_unidad);
CREATE INDEX IF NOT EXISTS idx_unidad_numero      ON unidad (numero_unidad);
CREATE INDEX IF NOT EXISTS idx_unidad_precio      ON unidad (id_proyecto, precio_lista_uf);
-- JOIN con condicion_comercial: proyecto + tipo + programa
CREATE INDEX IF NOT EXISTS idx_unidad_condicion   ON unidad (id_proyecto, tipo_unidad, id_programa);

CREATE TRIGGER IF NOT EXISTS trg_unidad_upd
  AFTER UPDATE ON unidad FOR EACH ROW
  BEGIN
    UPDATE unidad SET updated_at = datetime('now')
    WHERE id_unidad = NEW.id_unidad;
  END;

-- ============================================================
-- TABLA 5: condicion_comercial
-- ============================================================
-- Fuente       : hoja CONDICIONES_COMERCIALES (309 filas)
-- Clave natural: (id_proyecto, tipo_unidad, id_programa) — única por combinación
-- ES.1         : programa TEXT → id_programa FK
-- ES.3         : campo modalidad_pago para discriminar plan de pago
-- Mantenedor   : Admin — CRUD + importación masiva
-- ============================================================
CREATE TABLE IF NOT EXISTS condicion_comercial (
  id_condicion             INTEGER   PRIMARY KEY,
  id_proyecto              INTEGER   NOT NULL,
  id_programa              INTEGER   NOT NULL,   -- [ES.1] FK → programa
  tipo_unidad              TEXT      NOT NULL,
  -- [ES.3] discriminador de modalidad de pago (P3.C1–P3.C3)
  modalidad_pago           TEXT      NOT NULL DEFAULT 'ESTANDAR',
  reserva_clp              INTEGER   NOT NULL DEFAULT 100000,
  descuento                REAL      NOT NULL DEFAULT 0.0,
  bono_pie                 REAL      NOT NULL DEFAULT 0.0,
  cuotas_pie               INTEGER   NOT NULL DEFAULT 0,
  pie_periodo_construccion REAL      NOT NULL DEFAULT 0.0,
  cuoton                   REAL      NOT NULL DEFAULT 0.0,
  pie_credito_directo      REAL      NOT NULL DEFAULT 0.0,
  activo                   INTEGER   NOT NULL DEFAULT 1,
  created_at               TEXT      NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT      NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT fk_condicion_proyecto
    FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_condicion_programa
    FOREIGN KEY (id_programa) REFERENCES programa(id_programa)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  -- Clave natural: una condición por proyecto + tipo + programa
  CONSTRAINT uq_condicion UNIQUE (id_proyecto, tipo_unidad, id_programa),

  -- [ES.3] Modalidades válidas
  CONSTRAINT chk_condicion_modalidad  CHECK (modalidad_pago IN ('ESTANDAR', 'CONSTRUCCION', 'CREDITO_DIRECTO')),
  CONSTRAINT chk_condicion_reserva    CHECK (reserva_clp >= 0),
  CONSTRAINT chk_condicion_descuento  CHECK (descuento >= 0 AND descuento <= 1),
  CONSTRAINT chk_condicion_bono_pie   CHECK (bono_pie >= 0 AND bono_pie <= 1),
  CONSTRAINT chk_condicion_cuotas     CHECK (cuotas_pie >= 0),
  CONSTRAINT chk_condicion_pie_constr CHECK (pie_periodo_construccion >= 0 AND pie_periodo_construccion <= 1),
  CONSTRAINT chk_condicion_cuoton     CHECK (cuoton >= 0 AND cuoton <= 1),
  CONSTRAINT chk_condicion_cred_dir   CHECK (pie_credito_directo >= 0 AND pie_credito_directo <= 1),
  CONSTRAINT chk_condicion_activo     CHECK (activo IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_condicion_proyecto ON condicion_comercial (id_proyecto, activo);
-- JOIN cotizador: proyecto + tipo_unidad + programa
CREATE INDEX IF NOT EXISTS idx_condicion_join
  ON condicion_comercial (id_proyecto, tipo_unidad, id_programa)
  WHERE activo = 1;

CREATE TRIGGER IF NOT EXISTS trg_condicion_upd
  AFTER UPDATE ON condicion_comercial FOR EACH ROW
  BEGIN
    UPDATE condicion_comercial SET updated_at = datetime('now')
    WHERE id_condicion = NEW.id_condicion;
  END;

-- ============================================================
-- TABLA 6: bien_conjunto
-- ============================================================
-- Fuente    : columna BIENES_CONJUNTOS de STOCK NUEVOS
-- Función   : resuelve la relación N:M entre Departamento y
--             sus bienes adicionales obligatorios (estac./bodega)
-- ============================================================
CREATE TABLE IF NOT EXISTS bien_conjunto (
  id_bien_conjunto    INTEGER   PRIMARY KEY,
  id_unidad_principal INTEGER   NOT NULL,   -- FK → Departamento
  id_unidad_asociada  INTEGER   NOT NULL,   -- FK → Estacionamiento o Bodega
  descripcion         TEXT      NULL,       -- texto crudo original para trazabilidad
  created_at          TEXT      NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT fk_bc_principal
    FOREIGN KEY (id_unidad_principal) REFERENCES unidad(id_unidad)
    ON DELETE CASCADE,
  CONSTRAINT fk_bc_asociada
    FOREIGN KEY (id_unidad_asociada) REFERENCES unidad(id_unidad)
    ON DELETE CASCADE,
  CONSTRAINT uq_bien_conjunto UNIQUE (id_unidad_principal, id_unidad_asociada),
  CONSTRAINT chk_bc_distintos CHECK (id_unidad_principal != id_unidad_asociada)
);

CREATE INDEX IF NOT EXISTS idx_bc_principal ON bien_conjunto (id_unidad_principal);
CREATE INDEX IF NOT EXISTS idx_bc_asociada  ON bien_conjunto (id_unidad_asociada);

-- ============================================================
-- TABLA 7: uf_valor
-- ============================================================
-- Fuente    : hoja UF (17.784 registros diarios 1977-08-01 → 2026-04-09)
-- Clave     : fecha 'YYYY-MM-DD' — único por día
-- ============================================================
CREATE TABLE IF NOT EXISTS uf_valor (
  fecha             TEXT    PRIMARY KEY,
  valor_uf          REAL    NOT NULL,
  variacion_diaria  REAL    NULL,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT chk_uf_valor CHECK (valor_uf > 0)
);

CREATE INDEX IF NOT EXISTS idx_uf_fecha_desc ON uf_valor (fecha DESC);

-- ============================================================
-- TABLA 8: broker  [ES.4 — NUEVO]
-- ============================================================
-- Entidad de primera clase para el corredor de propiedades.
-- Reemplaza el campo nombre_broker TEXT en cotizacion.
-- Mantenedor : Admin — CRUD completo
-- ============================================================
CREATE TABLE IF NOT EXISTS broker (
  id_broker     INTEGER   PRIMARY KEY,
  nombre        TEXT      NOT NULL,
  rut           TEXT      NOT NULL,
  email         TEXT      NOT NULL,
  telefono      TEXT      NULL,
  empresa       TEXT      NULL,
  activo        INTEGER   NOT NULL DEFAULT 1,
  created_at    TEXT      NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT      NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT uq_broker_rut   UNIQUE (rut),
  CONSTRAINT uq_broker_email UNIQUE (email),
  CONSTRAINT chk_broker_activo CHECK (activo IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_broker_activo ON broker (activo);

CREATE TRIGGER IF NOT EXISTS trg_broker_upd
  AFTER UPDATE ON broker FOR EACH ROW
  BEGIN
    UPDATE broker SET updated_at = datetime('now')
    WHERE id_broker = NEW.id_broker;
  END;

-- ============================================================
-- TABLA 9: parametro_cotizador
-- ============================================================
-- Fuente    : hoja aux (CAE, Pie%, Plazo) + constantes del sistema
-- Categorías: CAE | PIE_PCT | PLAZO | CONSTANTE
-- ============================================================
CREATE TABLE IF NOT EXISTS parametro_cotizador (
  id_parametro    INTEGER   PRIMARY KEY,
  categoria       TEXT      NOT NULL,
  clave           TEXT      NOT NULL,
  valor_numerico  REAL      NULL,
  etiqueta        TEXT      NOT NULL,
  orden           INTEGER   NOT NULL DEFAULT 0,
  es_default      INTEGER   NOT NULL DEFAULT 0,
  activo          INTEGER   NOT NULL DEFAULT 1,
  created_at      TEXT      NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT      NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT uq_parametro        UNIQUE (categoria, clave),
  CONSTRAINT chk_param_categoria CHECK (categoria IN ('CAE', 'PIE_PCT', 'PLAZO', 'CONSTANTE')),
  CONSTRAINT chk_param_default   CHECK (es_default IN (0, 1)),
  CONSTRAINT chk_param_activo    CHECK (activo IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_parametro_categoria ON parametro_cotizador (categoria, activo);

CREATE TRIGGER IF NOT EXISTS trg_parametro_upd
  AFTER UPDATE ON parametro_cotizador FOR EACH ROW
  BEGIN
    UPDATE parametro_cotizador SET updated_at = datetime('now')
    WHERE id_parametro = NEW.id_parametro;
  END;

-- ============================================================
-- TABLA 10: cotizacion
-- ============================================================
-- Snapshot inmutable de cada cotización generada.
-- Cambios v2:
--   [ES.2] cae_1/2/3, arriendo_1/2/3, roi_5anios, roi_anual, cap_rate
--          → normalizados en cotizacion_escenario
--   [ES.4] nombre_broker TEXT → id_broker INTEGER FK
--   [C1]   campos snapshot de condiciones comerciales al momento del cálculo
--   [I4]   numero_cotizacion (correlativo COT-YYYY-XXXX)
-- Mantenedor : Solo lectura para Admin; INSERT desde la app
-- ============================================================
CREATE TABLE IF NOT EXISTS cotizacion (
  id_cotizacion            INTEGER   PRIMARY KEY,
  numero_cotizacion        TEXT      NOT NULL,   -- [I4] ej: 'COT-2026-0001'
  fecha_generacion         TEXT      NOT NULL DEFAULT (datetime('now')),

  -- Broker y unidad
  id_broker                INTEGER   NOT NULL,   -- [ES.4] FK → broker
  id_unidad                INTEGER   NOT NULL,
  id_condicion             INTEGER   NOT NULL,

  -- Cliente (texto libre en v1 — sin entidad cliente)
  nombre_cliente           TEXT      NULL,
  rut_cliente              TEXT      NULL,
  email_cliente            TEXT      NULL,
  celular_cliente          TEXT      NULL,

  -- Parámetros del cálculo
  valor_uf_snapshot        REAL      NOT NULL,
  pie_pct                  REAL      NOT NULL,
  n_cuotas_pie             INTEGER   NOT NULL,
  plazo_anios              INTEGER   NOT NULL,
  plusvalia_anual_pct      REAL      NOT NULL DEFAULT 0.02,

  -- [C1] Snapshot de condiciones comerciales al momento de cotizar
  descuento_pct_snapshot         REAL   NOT NULL DEFAULT 0.0,
  bono_pie_pct_snapshot          REAL   NOT NULL DEFAULT 0.0,
  cuoton_pct_snapshot            REAL   NOT NULL DEFAULT 0.0,
  pie_periodo_constr_pct_snapshot REAL  NOT NULL DEFAULT 0.0,
  pie_credito_directo_pct_snapshot REAL NOT NULL DEFAULT 0.0,
  reserva_clp_snapshot           INTEGER NOT NULL DEFAULT 100000,
  modalidad_pago_snapshot        TEXT   NOT NULL DEFAULT 'ESTANDAR',

  -- Resultados calculados (snapshot agregado)
  precio_lista_uf          REAL      NOT NULL,
  precio_venta_uf          REAL      NOT NULL,
  tasacion_uf              REAL      NULL,
  pie_total_uf             REAL      NOT NULL,
  total_pie_inmob_uf       REAL      NOT NULL,   -- incluye cuotón + pie construcción
  ch_final_uf              REAL      NOT NULL,

  CONSTRAINT uq_numero_cotizacion UNIQUE (numero_cotizacion),

  CONSTRAINT fk_cotizacion_broker
    FOREIGN KEY (id_broker) REFERENCES broker(id_broker)
    ON DELETE RESTRICT,
  CONSTRAINT fk_cotizacion_unidad
    FOREIGN KEY (id_unidad) REFERENCES unidad(id_unidad)
    ON DELETE RESTRICT,
  CONSTRAINT fk_cotizacion_condicion
    FOREIGN KEY (id_condicion) REFERENCES condicion_comercial(id_condicion)
    ON DELETE RESTRICT,

  CONSTRAINT chk_cotizacion_modalidad_snap CHECK (
    modalidad_pago_snapshot IN ('ESTANDAR', 'CONSTRUCCION', 'CREDITO_DIRECTO')
  )
);

CREATE INDEX IF NOT EXISTS idx_cotizacion_broker  ON cotizacion (id_broker, fecha_generacion DESC);
CREATE INDEX IF NOT EXISTS idx_cotizacion_unidad  ON cotizacion (id_unidad);
CREATE INDEX IF NOT EXISTS idx_cotizacion_fecha   ON cotizacion (fecha_generacion DESC);
CREATE INDEX IF NOT EXISTS idx_cotizacion_numero  ON cotizacion (numero_cotizacion);

-- ============================================================
-- TABLA 11: cotizacion_escenario  [ES.2 — NUEVO]
-- ============================================================
-- Normaliza los 3 escenarios CAE de cada cotización.
-- Reemplaza las columnas cae_1/2/3, arriendo_1/2/3, roi_5anios,
-- roi_anual y cap_rate que estaban denormalizadas en cotizacion.
-- ============================================================
CREATE TABLE IF NOT EXISTS cotizacion_escenario (
  id_escenario       INTEGER   PRIMARY KEY,
  id_cotizacion      INTEGER   NOT NULL,
  numero_escenario   INTEGER   NOT NULL,    -- 1, 2 o 3
  cae                REAL      NOT NULL,    -- tasa CAE decimal (ej: 0.04)
  arriendo_clp       INTEGER   NULL,        -- arriendo estimado mensual
  cuota_mensual_clp  INTEGER   NOT NULL,
  cuota_mensual_uf   REAL      NOT NULL,
  flujo_mensual_clp  INTEGER   NOT NULL,    -- arriendo - cuota (puede ser negativo)
  flujo_acum_clp     INTEGER   NOT NULL,    -- flujo * 11 meses * 5 años
  roi_5anios         REAL      NULL,        -- decimal: 0.32 = 32%
  roi_anual          REAL      NULL,        -- decimal: tasa anual compuesta
  cap_rate           REAL      NULL,        -- decimal: arriendo_anual / tasacion

  CONSTRAINT fk_escenario_cotizacion
    FOREIGN KEY (id_cotizacion) REFERENCES cotizacion(id_cotizacion)
    ON DELETE CASCADE,
  CONSTRAINT uq_escenario UNIQUE (id_cotizacion, numero_escenario),
  CONSTRAINT chk_escenario_numero CHECK (numero_escenario IN (1, 2, 3))
);

CREATE INDEX IF NOT EXISTS idx_escenario_cotizacion ON cotizacion_escenario (id_cotizacion);

-- ============================================================
-- VISTA: v_stock_cotizable
-- ============================================================
-- JOIN operativo del cotizador: unidad + condicion + proyecto + inmobiliaria + programa.
-- Solo unidades disponibles con condición activa.
-- Expone `programa_codigo` para compatibilidad con la lógica de negocio.
-- ============================================================
CREATE VIEW IF NOT EXISTS v_stock_cotizable AS
SELECT
  -- Identificadores
  u.id_unidad,
  u.id_proyecto,
  cc.id_condicion,
  -- Proyecto / Inmobiliaria
  i.nombre                    AS alianza,
  p.nemotecnico,
  p.nombre_proyecto,
  p.tipo_entrega,
  p.periodo_entrega,
  p.direccion,
  p.comuna,
  -- Unidad
  u.numero_unidad,
  u.tipo_unidad,
  pr.codigo                   AS programa,   -- texto del programa para la UI
  u.id_programa,
  u.piso_producto,
  u.orientacion,
  u.dormitorios_num,
  u.dormitorios_display,
  u.banios,
  u.superficie_terreno_m2,
  u.superficie_util_m2,
  u.superficie_terraza_m2,
  u.superficie_total_m2,
  u.precio_lista_uf,
  u.estado_stock,
  u.bienes_conjuntos,
  -- Condiciones comerciales
  cc.modalidad_pago,
  cc.reserva_clp,
  cc.descuento,
  cc.bono_pie,
  cc.cuotas_pie,
  cc.pie_periodo_construccion,
  cc.cuoton,
  cc.pie_credito_directo
FROM unidad u
JOIN programa              pr  ON pr.id_programa    = u.id_programa
JOIN proyecto              p   ON p.id_proyecto     = u.id_proyecto
JOIN inmobiliaria          i   ON i.id_inmobiliaria = p.id_inmobiliaria
LEFT JOIN condicion_comercial cc
  ON  cc.id_proyecto = u.id_proyecto
  AND cc.tipo_unidad = u.tipo_unidad
  AND cc.id_programa = u.id_programa
  AND cc.activo      = 1
WHERE
  u.estado_stock = 'Disponible'
  AND p.activo   = 1
  AND i.activo   = 1
  AND pr.activo  = 1;

-- ============================================================
-- DATOS SEMILLA: programa
-- Fuente: valores únicos reales del campo PROGRAMA de STOCK NUEVOS
-- Nota: el script de importación debe usar INSERT OR IGNORE para
--       agregar nuevos códigos encontrados en el Excel.
-- ============================================================
INSERT OR IGNORE INTO programa (codigo, descripcion) VALUES
  -- Tipologías de departamentos
  ('1D1B',       '1 dormitorio, 1 baño'),
  ('1D2B',       '1 dormitorio, 2 baños'),
  ('1-1/2 D1B',  '1½ dormitorios, 1 baño'),
  ('1-1/2 D2B',  '1½ dormitorios, 2 baños'),
  ('2D1B',       '2 dormitorios, 1 baño'),
  ('2D2B',       '2 dormitorios, 2 baños'),
  ('3D2B',       '3 dormitorios, 2 baños'),
  ('3D3B',       '3 dormitorios, 3 baños'),
  ('4D3B',       '4 dormitorios, 3 baños'),
  ('Loft',       'Loft / Studio'),
  -- Bienes complementarios
  ('Bodega',           'Bodega'),
  ('Estacionamiento',  'Estacionamiento'),
  ('Estac. Moto',      'Estacionamiento de moto'),
  ('Local Comercial',  'Local comercial');

-- ============================================================
-- DATOS SEMILLA: parametro_cotizador
-- Fuente: hoja aux + constantes del modelo COTIZADOR
-- ============================================================
INSERT OR IGNORE INTO parametro_cotizador
  (categoria, clave, valor_numerico, etiqueta, orden, es_default, activo)
VALUES
  -- ── Tasas CAE (hoja aux, col C) ─────────────────────────
  ('CAE', 'cae_035', 0.035, '3.5%', 1, 0, 1),
  ('CAE', 'cae_040', 0.040, '4.0%', 2, 1, 1),   -- default escenario 1
  ('CAE', 'cae_045', 0.045, '4.5%', 3, 1, 1),   -- default escenario 2
  ('CAE', 'cae_050', 0.050, '5.0%', 4, 1, 1),   -- default escenario 3
  -- ── Porcentajes de Pie (hoja aux, col D) ─────────────────
  ('PIE_PCT', 'pie_000', 0.00, '0%',  1, 0, 1),
  ('PIE_PCT', 'pie_005', 0.05, '5%',  2, 0, 1),
  ('PIE_PCT', 'pie_010', 0.10, '10%', 3, 1, 1),  -- default
  ('PIE_PCT', 'pie_015', 0.15, '15%', 4, 0, 1),
  ('PIE_PCT', 'pie_020', 0.20, '20%', 5, 0, 1),
  ('PIE_PCT', 'pie_025', 0.25, '25%', 6, 0, 1),
  ('PIE_PCT', 'pie_030', 0.30, '30%', 7, 0, 1),
  ('PIE_PCT', 'pie_035', 0.35, '35%', 8, 0, 1),
  ('PIE_PCT', 'pie_040', 0.40, '40%', 9, 0, 1),
  -- ── Plazos hipotecarios (hoja aux, col F) ────────────────
  ('PLAZO', 'plazo_20', 20, '20 años', 1, 0, 1),
  ('PLAZO', 'plazo_25', 25, '25 años', 2, 0, 1),
  ('PLAZO', 'plazo_30', 30, '30 años', 3, 1, 1),  -- default
  -- ── Constantes del modelo de cálculo ────────────────────
  ('CONSTANTE', 'UPFRONT_PCT',         0.02,  'Upfront a la Promesa (%)',          1, 0, 1),
  ('CONSTANTE', 'APORTE_INMOB_PCT',    0.10,  'Aporte Inmobiliaria (%)',           2, 0, 1),
  ('CONSTANTE', 'MESES_ARRIENDO_ANIO', 11,    'Meses de arriendo por año',         3, 0, 1),
  ('CONSTANTE', 'HAIRCUT_VENTA',       0.95,  'Factor precio de venta año 5',      4, 0, 1),
  ('CONSTANTE', 'FACTOR_LTV',          0.67,  'Factor LTV amortización 60 meses',  5, 0, 1),
  ('CONSTANTE', 'PLUSVALIA_DEFAULT',   0.02,  'Plusvalía anual estimada default',  6, 0, 1);
