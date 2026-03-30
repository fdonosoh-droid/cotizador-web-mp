-- ============================================================
-- SCHEMA: COTIZADOR WEB MERCADO PRIMARIO — PostgreSQL
-- Motor:  PostgreSQL 15+ (producción)
-- Stack:  React 19 + Next.js 15 + Drizzle ORM / pg
-- Fuente: INPUT_FILES.xlsx → importación masiva + actualizaciones
-- ============================================================
-- REVISIÓN v2 — 2026-03-30
--   ES.1  Tabla maestra `programa` con FK en unidad y condicion_comercial
--   ES.2  Tabla hija `cotizacion_escenario` normaliza los 3 escenarios CAE
--   ES.3  Campo `modalidad_pago` en condicion_comercial
--   ES.4  Entidad `broker` con FK en cotizacion
--   C1    Snapshot de condiciones comerciales en cotizacion
--   I2    dormitorios_num + dormitorios_display (ya estaba)
--   I3    tipo_unidad: valores canónicos sin duplicados de case
--   I4    numero_cotizacion (COT-YYYY-XXXX) en cotizacion
-- ============================================================
-- Diferencias clave respecto al schema SQLite:
--   • INTEGER PRIMARY KEY → INTEGER GENERATED ALWAYS AS IDENTITY
--   • INTEGER 0/1 (booleano) → BOOLEAN
--   • TEXT 'YYYY-MM-DD' (fecha) → DATE / TIMESTAMPTZ
--   • REAL (finanzas) → NUMERIC(12,4) para precisión decimal exacta
--   • REAL (porcentajes) → NUMERIC(6,4)
--   • PRAGMA → eliminados
--   • Triggers → PL/pgSQL con función compartida set_updated_at()
--   • INSERT OR IGNORE → INSERT ... ON CONFLICT DO NOTHING
--   • CREATE VIEW IF NOT EXISTS → CREATE OR REPLACE VIEW
-- ============================================================

-- ============================================================
-- FUNCIÓN COMPARTIDA: set_updated_at()
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TABLA 1: inmobiliaria
-- ============================================================
CREATE TABLE IF NOT EXISTS inmobiliaria (
  id_inmobiliaria  INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre           TEXT          NOT NULL,
  activo           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_inmobiliaria_nombre UNIQUE (nombre)
);

CREATE TRIGGER trg_inmobiliaria_upd
  BEFORE UPDATE ON inmobiliaria
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLA 2: programa  [ES.1 — NUEVO]
-- ============================================================
-- Catálogo de tipologías/programas de unidades.
-- Clave de JOIN entre unidad y condicion_comercial.
-- ============================================================
CREATE TABLE IF NOT EXISTS programa (
  id_programa   INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo        TEXT          NOT NULL,
  descripcion   TEXT          NULL,
  activo        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_programa_codigo UNIQUE (codigo)
);

CREATE TRIGGER trg_programa_upd
  BEFORE UPDATE ON programa
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLA 3: proyecto
-- ============================================================
CREATE TABLE IF NOT EXISTS proyecto (
  id_proyecto      INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_inmobiliaria  INTEGER       NOT NULL,
  nemotecnico      TEXT          NOT NULL,
  nombre_proyecto  TEXT          NOT NULL,
  comuna           TEXT          NOT NULL,
  direccion        TEXT          NOT NULL,
  tipo_entrega     TEXT          NOT NULL DEFAULT 'Entrega Futura',
  periodo_entrega  TEXT          NOT NULL,
  activo           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_proyecto_inmobiliaria
    FOREIGN KEY (id_inmobiliaria) REFERENCES inmobiliaria(id_inmobiliaria)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT uq_proyecto_nemotecnico UNIQUE (nemotecnico),
  CONSTRAINT uq_proyecto_nombre      UNIQUE (id_inmobiliaria, nombre_proyecto),
  CONSTRAINT chk_proyecto_tipo_entrega
    CHECK (tipo_entrega IN ('Entrega Inmediata', 'Entrega Futura'))
);

