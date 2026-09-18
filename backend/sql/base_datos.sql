DROP DATABASE IF EXISTS vonvi_studio;
CREATE DATABASE vonvi_studio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vonvi_studio;

CREATE TABLE usuarios (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    nombres    VARCHAR(80)  NOT NULL,
    apellidos  VARCHAR(80)  NOT NULL,
    email      VARCHAR(120) NOT NULL UNIQUE,   
    password   VARCHAR(255) NOT NULL,          
    telefono   VARCHAR(20)      NULL,
    rol        ENUM('cliente','admin','empleado','proveedor') NOT NULL DEFAULT 'cliente',
    token      VARCHAR(60)      NULL,          
    creado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categorias (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(80)  NOT NULL,
    slug        VARCHAR(80)  NOT NULL UNIQUE,  
    descripcion VARCHAR(255)     NULL,
    imagen      VARCHAR(180)     NULL,         
    icono       VARCHAR(60)      NULL,         
    activo      TINYINT(1)   NOT NULL DEFAULT 1
);

CREATE TABLE productos (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    categoria_id    INT           NOT NULL,
    nombre          VARCHAR(120)  NOT NULL,
    slug            VARCHAR(120)  NOT NULL UNIQUE,
    descripcion     TEXT              NULL,
    precio          DECIMAL(10,2) NOT NULL,                                                  
    imagen          VARCHAR(180)      NULL,
    cantidad_minima INT           NOT NULL DEFAULT 1,
    dias_produccion INT           NOT NULL DEFAULT 3,
    activo          TINYINT(1)    NOT NULL DEFAULT 1,

    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

CREATE TABLE atributos (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT         NOT NULL,
    nombre      VARCHAR(60) NOT NULL,         
    tipo        ENUM('select','color','radio') NOT NULL DEFAULT 'select',
    orden       INT         NOT NULL DEFAULT 0,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE TABLE atributo_valores (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    atributo_id INT           NOT NULL,
    valor       VARCHAR(80)   NOT NULL,       
    color_hex   CHAR(7)           NULL,        
    recargo     DECIMAL(10,2) NOT NULL DEFAULT 0.00,  
    orden       INT           NOT NULL DEFAULT 0,
    FOREIGN KEY (atributo_id) REFERENCES atributos(id) ON DELETE CASCADE
);

CREATE TABLE pedidos (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    codigo     VARCHAR(20) NOT NULL UNIQUE,    
    usuario_id INT         NOT NULL,
    estado ENUM('recibido','diseno_enviado','por_aprobar','en_produccion','control','listo','cancelado') NOT NULL DEFAULT 'recibido',
    nombre_contacto   VARCHAR(160) NOT NULL,
    email_contacto    VARCHAR(120) NOT NULL,
    telefono_contacto VARCHAR(20)  NOT NULL,

    #Entrega
    tipo_entrega ENUM('recojo','delivery') NOT NULL DEFAULT 'delivery',
    distrito     VARCHAR(60)  NULL,
    direccion    VARCHAR(180) NULL,
    referencia   VARCHAR(180) NULL,

    #Montos
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    envio    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total    DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    #Pago simulado.
    metodo_pago     VARCHAR(20) NULL,
    estado_pago     ENUM('pendiente','pagado') NOT NULL DEFAULT 'pendiente',
    referencia_pago VARCHAR(40) NULL,
    ultimos4        CHAR(4)     NULL,

    notas     VARCHAR(500) NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    #Linea de tiempo de fabricacion
    fecha_recibido   DATETIME NULL,
    fecha_diseno     DATETIME NULL,
    fecha_aprobacion DATETIME NULL,
    fecha_produccion DATETIME NULL,
    fecha_control    DATETIME NULL,
    fecha_listo      DATETIME NULL,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE pedido_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id   INT NOT NULL,
    producto_id INT NULL,                    
    nombre_producto  VARCHAR(120)  NOT NULL,   
    nombre_categoria VARCHAR(80)   NOT NULL,   
    cantidad         INT           NOT NULL,
    precio_unitario  DECIMAL(10,2) NOT NULL,  
    subtotal         DECIMAL(10,2) NOT NULL,

    opciones VARCHAR(300) NULL,

    archivo  VARCHAR(255) NULL,                
    notas    VARCHAR(400) NULL,

    FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)   ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
);

CREATE TABLE cotizaciones (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,                       

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
CREATE TABLE solicitudes (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    proveedor_id   INT NOT NULL,
    descripcion    TEXT NOT NULL,
    cantidad       INT NOT NULL,
    estado         ENUM('enviada','aceptada','rechazada') NOT NULL DEFAULT 'enviada',
    respuesta      VARCHAR(255) NULL,
    creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    respondido_en  DATETIME NULL,
 
    FOREIGN KEY (proveedor_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
