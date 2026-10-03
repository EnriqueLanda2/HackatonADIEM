-- =============================================================================
-- Sistema de Riego Inteligente - Estado de Morelos
-- Esquema de Base de Datos PostgreSQL
-- =============================================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLA: cultivos
-- Perfiles hídricos de los cultivos endémicos y estratégicos de Morelos
-- =============================================================================
CREATE TABLE cultivos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    nombre_cientifico VARCHAR(150),
    -- Umbrales de humedad del suelo (%)
    humedad_minima DECIMAL(5,2) NOT NULL,  -- Umbral mínimo para activar riego
    humedad_optima DECIMAL(5,2) NOT NULL,  -- Nivel óptimo de humedad
    humedad_maxima DECIMAL(5,2) NOT NULL,  -- Máximo antes de saturación
    -- Temperatura óptima (°C)
    temp_minima DECIMAL(5,2),
    temp_optima DECIMAL(5,2),
    temp_maxima DECIMAL(5,2),
    -- Humedad relativa ambiental (%)
    hr_alerta_hongos DECIMAL(5,2) DEFAULT 80.0,  -- Umbral para alerta de hongos
    -- Riego
    frecuencia_riego_horas INTEGER DEFAULT 24,
    duracion_riego_minutos INTEGER DEFAULT 30,
    tipo_riego VARCHAR(50) DEFAULT 'goteo',  -- goteo, aspersion, inundacion, microaspersion
    -- Metadata
    descripcion TEXT,
    icono VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- TABLA: parcelas
-- Unidades de terreno gestionadas por el sistema
-- =============================================================================
CREATE TABLE parcelas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    tiene_cultivo BOOLEAN DEFAULT true,
    cultivo_id UUID REFERENCES cultivos(id),
    -- Ubicación geográfica
    latitud DECIMAL(10,7),
    longitud DECIMAL(10,7),
    altitud_msnm DECIMAL(7,2),  -- Metros sobre el nivel del mar
    -- Dimensiones
    superficie_hectareas DECIMAL(8,4),
    -- Zona en la malla 3D (para mapeo visual)
    zona_3d VARCHAR(50),  -- 'zona_alta', 'zona_media', 'zona_baja'
    color_base VARCHAR(7) DEFAULT '#4CAF50',  -- Color hexadecimal base
    -- Estado
    activa BOOLEAN DEFAULT true,
    modo_operacion VARCHAR(20) DEFAULT 'automatico',  -- automatico, manual
    -- Metadata
    propietario VARCHAR(200),
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- TABLA: sensores
-- Registro de dispositivos de telemetría
-- =============================================================================
CREATE TABLE sensores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcela_id UUID REFERENCES parcelas(id),
    tipo VARCHAR(50) NOT NULL,  -- 'humedad_suelo', 'temperatura', 'humedad_ambiental', 'ph_suelo', 'nivel_tanque'
    modelo VARCHAR(100),        -- 'Capacitivo', 'SHT31', 'DHT22', 'Sonda pH E-201-C', 'JSN-SR04T'
    -- Ubicación dentro de la parcela
    posicion_x DECIMAL(8,4),
    posicion_y DECIMAL(8,4),
    posicion_z DECIMAL(8,4),
    -- Estado
    activo BOOLEAN DEFAULT true,
    ultimo_valor DECIMAL(10,2),
    ultima_lectura TIMESTAMP WITH TIME ZONE,
    -- Calibración
    valor_minimo DECIMAL(10,2) DEFAULT 0,
    valor_maximo DECIMAL(10,2) DEFAULT 100,
    unidad VARCHAR(20) DEFAULT '%',
    -- Metadata
    serial_hardware VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- TABLA: lecturas
-- Series de tiempo de telemetría de sensores
-- =============================================================================
CREATE TABLE lecturas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id UUID NOT NULL REFERENCES sensores(id),
    valor DECIMAL(10,2) NOT NULL,
    unidad VARCHAR(20) DEFAULT '%',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Fuente del dato
    fuente VARCHAR(30) DEFAULT 'sensor',  -- 'sensor', 'simulacion', 'manual'
    es_valido BOOLEAN DEFAULT true
);

