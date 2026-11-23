CREATE DATABASE IF NOT EXISTS pereira_se_reactiva
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE pereira_se_reactiva;

CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL,
    apellido VARCHAR(60) NOT NULL,
    correo VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_usuario_nombre
        CHECK (CHAR_LENGTH(TRIM(nombre)) > 0),

    CONSTRAINT chk_usuario_apellido
        CHECK (CHAR_LENGTH(TRIM(apellido)) > 0)
);

CREATE TABLE roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    descripcion VARCHAR(150),

    CONSTRAINT chk_rol_nombre
        CHECK (CHAR_LENGTH(TRIM(nombre)) > 0)
);

CREATE TABLE usuarios_roles (
    id_usuario INT NOT NULL,
    id_rol INT NOT NULL,

    PRIMARY KEY (id_usuario, id_rol),

    CONSTRAINT fk_ur_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_ur_rol
        FOREIGN KEY (id_rol)
        REFERENCES roles(id_rol)
        ON DELETE RESTRICT
);

CREATE TABLE empresas (
    id_empresa INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nit VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    direccion VARCHAR(200) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(120) NOT NULL,
    estado_verificacion ENUM('PENDIENTE','APROBADA','RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_empresa_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_empresa_nombre
        CHECK (CHAR_LENGTH(TRIM(nombre)) > 0),

    CONSTRAINT chk_empresa_nit
        CHECK (CHAR_LENGTH(TRIM(nit)) > 0)
);

CREATE TABLE documentos_empresa (
    id_documento INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    tipo_documento VARCHAR(60) NOT NULL,
    ruta_archivo VARCHAR(255) NOT NULL,
    estado_revision ENUM('PENDIENTE','APROBADO','RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    fecha_carga DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_documento_empresa
        FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE CASCADE,

    CONSTRAINT chk_documento_tipo
        CHECK (CHAR_LENGTH(TRIM(tipo_documento)) > 0),

    CONSTRAINT chk_documento_ruta
        CHECK (CHAR_LENGTH(TRIM(ruta_archivo)) > 0)
);

CREATE TABLE categorias (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    activa BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_categoria_nombre
        CHECK (CHAR_LENGTH(TRIM(nombre)) > 0)
);

CREATE TABLE publicaciones (
    id_publicacion INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_categoria INT NOT NULL,
    tipo ENUM('PRODUCTO', 'SERVICIO') NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(12,2) DEFAULT NULL,
    cantidad INT DEFAULT NULL,
    estado ENUM('PENDIENTE','PUBLICADO','INACTIVO') NOT NULL DEFAULT 'PENDIENTE',
    fecha_publicacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_publicacion_empresa
        FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE RESTRICT,

    CONSTRAINT fk_publicacion_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES categorias(id_categoria)
        ON DELETE RESTRICT,

    CONSTRAINT chk_publicacion_nombre
        CHECK (CHAR_LENGTH(TRIM(nombre)) > 0),

    CONSTRAINT chk_publicacion_precio
        CHECK (precio IS NULL OR precio >= 0),

    CONSTRAINT chk_publicacion_cantidad
        CHECK ((tipo = 'PRODUCTO' AND cantidad IS NOT NULL AND cantidad >= 0)OR(tipo = 'SERVICIO' AND cantidad IS NULL))
);

CREATE TABLE imagenes_publicacion (
    id_imagen INT AUTO_INCREMENT PRIMARY KEY,
    id_publicacion INT NOT NULL,
    ruta_imagen VARCHAR(255) NOT NULL,
    principal BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_imagen_publicacion
        FOREIGN KEY (id_publicacion)
        REFERENCES publicaciones(id_publicacion)
        ON DELETE CASCADE,

    CONSTRAINT chk_imagen_ruta
        CHECK (CHAR_LENGTH(TRIM(ruta_imagen)) > 0)
);

CREATE TABLE campanas (
    id_campana INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT NOT NULL,
    tipo_aceptacion ENUM('ECONOMICA','ESPECIE','AMBAS') NOT NULL,
    meta_economica DECIMAL(12,2) DEFAULT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado ENUM('PENDIENTE','ACTIVA','FINALIZADA','CANCELADA'
    ) NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT fk_campana_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_campana_nombre
        CHECK (CHAR_LENGTH(TRIM(nombre)) > 0),

    CONSTRAINT chk_campana_fechas
        CHECK (fecha_fin >= fecha_inicio),

    CONSTRAINT chk_campana_meta
        CHECK (meta_economica IS NULL OR meta_economica > 0)
);

CREATE TABLE donaciones (
    id_donacion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_campana INT NOT NULL,
    tipo_donacion ENUM('ECONOMICA','ESPECIE') NOT NULL,
    tipo_donante ENUM('PERSONA','EMPRESA') NOT NULL,
    nombre_donante VARCHAR(120),
    nit_donante VARCHAR(20),
    monto DECIMAL(12,2) DEFAULT NULL,
    descripcion_especie TEXT,
    estado ENUM('PENDIENTE','CONFIRMADA','RECHAZADA','ENTREGADA') NOT NULL DEFAULT 'PENDIENTE',
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_donacion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_donacion_campana
        FOREIGN KEY (id_campana)
        REFERENCES campanas(id_campana)
        ON DELETE RESTRICT,

    CONSTRAINT chk_donacion_monto
        CHECK ((tipo_donacion = 'ECONOMICA' AND monto IS NOT NULL AND monto > 0 AND descripcion_especie IS NULL)
            OR
            (tipo_donacion = 'ESPECIE' AND monto IS NULL AND descripcion_especie IS NOT NULL AND CHAR_LENGTH(TRIM(descripcion_especie)) > 0)),

    CONSTRAINT chk_donante_nombre
        CHECK (nombre_donante IS NULL OR CHAR_LENGTH(TRIM(nombre_donante)) > 0)
);

INSERT INTO roles (nombre, descripcion) VALUES
('ADMINISTRADOR', 'Administra y supervisa la plataforma'),
('COMERCIANTE', 'Registra empresas y publica productos o servicios'),
('COMPRADOR', 'Consulta productos y servicios'),
('DONANTE', 'Realiza donaciones económicas o en especie');

INSERT INTO categorias (nombre, descripcion) VALUES
('Alimentos', 'Productos alimenticios y bebidas'),
('Ropa y calzado', 'Prendas de vestir y calzado'),
('Tecnología', 'Equipos electrónicos y tecnológicos'),
('Hogar', 'Productos para el hogar'),
('Construcción', 'Materiales y herramientas'),
('Belleza', 'Productos y servicios de belleza'),
('Salud', 'Productos y servicios relacionados con salud'),
('Transporte', 'Servicios de transporte'),
('Educación', 'Servicios educativos'),
('Otros', 'Productos y servicios generales');

SELECT * FROM roles;

SELECT * FROM categorias;

SHOW TABLES;

USE pereira_se_reactiva;

SELECT * FROM usuarios;

SELECT * FROM usuarios_roles;

DESCRIBE publicaciones;
DESCRIBE empresas;
DESCRIBE categorias;

SELECT * FROM empresas;

SELECT id_empresa, nit, nombre, estado_verificacion FROM empresas;

UPDATE empresas SET estado_verificacion = 'APROBADA' WHERE id_empresa = 1;

INSERT INTO roles (nombre, descripcion)
VALUES ('ADMINISTRADOR', 'Usuario encargado de administrar la plataforma y aprobar publicaciones.')
ON DUPLICATE KEY UPDATE
descripcion = VALUES(descripcion);

SELECT
    id_usuario,
    nombre,
    apellido,
    correo
FROM usuarios;

SELECT * FROM roles;

START TRANSACTION;

-- Buscar el usuario y el rol administrador
SET @id_usuario = (
    SELECT id_usuario
    FROM usuarios
    WHERE correo = 'ma.valencia28@ciaf.edu.co'
);

SET @id_rol = (
    SELECT id_rol
    FROM roles
    WHERE nombre = 'ADMINISTRADOR'
);

-- Asignar el rol administrador
INSERT INTO usuarios_roles (id_usuario, id_rol)
VALUES (@id_usuario, @id_rol);

-- Quitar el rol de comprador
DELETE FROM usuarios_roles
WHERE id_usuario = @id_usuario
AND id_rol = (
    SELECT id_rol
    FROM roles
    WHERE nombre = 'COMPRADOR'
);

COMMIT;

SELECT
    u.nombre,
    u.apellido,
    u.correo,
    r.nombre AS rol
FROM usuarios u
INNER JOIN usuarios_roles ur
    ON u.id_usuario = ur.id_usuario
INNER JOIN roles r
    ON ur.id_rol = r.id_rol
WHERE u.correo = 'ma.valencia28@ciaf.edu.co';

SELECT id_publicacion, nombre, estado
FROM publicaciones;

SHOW COLUMNS FROM empresas LIKE 'estado_verificacion';

SELECT id_usuario, nombre, apellido, correo FROM usuarios;
SELECT id_empresa, nombre, nit, estado_verificacion FROM empresas;


CREATE TABLE IF NOT EXISTS sesiones (
    id_sesion INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    identificador_token CHAR(36) NOT NULL UNIQUE,

    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    fecha_expiracion DATETIME NOT NULL,

    revocada BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_sesion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE,

    INDEX idx_sesion_usuario (id_usuario),

    INDEX idx_sesion_estado (
        identificador_token,
        revocada,
        fecha_expiracion
    )
);

DESCRIBE sesiones;

SHOW TABLES;

SELECT * FROM donaciones;

DESCRIBE empresas;

