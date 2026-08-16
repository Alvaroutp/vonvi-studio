-- =====================================================================
--  VONVI STUDIO PERÚ  ·  Base de datos
--  Paso 0.1 · Crea la base de datos y las 8 tablas
--
--  Cómo ejecutarlo:
--    phpMyAdmin → pestaña Importar → elegir este archivo → Continuar
-- =====================================================================

DROP DATABASE IF EXISTS vonvi_studio;
CREATE DATABASE vonvi_studio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vonvi_studio;


-- =====================================================================
--  TABLA 1 · usuarios
--  Las cuentas de los clientes y del administrador.
-- =====================================================================
CREATE TABLE usuarios (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    nombres    VARCHAR(80)  NOT NULL,
    apellidos  VARCHAR(80)  NOT NULL,
    email      VARCHAR(120) NOT NULL UNIQUE,   -- UNIQUE: no puede repetirse
    password   VARCHAR(255) NOT NULL,          -- guarda el hash de bcrypt, no la clave
    telefono   VARCHAR(20)      NULL,
    rol        ENUM('cliente','admin') NOT NULL DEFAULT 'cliente',
    token      VARCHAR(60)      NULL,          -- código de sesión; NULL = sin sesión
    creado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================================
--  TABLA 2 · categorias
--  Polos, Tazas, Stickers... Lo primero que ve el cliente.
-- =====================================================================
CREATE TABLE categorias (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(80)  NOT NULL,
    slug        VARCHAR(80)  NOT NULL UNIQUE,  -- nombre para la URL: "polos"
    descripcion VARCHAR(255)     NULL,
    imagen      VARCHAR(180)     NULL,         -- ruta: img/polos.jpg
    icono       VARCHAR(60)      NULL,         -- clase de Font Awesome
    activo      TINYINT(1)   NOT NULL DEFAULT 1
);


-- =====================================================================
--  TABLA 3 · productos
--  El tipo dentro de la categoría: Polo Básico, Polo Oversize...
-- =====================================================================
CREATE TABLE productos (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    categoria_id    INT           NOT NULL,
    nombre          VARCHAR(120)  NOT NULL,
    slug            VARCHAR(120)  NOT NULL UNIQUE,
    descripcion     TEXT              NULL,
    precio          DECIMAL(10,2) NOT NULL,    -- DECIMAL y no FLOAT: el dinero
                                               -- con FLOAT da errores de centavos
    imagen          VARCHAR(180)      NULL,
    cantidad_minima INT           NOT NULL DEFAULT 1,
    dias_produccion INT           NOT NULL DEFAULT 3,
    activo          TINYINT(1)    NOT NULL DEFAULT 1,

    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);


-- =====================================================================
--  TABLA 4 · atributos
--  Las preguntas que el configurador le hace a CADA producto.
--  Ejemplo, para el Polo Oversize:  Talla, Color, Técnica de estampado
-- =====================================================================
CREATE TABLE atributos (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT         NOT NULL,
    nombre      VARCHAR(60) NOT NULL,          -- "Talla"
    tipo        ENUM('select','color','radio') NOT NULL DEFAULT 'select',
                                               -- le dice al frontend qué dibujar:
                                               -- select = lista desplegable
                                               -- color  = círculos de colores
                                               -- radio  = botones
    orden       INT         NOT NULL DEFAULT 0,

    -- ON DELETE CASCADE: si se borra el producto, se borran sus atributos.
    -- Sin esto quedarían filas huérfanas apuntando a un producto inexistente.
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);


-- =====================================================================
--  TABLA 5 · atributo_valores
--  Las respuestas posibles de cada atributo, con su recargo.
--  Ejemplo, para el atributo "Talla":  XS, S, M, L, XL, XXL (+S/ 5)
-- =====================================================================
CREATE TABLE atributo_valores (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    atributo_id INT           NOT NULL,
    valor       VARCHAR(80)   NOT NULL,        -- "XXL"
    color_hex   CHAR(7)           NULL,        -- "#111111", solo si tipo = color
    recargo     DECIMAL(10,2) NOT NULL DEFAULT 0.00,  -- cuánto suma al precio
    orden       INT           NOT NULL DEFAULT 0,

    FOREIGN KEY (atributo_id) REFERENCES atributos(id) ON DELETE CASCADE
);


-- =====================================================================
--  TABLA 6 · pedidos
--  Una fila por compra.
-- =====================================================================
CREATE TABLE pedidos (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    codigo     VARCHAR(20) NOT NULL UNIQUE,    -- VONVI-2026-000001
    usuario_id INT         NOT NULL,

    -- Estado actual de la fabricación
    estado ENUM('recibido','diseno_enviado','por_aprobar',
                'en_produccion','control','listo','cancelado')
           NOT NULL DEFAULT 'recibido',

    -- Datos de contacto copiados al momento de comprar.
    -- Se copian y no se leen del usuario: si el cliente cambia su teléfono
    -- después, el pedido debe conservar el número con el que se coordinó.
    nombre_contacto   VARCHAR(160) NOT NULL,
    email_contacto    VARCHAR(120) NOT NULL,
    telefono_contacto VARCHAR(20)  NOT NULL,

    -- Entrega
    tipo_entrega ENUM('recojo','delivery') NOT NULL DEFAULT 'delivery',
    distrito     VARCHAR(60)  NULL,
    direccion    VARCHAR(180) NULL,
    referencia   VARCHAR(180) NULL,

    -- Montos
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    envio    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total    DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    -- Pago simulado.
    -- De la tarjeta solo se guardan los últimos 4 dígitos: guardar el número
    -- completo exige certificación bancaria y no se hace nunca.
    metodo_pago     VARCHAR(20) NULL,
    estado_pago     ENUM('pendiente','pagado') NOT NULL DEFAULT 'pendiente',
    referencia_pago VARCHAR(40) NULL,
    ultimos4        CHAR(4)     NULL,

    notas     VARCHAR(500) NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- LÍNEA DE TIEMPO DE FABRICACIÓN
    -- Una fecha por paso. Si la fecha tiene valor, ese paso ya se cumplió,
    -- y ahí mismo está el cuándo. Reemplaza a una tabla de historial entera.
    fecha_recibido   DATETIME NULL,
    fecha_diseno     DATETIME NULL,
    fecha_aprobacion DATETIME NULL,
    fecha_produccion DATETIME NULL,
    fecha_control    DATETIME NULL,
    fecha_listo      DATETIME NULL,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);


-- =====================================================================
--  TABLA 7 · pedido_items
--  Los productos de cada pedido.
--
--  IMPORTANTE: guarda una COPIA del nombre y del precio.
--  Si mañana el polo sube de S/ 45 a S/ 50 y aquí solo estuviera el id,
--  al abrir una compra vieja diría S/ 50 y el historial estaría mintiendo
--  sobre lo que el cliente realmente pagó.
-- =====================================================================
CREATE TABLE pedido_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id   INT NOT NULL,
    producto_id INT NULL,                      -- solo como referencia

    nombre_producto  VARCHAR(120)  NOT NULL,   -- COPIA
    nombre_categoria VARCHAR(80)   NOT NULL,   -- COPIA
    cantidad         INT           NOT NULL,
    precio_unitario  DECIMAL(10,2) NOT NULL,   -- COPIA
    subtotal         DECIMAL(10,2) NOT NULL,

    -- La configuración elegida, como texto:
    -- "Talla: XXL, Color: Negro, Técnica de estampado: Bordado"
    opciones VARCHAR(300) NULL,

    archivo  VARCHAR(255) NULL,                -- ruta del diseño subido
    notas    VARCHAR(400) NULL,

    FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)   ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
);


-- =====================================================================
--  TABLA 8 · cotizaciones
--  El formulario de contacto.html
-- =====================================================================
CREATE TABLE cotizaciones (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,                       -- NULL si no tenía sesión

    nombre   VARCHAR(160) NOT NULL,
    email    VARCHAR(120) NOT NULL,
    telefono VARCHAR(20)  NOT NULL,

    producto_interes     VARCHAR(120) NULL,
    mensaje              TEXT         NULL,
    preferencia_contacto ENUM('correo','whatsapp','llamada') NOT NULL DEFAULT 'whatsapp',
    estado               ENUM('nueva','en_proceso','respondida','cerrada') NOT NULL DEFAULT 'nueva',
    creado_en            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);


-- =====================================================================
--  Comprobación: debe mostrar las 8 tablas
-- =====================================================================
SHOW TABLES;