-- Índice para consultas de series de tiempo
CREATE INDEX idx_lecturas_sensor_timestamp ON lecturas(sensor_id, timestamp DESC);
CREATE INDEX idx_lecturas_timestamp ON lecturas(timestamp DESC);

-- =============================================================================
-- TABLA: tanques_agua
-- Reservas de agua monitoreadas
-- =============================================================================
CREATE TABLE tanques_agua (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'cisterna',  -- cisterna, pozo, tanque
    -- Dimensiones
    capacidad_litros DECIMAL(12,2) NOT NULL,
    nivel_actual_porcentaje DECIMAL(5,2) DEFAULT 100,
    -- Umbrales
    nivel_critico_porcentaje DECIMAL(5,2) DEFAULT 20,  -- Bloquear riego no crítico
    nivel_alerta_porcentaje DECIMAL(5,2) DEFAULT 35,   -- Notificar
    -- Sensor asociado
    sensor_id UUID REFERENCES sensores(id),
    -- Ubicación
    latitud DECIMAL(10,7),
    longitud DECIMAL(10,7),
    -- Estado
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- TABLA: valvulas
-- Electroválvulas de solenoide controladas por el sistema
-- =============================================================================
CREATE TABLE valvulas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcela_id UUID REFERENCES parcelas(id),
    tanque_id UUID REFERENCES tanques_agua(id),
    nombre VARCHAR(150) NOT NULL,
    -- Posición 3D para representación visual
    posicion_x DECIMAL(8,4),
    posicion_y DECIMAL(8,4),
    posicion_z DECIMAL(8,4),
    -- Estado
    estado VARCHAR(20) DEFAULT 'cerrada',  -- abierta, cerrada
    modo VARCHAR(20) DEFAULT 'automatico',  -- automatico, manual
    -- Hardware
    pin_rele INTEGER,
    voltaje VARCHAR(10) DEFAULT '12V',
    -- Metadata
    ultima_apertura TIMESTAMP WITH TIME ZONE,
    ultimo_cierre TIMESTAMP WITH TIME ZONE,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- TABLA: eventos_riego
-- Historial de eventos de riego
-- =============================================================================
CREATE TABLE eventos_riego (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcela_id UUID NOT NULL REFERENCES parcelas(id),
    valvula_id UUID NOT NULL REFERENCES valvulas(id),
    -- Evento
    tipo VARCHAR(30) NOT NULL,  -- 'automatico', 'manual', 'programado'
    accion VARCHAR(20) NOT NULL,  -- 'apertura', 'cierre'
    -- Datos al momento del evento
    humedad_suelo_al_evento DECIMAL(5,2),
    nivel_tanque_al_evento DECIMAL(5,2),
    temperatura_al_evento DECIMAL(5,2),
    -- Duración
    inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fin TIMESTAMP WITH TIME ZONE,
    duracion_minutos DECIMAL(8,2),
    -- Volumen estimado
    litros_estimados DECIMAL(10,2),
    -- Razón
    razon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_eventos_parcela ON eventos_riego(parcela_id, inicio DESC);

-- =============================================================================
-- TABLA: alertas
-- Sistema de notificaciones
-- =============================================================================
CREATE TABLE alertas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcela_id UUID REFERENCES parcelas(id),
    tipo VARCHAR(50) NOT NULL,  -- 'prevencion_organica', 'nivel_reserva', 'temperatura', 'humedad_critica', 'pronostico'
    severidad VARCHAR(20) DEFAULT 'media',  -- baja, media, alta, critica
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    -- Estado
    leida BOOLEAN DEFAULT false,
    activa BOOLEAN DEFAULT true,
    -- Datos contextuales
    datos_contexto JSONB,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resuelta_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_alertas_activas ON alertas(activa, created_at DESC) WHERE activa = true;

-- =============================================================================
-- TABLA: configuracion_clima
-- Datos meteorológicos cacheados
-- =============================================================================
CREATE TABLE configuracion_clima (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Pronóstico
    pronostico_lluvia_12h BOOLEAN DEFAULT false,
    probabilidad_lluvia DECIMAL(5,2) DEFAULT 0,
    temperatura_exterior DECIMAL(5,2),
    humedad_relativa_exterior DECIMAL(5,2),
    velocidad_viento DECIMAL(5,2),
    -- Fuente
    fuente_api VARCHAR(100),
    -- Timestamps
    consultado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    datos_raw JSONB
);

-- =============================================================================
-- DATOS INICIALES: Perfiles de cultivos de Morelos
-- =============================================================================
INSERT INTO cultivos (nombre, nombre_cientifico, humedad_minima, humedad_optima, humedad_maxima, temp_minima, temp_optima, temp_maxima, hr_alerta_hongos, frecuencia_riego_horas, duracion_riego_minutos, tipo_riego, descripcion, icono) VALUES
('Caña de Azúcar', 'Saccharum officinarum', 55, 75, 90, 20, 28, 35, 85, 48, 60, 'aspersion', 'Cultivo estratégico del Estado de Morelos. Requiere riego abundante pero controlado. Tolerante a altas temperaturas.', '🌾'),
('Nopal', 'Opuntia ficus-indica', 15, 30, 45, 15, 25, 40, 90, 168, 15, 'goteo', 'Cultivo endémico. Requiere estrés hídrico controlado para óptima producción. Muy resistente a la sequía.', '🌵'),
('Aguacate', 'Persea americana', 50, 65, 80, 15, 22, 30, 75, 72, 45, 'microaspersion', 'Sensible a exceso de humedad en raíz (Phytophthora). Requiere buen drenaje y humedad ambiental controlada.', '🥑'),
('Tomate Rojo', 'Solanum lycopersicum', 45, 60, 75, 18, 24, 32, 80, 24, 30, 'goteo', 'Sensible a hongos (tizón tardío) con humedad ambiental alta. Requiere riego frecuente y preciso.', '🍅'),
('Tomate Verde', 'Physalis philadelphica', 40, 55, 70, 16, 22, 30, 80, 24, 25, 'goteo', 'Tomatillo. Similar al tomate rojo pero ligeramente más tolerante a la sequía. Nativo de México.', '🫒'),
('Maíz', 'Zea mays', 45, 65, 80, 18, 26, 35, 85, 48, 40, 'aspersion', 'Cultivo base de la agricultura mexicana. Requiere riego regular especialmente en etapa de floración.', '🌽'),
('Sorgo', 'Sorghum bicolor', 35, 50, 70, 20, 30, 38, 85, 72, 35, 'aspersion', 'Cereal altamente tolerante a la sequía. Ideal para zonas con menor disponibilidad de agua.', '🌾'),
('Arroz', 'Oryza sativa', 80, 95, 100, 20, 28, 35, 90, 24, 120, 'inundacion', 'Requiere inundación controlada del terreno. Mayor consumo de agua de todos los cultivos del catálogo.', '🍚');

-- =============================================================================
-- DATOS DE EJEMPLO: Parcelas de demostración
-- =============================================================================
INSERT INTO parcelas (nombre, tiene_cultivo, cultivo_id, latitud, longitud, altitud_msnm, superficie_hectareas, zona_3d, color_base, modo_operacion, propietario) VALUES
('Parcela Norte - Caña', true, (SELECT id FROM cultivos WHERE nombre = 'Caña de Azúcar'), 18.9186, -99.2350, 1520, 5.5, 'zona_alta', '#8BC34A', 'automatico', 'Ejido Morelos Norte'),
('Parcela Centro - Tomate', true, (SELECT id FROM cultivos WHERE nombre = 'Tomate Rojo'), 18.9100, -99.2280, 1480, 2.0, 'zona_media', '#F44336', 'automatico', 'Cooperativa Jiutepec'),
('Parcela Sur - Arroz', true, (SELECT id FROM cultivos WHERE nombre = 'Arroz'), 18.9020, -99.2200, 1420, 8.0, 'zona_baja', '#2196F3', 'automatico', 'Ejido Morelos Sur'),
('Parcela Poniente - En Descanso', false, NULL, 18.9150, -99.2310, 1490, 3.2, 'zona_media', '#8D6E63', 'manual', 'Cooperativa Jiutepec');

-- Tanque de agua principal
INSERT INTO tanques_agua (nombre, tipo, capacidad_litros, nivel_actual_porcentaje, nivel_critico_porcentaje) VALUES
('Cisterna Principal', 'cisterna', 50000, 72, 20);

-- Sensores de demostración (Humedad suelo, Temperatura, Humedad ambiental, pH de la tierra)
INSERT INTO sensores (parcela_id, tipo, modelo, unidad, ultimo_valor, ultima_lectura) VALUES
((SELECT id FROM parcelas WHERE nombre = 'Parcela Norte - Caña'), 'humedad_suelo', 'Capacitivo V1.2', '%', 62.0, NOW()),
((SELECT id FROM parcelas WHERE nombre = 'Parcela Norte - Caña'), 'humedad_ambiental', 'DHT22', '%', 65.0, NOW()),
((SELECT id FROM parcelas WHERE nombre = 'Parcela Norte - Caña'), 'temperatura', 'DHT22', '°C', 27.5, NOW()),
((SELECT id FROM parcelas WHERE nombre = 'Parcela Norte - Caña'), 'ph_suelo', 'Sonda pH E-201-C', 'pH', 6.8, NOW()),

((SELECT id FROM parcelas WHERE nombre = 'Parcela Centro - Tomate'), 'humedad_suelo', 'Capacitivo V1.2', '%', 48.0, NOW()),
((SELECT id FROM parcelas WHERE nombre = 'Parcela Centro - Tomate'), 'humedad_ambiental', 'DHT22', '%', 65.0, NOW()),
((SELECT id FROM parcelas WHERE nombre = 'Parcela Centro - Tomate'), 'temperatura', 'DHT22', '°C', 27.5, NOW()),
((SELECT id FROM parcelas WHERE nombre = 'Parcela Centro - Tomate'), 'ph_suelo', 'Sonda pH E-201-C', 'pH', 6.2, NOW()),

((SELECT id FROM parcelas WHERE nombre = 'Parcela Sur - Arroz'), 'humedad_suelo', 'Capacitivo V1.2', '%', 88.0, NOW()),
((SELECT id FROM parcelas WHERE nombre = 'Parcela Sur - Arroz'), 'humedad_ambiental', 'DHT22', '%', 65.0, NOW()),
((SELECT id FROM parcelas WHERE nombre = 'Parcela Sur - Arroz'), 'temperatura', 'DHT22', '°C', 27.5, NOW()),
((SELECT id FROM parcelas WHERE nombre = 'Parcela Sur - Arroz'), 'ph_suelo', 'Sonda pH E-201-C', 'pH', 7.2, NOW()),

((SELECT id FROM parcelas WHERE nombre = 'Parcela Poniente - En Descanso'), 'humedad_suelo', 'Capacitivo V1.2', '%', 32.0, NOW()),
((SELECT id FROM parcelas WHERE nombre = 'Parcela Poniente - En Descanso'), 'humedad_ambiental', 'DHT22', '%', 60.0, NOW()),
((SELECT id FROM parcelas WHERE nombre = 'Parcela Poniente - En Descanso'), 'temperatura', 'DHT22', '°C', 28.0, NOW()),
((SELECT id FROM parcelas WHERE nombre = 'Parcela Poniente - En Descanso'), 'ph_suelo', 'Sonda pH E-201-C', 'pH', 6.5, NOW());