CREATE INDEX IF NOT EXISTS idx_proyecto_inmobiliaria ON proyecto (id_inmobiliaria);
CREATE INDEX IF NOT EXISTS idx_proyecto_activo       ON proyecto (activo, id_inmobiliaria);
CREATE INDEX IF NOT EXISTS idx_proyecto_cascada
  ON proyecto (comuna, tipo_entrega, id_inmobiliaria, activo)
  WHERE activo = TRUE;

CREATE TRIGGER trg_proyecto_upd
  BEFORE UPDATE ON proyecto
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLA 4: unidad
-- ============================================================
-- [ES.1] programa TEXT → id_programa INTEGER FK
-- [I3]   tipo_unidad: valores canónicos sin duplicados de case
-- ============================================================
CREATE TABLE IF NOT EXISTS unidad (
  id_unidad             INTEGER         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_proyecto           INTEGER         NOT NULL,
  id_programa           INTEGER         NOT NULL,   -- [ES.1] FK → programa
  numero_unidad         INTEGER         NULL,
  tipo_unidad           TEXT            NOT NULL,
  piso_producto         INTEGER         NOT NULL DEFAULT 0,
  orientacion           TEXT            NULL,
  dormitorios_num       INTEGER         NULL,       -- [I2] filtros numéricos
  dormitorios_display   TEXT            NULL,       -- [I2] etiqueta UI
  banios                INTEGER         NULL,
  superficie_terreno_m2 NUMERIC(10,2)   NOT NULL DEFAULT 0,
  superficie_util_m2    NUMERIC(10,2)   NULL,
  superficie_terraza_m2 NUMERIC(10,2)   NULL,
  superficie_total_m2   NUMERIC(10,2)   NOT NULL,
  precio_lista_uf       NUMERIC(12,4)   NOT NULL,
  estado_stock          TEXT            NOT NULL DEFAULT 'Disponible',
  bienes_conjuntos      TEXT            NULL,       -- solo trazabilidad importación (M3)
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_unidad_proyecto
    FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_unidad_programa
    FOREIGN KEY (id_programa) REFERENCES programa(id_programa)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  -- [I3] Valores canónicos: 1 valor por concepto
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_unidad_por_proyecto
  ON unidad (id_proyecto, tipo_unidad, numero_unidad)
  WHERE numero_unidad IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_unidad_proyecto    ON unidad (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_unidad_disponibles ON unidad (id_proyecto, estado_stock, tipo_unidad);
CREATE INDEX IF NOT EXISTS idx_unidad_numero      ON unidad (numero_unidad);
CREATE INDEX IF NOT EXISTS idx_unidad_precio      ON unidad (id_proyecto, precio_lista_uf);
CREATE INDEX IF NOT EXISTS idx_unidad_condicion   ON unidad (id_proyecto, tipo_unidad, id_programa);

CREATE TRIGGER trg_unidad_upd
  BEFORE UPDATE ON unidad
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLA 5: condicion_comercial
-- ============================================================
-- [ES.1] programa TEXT → id_programa INTEGER FK
-- [ES.3] campo modalidad_pago
-- ============================================================
CREATE TABLE IF NOT EXISTS condicion_comercial (
  id_condicion             INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_proyecto              INTEGER       NOT NULL,
  id_programa              INTEGER       NOT NULL,   -- [ES.1] FK → programa
  tipo_unidad              TEXT          NOT NULL,
  modalidad_pago           TEXT          NOT NULL DEFAULT 'ESTANDAR',  -- [ES.3]
  reserva_clp              INTEGER       NOT NULL DEFAULT 100000,
  descuento                NUMERIC(6,4)  NOT NULL DEFAULT 0.0,
  bono_pie                 NUMERIC(6,4)  NOT NULL DEFAULT 0.0,
  cuotas_pie               INTEGER       NOT NULL DEFAULT 0,
  pie_periodo_construccion NUMERIC(6,4)  NOT NULL DEFAULT 0.0,
  cuoton                   NUMERIC(6,4)  NOT NULL DEFAULT 0.0,
  pie_credito_directo      NUMERIC(6,4)  NOT NULL DEFAULT 0.0,
  activo                   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_condicion_proyecto
    FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_condicion_programa
    FOREIGN KEY (id_programa) REFERENCES programa(id_programa)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT uq_condicion UNIQUE (id_proyecto, tipo_unidad, id_programa),

  CONSTRAINT chk_condicion_modalidad  CHECK (modalidad_pago IN ('ESTANDAR', 'CONSTRUCCION', 'CREDITO_DIRECTO')),
  CONSTRAINT chk_condicion_reserva    CHECK (reserva_clp >= 0),
  CONSTRAINT chk_condicion_descuento  CHECK (descuento  >= 0 AND descuento  <= 1),
  CONSTRAINT chk_condicion_bono_pie   CHECK (bono_pie   >= 0 AND bono_pie   <= 1),
  CONSTRAINT chk_condicion_cuotas     CHECK (cuotas_pie >= 0),
  CONSTRAINT chk_condicion_pie_constr CHECK (pie_periodo_construccion >= 0 AND pie_periodo_construccion <= 1),
  CONSTRAINT chk_condicion_cuoton     CHECK (cuoton >= 0 AND cuoton <= 1),
  CONSTRAINT chk_condicion_cred_dir   CHECK (pie_credito_directo >= 0 AND pie_credito_directo <= 1)
);

CREATE INDEX IF NOT EXISTS idx_condicion_proyecto ON condicion_comercial (id_proyecto, activo);
CREATE INDEX IF NOT EXISTS idx_condicion_join
  ON condicion_comercial (id_proyecto, tipo_unidad, id_programa)
  WHERE activo = TRUE;

CREATE TRIGGER trg_condicion_upd
  BEFORE UPDATE ON condicion_comercial
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLA 6: bien_conjunto
-- ============================================================
CREATE TABLE IF NOT EXISTS bien_conjunto (
  id_bien_conjunto    INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_unidad_principal INTEGER     NOT NULL,
  id_unidad_asociada  INTEGER     NOT NULL,
  descripcion         TEXT        NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_bc_principal
    FOREIGN KEY (id_unidad_principal) REFERENCES unidad(id_unidad) ON DELETE CASCADE,
  CONSTRAINT fk_bc_asociada
    FOREIGN KEY (id_unidad_asociada)  REFERENCES unidad(id_unidad) ON DELETE CASCADE,
  CONSTRAINT uq_bien_conjunto UNIQUE (id_unidad_principal, id_unidad_asociada),
  CONSTRAINT chk_bc_distintos CHECK (id_unidad_principal != id_unidad_asociada)
);

CREATE INDEX IF NOT EXISTS idx_bc_principal ON bien_conjunto (id_unidad_principal);
CREATE INDEX IF NOT EXISTS idx_bc_asociada  ON bien_conjunto (id_unidad_asociada);

-- ============================================================
-- TABLA 7: uf_valor
-- ============================================================
-- Fase prod: actualizar diariamente via API CMF (api.cmfchile.cl)
-- ============================================================
CREATE TABLE IF NOT EXISTS uf_valor (
  fecha            DATE          PRIMARY KEY,
  valor_uf         NUMERIC(12,4) NOT NULL,
  variacion_diaria NUMERIC(8,6)  NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_uf_valor CHECK (valor_uf > 0)
);

CREATE INDEX IF NOT EXISTS idx_uf_fecha_desc ON uf_valor (fecha DESC);

-- ============================================================
-- TABLA 8: broker  [ES.4 — NUEVO]
-- ============================================================
CREATE TABLE IF NOT EXISTS broker (
  id_broker     INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre        TEXT          NOT NULL,
  rut           TEXT          NOT NULL,
  email         TEXT          NOT NULL,
  telefono      TEXT          NULL,
  empresa       TEXT          NULL,
  activo        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_broker_rut   UNIQUE (rut),
  CONSTRAINT uq_broker_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_broker_activo ON broker (activo);

CREATE TRIGGER trg_broker_upd
  BEFORE UPDATE ON broker
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLA 9: parametro_cotizador
-- ============================================================
CREATE TABLE IF NOT EXISTS parametro_cotizador (
  id_parametro    INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  categoria       TEXT          NOT NULL,
  clave           TEXT          NOT NULL,
  valor_numerico  NUMERIC(12,6) NULL,
  etiqueta        TEXT          NOT NULL,
  orden           INTEGER       NOT NULL DEFAULT 0,
  es_default      BOOLEAN       NOT NULL DEFAULT FALSE,
  activo          BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_parametro        UNIQUE (categoria, clave),
  CONSTRAINT chk_param_categoria CHECK (categoria IN ('CAE', 'PIE_PCT', 'PLAZO', 'CONSTANTE'))
);

CREATE INDEX IF NOT EXISTS idx_parametro_categoria ON parametro_cotizador (categoria, activo);

CREATE TRIGGER trg_parametro_upd
  BEFORE UPDATE ON parametro_cotizador
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLA 10: cotizacion
-- ============================================================
-- [ES.2] cae_1/2/3 y resultados → normalizados en cotizacion_escenario
-- [ES.4] nombre_broker TEXT → id_broker FK
-- [C1]   snapshot de condiciones comerciales al momento del cálculo
-- [I4]   numero_cotizacion (COT-YYYY-XXXX)
-- ============================================================
CREATE TABLE IF NOT EXISTS cotizacion (
  id_cotizacion            INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero_cotizacion        TEXT          NOT NULL,   -- [I4] 'COT-2026-0001'
  fecha_generacion         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Broker y unidad
  id_broker                INTEGER       NOT NULL,   -- [ES.4]
  id_unidad                INTEGER       NOT NULL,
  id_condicion             INTEGER       NULL,       -- NULL si la unidad no tiene condición activa

  -- Cliente (texto libre en v1)
  nombre_cliente           TEXT          NULL,
  rut_cliente              TEXT          NULL,
  email_cliente            TEXT          NULL,
  celular_cliente          TEXT          NULL,

  -- Parámetros del cálculo
  valor_uf_snapshot        NUMERIC(12,4) NOT NULL,
  pie_pct                  NUMERIC(6,4)  NOT NULL,
  n_cuotas_pie             INTEGER       NOT NULL,
  plazo_anios              INTEGER       NOT NULL,
  plusvalia_anual_pct      NUMERIC(6,4)  NOT NULL DEFAULT 0.02,

  -- [C1] Snapshot de condiciones comerciales al momento de cotizar
  descuento_pct_snapshot            NUMERIC(6,4) NOT NULL DEFAULT 0.0,
  bono_pie_pct_snapshot             NUMERIC(6,4) NOT NULL DEFAULT 0.0,
  cuoton_pct_snapshot               NUMERIC(6,4) NOT NULL DEFAULT 0.0,
  pie_periodo_constr_pct_snapshot   NUMERIC(6,4) NOT NULL DEFAULT 0.0,
  pie_credito_directo_pct_snapshot  NUMERIC(6,4) NOT NULL DEFAULT 0.0,
  reserva_clp_snapshot              INTEGER      NOT NULL DEFAULT 100000,
  modalidad_pago_snapshot           TEXT         NOT NULL DEFAULT 'ESTANDAR',

  -- Resultados calculados (snapshot agregado)
  precio_lista_uf          NUMERIC(12,4) NOT NULL,
  precio_venta_uf          NUMERIC(12,4) NOT NULL,
  tasacion_uf              NUMERIC(12,4) NULL,
  pie_total_uf             NUMERIC(12,4) NOT NULL,
  total_pie_inmob_uf       NUMERIC(12,4) NOT NULL,
  ch_final_uf              NUMERIC(12,4) NOT NULL,

  CONSTRAINT uq_numero_cotizacion UNIQUE (numero_cotizacion),

  CONSTRAINT fk_cotizacion_broker
    FOREIGN KEY (id_broker) REFERENCES broker(id_broker) ON DELETE RESTRICT,
  CONSTRAINT fk_cotizacion_unidad
    FOREIGN KEY (id_unidad) REFERENCES unidad(id_unidad) ON DELETE RESTRICT,
  CONSTRAINT fk_cotizacion_condicion
    FOREIGN KEY (id_condicion) REFERENCES condicion_comercial(id_condicion) ON DELETE RESTRICT,

  CONSTRAINT chk_cotizacion_modalidad_snap
    CHECK (modalidad_pago_snapshot IN ('ESTANDAR', 'CONSTRUCCION', 'CREDITO_DIRECTO'))
);

CREATE INDEX IF NOT EXISTS idx_cotizacion_broker  ON cotizacion (id_broker, fecha_generacion DESC);
CREATE INDEX IF NOT EXISTS idx_cotizacion_unidad  ON cotizacion (id_unidad);
CREATE INDEX IF NOT EXISTS idx_cotizacion_fecha   ON cotizacion (fecha_generacion DESC);
CREATE INDEX IF NOT EXISTS idx_cotizacion_numero  ON cotizacion (numero_cotizacion);

-- ============================================================
-- TABLA 11: cotizacion_escenario  [ES.2 — NUEVO]
-- ============================================================
CREATE TABLE IF NOT EXISTS cotizacion_escenario (
  id_escenario       INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_cotizacion      INTEGER       NOT NULL,
  numero_escenario   INTEGER       NOT NULL,    -- 1, 2 o 3
  cae                NUMERIC(6,4)  NOT NULL,
  arriendo_clp       INTEGER       NULL,
  cuota_mensual_clp  INTEGER       NOT NULL,
  cuota_mensual_uf   NUMERIC(10,4) NOT NULL,
  flujo_mensual_clp  INTEGER       NOT NULL,
  flujo_acum_clp     INTEGER       NOT NULL,
  roi_5anios         NUMERIC(8,4)  NULL,
  roi_anual          NUMERIC(8,4)  NULL,
  cap_rate           NUMERIC(8,4)  NULL,

  CONSTRAINT fk_escenario_cotizacion
    FOREIGN KEY (id_cotizacion) REFERENCES cotizacion(id_cotizacion) ON DELETE CASCADE,
  CONSTRAINT uq_escenario        UNIQUE (id_cotizacion, numero_escenario),
  CONSTRAINT chk_escenario_numero CHECK (numero_escenario IN (1, 2, 3))
);

CREATE INDEX IF NOT EXISTS idx_escenario_cotizacion ON cotizacion_escenario (id_cotizacion);

-- ============================================================
-- VISTA: v_stock_cotizable
-- ============================================================
CREATE OR REPLACE VIEW v_stock_cotizable AS
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
JOIN programa              pr  ON pr.id_programa    = u.id_programa    AND pr.activo = TRUE
JOIN proyecto              p   ON p.id_proyecto     = u.id_proyecto    AND p.activo  = TRUE
JOIN inmobiliaria          i   ON i.id_inmobiliaria = p.id_inmobiliaria AND i.activo = TRUE
LEFT JOIN condicion_comercial cc
  ON  cc.id_proyecto = u.id_proyecto
  AND cc.tipo_unidad = u.tipo_unidad
  AND cc.id_programa = u.id_programa
  AND cc.activo      = TRUE
WHERE u.estado_stock = 'Disponible';

-- ============================================================
-- DATOS SEMILLA: programa
-- ============================================================
INSERT INTO programa (codigo, descripcion) VALUES
  ('1D1B',         '1 dormitorio, 1 baño'),
  ('1D2B',         '1 dormitorio, 2 baños'),
  ('1-1/2 D1B',    '1½ dormitorios, 1 baño'),
  ('1-1/2 D2B',    '1½ dormitorios, 2 baños'),
  ('2D1B',         '2 dormitorios, 1 baño'),
  ('2D2B',         '2 dormitorios, 2 baños'),
  ('3D2B',         '3 dormitorios, 2 baños'),
  ('3D3B',         '3 dormitorios, 3 baños'),
  ('4D3B',         '4 dormitorios, 3 baños'),
  ('Loft',         'Loft / Studio'),
  ('Bodega',           'Bodega'),
  ('Estacionamiento',  'Estacionamiento'),
  ('Estac. Moto',      'Estacionamiento de moto'),
  ('Local Comercial',  'Local comercial')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- DATOS SEMILLA: parametro_cotizador
-- ============================================================
INSERT INTO parametro_cotizador
  (categoria, clave, valor_numerico, etiqueta, orden, es_default, activo)
VALUES
  ('CAE', 'cae_035', 0.035, '3.5%', 1, FALSE, TRUE),
  ('CAE', 'cae_040', 0.040, '4.0%', 2, TRUE,  TRUE),
  ('CAE', 'cae_045', 0.045, '4.5%', 3, TRUE,  TRUE),
  ('CAE', 'cae_050', 0.050, '5.0%', 4, TRUE,  TRUE),
  ('PIE_PCT', 'pie_000', 0.00, '0%',  1, FALSE, TRUE),
  ('PIE_PCT', 'pie_005', 0.05, '5%',  2, FALSE, TRUE),
  ('PIE_PCT', 'pie_010', 0.10, '10%', 3, TRUE,  TRUE),
  ('PIE_PCT', 'pie_015', 0.15, '15%', 4, FALSE, TRUE),
  ('PIE_PCT', 'pie_020', 0.20, '20%', 5, FALSE, TRUE),
  ('PIE_PCT', 'pie_025', 0.25, '25%', 6, FALSE, TRUE),
  ('PIE_PCT', 'pie_030', 0.30, '30%', 7, FALSE, TRUE),
  ('PIE_PCT', 'pie_035', 0.35, '35%', 8, FALSE, TRUE),
  ('PIE_PCT', 'pie_040', 0.40, '40%', 9, FALSE, TRUE),
  ('PLAZO', 'plazo_20', 20, '20 años', 1, FALSE, TRUE),
  ('PLAZO', 'plazo_25', 25, '25 años', 2, FALSE, TRUE),
  ('PLAZO', 'plazo_30', 30, '30 años', 3, TRUE,  TRUE),
  ('CONSTANTE', 'UPFRONT_PCT',         0.02, 'Upfront a la Promesa (%)',         1, FALSE, TRUE),
  ('CONSTANTE', 'APORTE_INMOB_PCT',    0.10, 'Aporte Inmobiliaria (%)',          2, FALSE, TRUE),
  ('CONSTANTE', 'MESES_ARRIENDO_ANIO', 11,   'Meses de arriendo por año',        3, FALSE, TRUE),
  ('CONSTANTE', 'HAIRCUT_VENTA',       0.95, 'Factor precio de venta año 5',     4, FALSE, TRUE),
  ('CONSTANTE', 'FACTOR_LTV',          0.67, 'Factor LTV amortización 60 meses', 5, FALSE, TRUE),
  ('CONSTANTE', 'PLUSVALIA_DEFAULT',   0.02, 'Plusvalía anual estimada default',  6, FALSE, TRUE)
ON CONFLICT (categoria, clave) DO NOTHING;
