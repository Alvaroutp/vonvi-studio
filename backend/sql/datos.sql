-- =====================================================================
--  VONVI STUDIO PERÚ  ·  Datos iniciales
--  Paso 0.2 · Llena las tablas con el catálogo real
--
--  Ejecutar DESPUÉS de base_datos.sql
--  MySQL Workbench → abrir este archivo → Ctrl+Shift+Enter
--
--  Los ids van escritos a mano (1, 2, 3...) para que se pueda seguir
--  fácilmente qué atributo pertenece a qué producto.
-- =====================================================================

USE vonvi_studio;


-- =====================================================================
--  USUARIOS
-- =====================================================================
-- La contraseña de los dos es:  Vonvi2026
-- En la tabla no se guarda el texto sino el hash de bcrypt, que es de
-- una sola vía: de ese texto no se puede volver a la contraseña.
INSERT INTO usuarios (id, nombres, apellidos, email, password, telefono, rol) VALUES
(1, 'Administrador', 'Vonvi', 'admin@vonvistudio.pe',
    '$2b$10$74VkFfuCPJ9DZqxS3VHjFeICD3FPnpfUBIn8pSSuHSY0QIovPMTui',
    '907100820', 'admin'),
(2, 'María', 'Fernández', 'maria@example.com',
    '$2b$10$74VkFfuCPJ9DZqxS3VHjFeICD3FPnpfUBIn8pSSuHSY0QIovPMTui',
    '987654321', 'cliente');


-- =====================================================================
--  CATEGORÍAS  (11)
-- =====================================================================
INSERT INTO categorias (id, nombre, slug, descripcion, imagen, icono) VALUES
(1,  'Polos',               'polos',     'Polos personalizados con DTF, sublimado o bordado.',      'img/polos.jpg',     'fa-solid fa-shirt'),
(2,  'Tazas',               'tazas',     'Tazas de cerámica personalizadas para regalo o empresa.', 'img/tazas.jpg',     'fa-solid fa-mug-hot'),
(3,  'Stickers',            'stickers',  'Stickers troquelados en vinil resistente al agua.',       'img/stickers.jpg',  'fa-solid fa-tags'),
(4,  'Llaveros',            'llaveros',  'Llaveros acrílicos con impresión UV.',                    'img/llaveros.jpg',  'fa-solid fa-key'),
(5,  'Agendas y Cuadernos', 'agendas',   'Papelería corporativa con acabados premium.',             'img/agendas.jpg',   'fa-solid fa-book'),
(6,  'Bolsas',              'bolsas',    'Bolsas ecológicas de tela y yute personalizadas.',        'img/bolsas.jpg',    'fa-solid fa-bag-shopping'),
(7,  'Tomatodos',           'tomatodos', 'Tomatodos y termos con tu marca.',                        'img/tomatodo.jpg',  'fa-solid fa-bottle-water'),
(8,  'Gorros',              'gorros',    'Gorros jockey y bucket bordados o estampados.',           'img/gorro.jpg',     'fa-solid fa-hat-cowboy'),
(9,  'Lapiceros',           'lapiceros', 'Lapiceros publicitarios para campañas y eventos.',        'img/lapiceros.jpg', 'fa-solid fa-pen'),
(10, 'Cajas y Packaging',   'cajas',     'Cajas personalizadas para tu emprendimiento.',            'img/caja.jpg',      'fa-solid fa-box-open'),
(11, 'Banners',             'banners',   'Banners, roll screen y gigantografías.',                  'img/banner.jpg',    'fa-solid fa-flag');


-- =====================================================================
--  PRODUCTOS  (22)
--  Los precios salen de la tabla de precios referenciales que ya
--  tenían en productos.html
-- =====================================================================
INSERT INTO productos (id, categoria_id, nombre, slug, descripcion, precio, imagen, cantidad_minima, dias_produccion) VALUES

-- Polos (categoría 1)
(1,  1, 'Polo Básico Algodón',    'polo-basico',           'Polo de algodón 20/1, corte clásico unisex. Ideal para uniformes y eventos.', 35.00, 'img/polos.jpg',     1,  3),
(2,  1, 'Polo Oversize',          'polo-oversize',         'Corte holgado y caído, tendencia urbana. Tela peinada de mayor gramaje.',     45.00, 'img/polos.jpg',     1,  3),
(3,  1, 'Polo Box Fit',           'polo-box-fit',          'Corte recto y ancho. Muy usado para marcas de ropa.',                         42.00, 'img/polos.jpg',     1,  3),
(4,  1, 'Polo Dry Fit Deportivo', 'polo-dry-fit',          'Tela deportiva transpirable, ideal para equipos.',                            40.00, 'img/polos.jpg',     1,  4),

-- Tazas (2)
(5,  2, 'Taza Cerámica Clásica',  'taza-clasica',          'Taza blanca de cerámica sublimada a todo color.',                             25.00, 'img/tazas.jpg',     1,  2),
(6,  2, 'Taza Mágica',            'taza-magica',           'Cambia de color al servir líquido caliente y revela tu diseño.',              38.00, 'img/tazas.jpg',     1,  2),
(7,  2, 'Taza Interior de Color', 'taza-interior-color',   'Exterior blanco con interior y asa de color.',                                30.00, 'img/tazas.jpg',     1,  2),

-- Stickers (3)
(8,  3, 'Sticker Troquelado',     'sticker-troquelado',    'Corte a la forma exacta de tu diseño, en vinil resistente al agua.',          15.00, 'img/stickers.jpg', 10,  1),
(9,  3, 'Plancha de Stickers',    'plancha-stickers',      'Varios diseños en una plancha A4, listos para recortar.',                     20.00, 'img/stickers.jpg',  1,  1),

-- Llaveros (4)
(10, 4, 'Llavero Acrílico',       'llavero-acrilico',      'Acrílico transparente de 3 mm con impresión UV a full color.',                18.00, 'img/llaveros.jpg', 10,  2),
(11, 4, 'Llavero de MDF',         'llavero-mdf',           'Madera MDF cortada a láser, acabado natural.',                                15.00, 'img/llaveros.jpg', 10,  2),

-- Agendas y Cuadernos (5)
(12, 5, 'Agenda Corporativa',     'agenda-corporativa',    'Agenda anillada con tapa personalizada y acabados premium.',                  30.00, 'img/agendas.jpg',   5,  4),
(13, 5, 'Cuaderno Personalizado', 'cuaderno-personalizado','Cuaderno con tapa impresa a full color.',                                     22.00, 'img/cuaderno.jpg',  5,  4),

-- Bolsas (6)
(14, 6, 'Bolsa de Tela',          'bolsa-tela',            'Tote bag de drill con impresión DTF o serigrafía.',                           20.00, 'img/bolsas.jpg',   10,  3),
(15, 6, 'Bolsa de Yute',          'bolsa-yute',            'Bolsa ecológica de yute natural, ideal para ferias.',                         28.00, 'img/bolsas.jpg',   10,  3),

-- Tomatodos (7)
(16, 7, 'Tomatodo Deportivo',     'tomatodo-deportivo',    'Botella libre de BPA con tapa a rosca y tu logo.',                            32.00, 'img/tomatodo.jpg',  5,  3),
(17, 7, 'Termo de Acero',         'termo-acero',           'Termo de acero inoxidable con grabado láser.',                                55.00, 'img/tomatodo.jpg',  5,  4),

-- Gorros (8)
(18, 8, 'Gorro Personalizado',    'gorro-personalizado',   'Gorro bordado o estampado con tu marca.',                                     30.00, 'img/gorro.jpg',     5,  4),

-- Lapiceros (9)
(19, 9, 'Lapicero Publicitario',  'lapicero-publicitario', 'Lapicero con logo impreso, ideal para campañas masivas.',                      4.50, 'img/lapiceros.jpg',50,  3),

-- Cajas (10)
(20, 10,'Caja Personalizada',     'caja-personalizada',    'Packaging impreso a medida para tu producto.',                                 8.00, 'img/caja.jpg',     20,  5),

-- Banners (11)
(21, 11,'Banner Publicitario',    'banner-publicitario',   'Impresión en alta resolución sobre banner 13 oz, 1 x 2 metros.',              90.00, 'img/banner.jpg',    1,  2),
(22, 11,'Roll Screen',            'roll-screen',           'Roll screen de 85 x 200 cm con estructura de aluminio y estuche.',           180.00, 'img/banner.jpg',    1,  3);


-- =====================================================================
--  ATRIBUTOS
--  Las preguntas que el configurador le hace a cada producto.
--  Cada producto tiene las suyas propias.
-- =====================================================================
INSERT INTO atributos (id, producto_id, nombre, tipo, orden) VALUES

-- Los 4 polos piden lo mismo: talla, color y técnica
( 1,  1, 'Talla',                'select', 1), ( 2,  1, 'Color', 'color', 2), ( 3,  1, 'Técnica de estampado', 'radio', 3),
( 4,  2, 'Talla',                'select', 1), ( 5,  2, 'Color', 'color', 2), ( 6,  2, 'Técnica de estampado', 'radio', 3),
( 7,  3, 'Talla',                'select', 1), ( 8,  3, 'Color', 'color', 2), ( 9,  3, 'Técnica de estampado', 'radio', 3),
(10,  4, 'Talla',                'select', 1), (11,  4, 'Color', 'color', 2), (12,  4, 'Técnica de estampado', 'radio', 3),

-- Tazas
(13,  5, 'Capacidad',            'select', 1), (14,  5, 'Color del interior', 'color', 2),
(15,  6, 'Capacidad',            'select', 1),
(16,  7, 'Capacidad',            'select', 1), (17,  7, 'Color del interior', 'color', 2),

-- Stickers
(18,  8, 'Material',             'select', 1), (19,  8, 'Tamaño', 'select', 2),
(20,  9, 'Material',             'select', 1),

-- Llaveros
(21, 10, 'Tamaño',               'select', 1),
(22, 11, 'Tamaño',               'select', 1),

-- Agendas y cuadernos
(23, 12, 'Tamaño',               'select', 1), (24, 12, 'Tipo de anillado', 'select', 2), (25, 12, 'Color de tapa', 'color', 3),
(26, 13, 'Tamaño',               'select', 1), (27, 13, 'Tipo de hoja',     'select', 2),

-- Bolsas
(28, 14, 'Tamaño',               'select', 1), (29, 14, 'Color', 'color', 2), (30, 14, 'Técnica de estampado', 'radio', 3),
(31, 15, 'Tamaño',               'select', 1),

-- Tomatodos
(32, 16, 'Capacidad',            'select', 1), (33, 16, 'Color', 'color', 2),
(34, 17, 'Capacidad',            'select', 1),

-- Gorros
(35, 18, 'Tipo de gorro',        'select', 1), (36, 18, 'Color', 'color', 2), (37, 18, 'Técnica de estampado', 'radio', 3),

-- Lapiceros
(38, 19, 'Color',                'color',  1),

-- Cajas
(39, 20, 'Material',             'select', 1), (40, 20, 'Tamaño', 'select', 2),

-- Banners
(41, 21, 'Material',             'select', 1), (42, 21, 'Acabado', 'select', 2),
(43, 22, 'Acabado',              'select', 1);


-- =====================================================================
--  VALORES DE CADA ATRIBUTO
--  La columna "recargo" es cuánto suma al precio del producto.
-- =====================================================================

-- ---------- POLOS: talla ----------
INSERT INTO atributo_valores (atributo_id, valor, color_hex, recargo, orden) VALUES
( 1,'S',NULL,0,1), ( 1,'M',NULL,0,2), ( 1,'L',NULL,0,3), ( 1,'XL',NULL,0,4), ( 1,'XXL',NULL,5.00,5),
( 4,'S',NULL,0,1), ( 4,'M',NULL,0,2), ( 4,'L',NULL,0,3), ( 4,'XL',NULL,0,4), ( 4,'XXL',NULL,5.00,5),
( 7,'S',NULL,0,1), ( 7,'M',NULL,0,2), ( 7,'L',NULL,0,3), ( 7,'XL',NULL,0,4), ( 7,'XXL',NULL,5.00,5),
(10,'S',NULL,0,1), (10,'M',NULL,0,2), (10,'L',NULL,0,3), (10,'XL',NULL,0,4), (10,'XXL',NULL,5.00,5);

-- ---------- POLOS: color ----------
INSERT INTO atributo_valores (atributo_id, valor, color_hex, recargo, orden) VALUES
( 2,'Blanco','#ffffff',0,1), ( 2,'Negro','#111111',0,2), ( 2,'Gris','#9ca3af',0,3), ( 2,'Azul','#1d4ed8',0,4), ( 2,'Rojo','#dc2626',0,5),
( 5,'Blanco','#ffffff',0,1), ( 5,'Negro','#111111',0,2), ( 5,'Gris','#9ca3af',0,3), ( 5,'Azul','#1d4ed8',0,4), ( 5,'Rojo','#dc2626',0,5),
( 8,'Blanco','#ffffff',0,1), ( 8,'Negro','#111111',0,2), ( 8,'Gris','#9ca3af',0,3), ( 8,'Azul','#1d4ed8',0,4), ( 8,'Rojo','#dc2626',0,5),
(11,'Blanco','#ffffff',0,1), (11,'Negro','#111111',0,2), (11,'Azul','#1d4ed8',0,3), (11,'Rojo','#dc2626',0,4);

-- ---------- POLOS: técnica ----------
INSERT INTO atributo_valores (atributo_id, valor, color_hex, recargo, orden) VALUES
( 3,'DTF',NULL,0,1), ( 3,'Sublimado',NULL,0,2), ( 3,'Bordado',NULL,8.00,3),
( 6,'DTF',NULL,0,1), ( 6,'Sublimado',NULL,0,2), ( 6,'Bordado',NULL,8.00,3),
( 9,'DTF',NULL,0,1), ( 9,'Sublimado',NULL,0,2), ( 9,'Bordado',NULL,8.00,3),
(12,'DTF',NULL,0,1), (12,'Sublimado',NULL,0,2), (12,'Bordado',NULL,8.00,3);

-- ---------- TAZAS ----------
INSERT INTO atributo_valores (atributo_id, valor, color_hex, recargo, orden) VALUES
(13,'11 oz',NULL,0,1), (13,'15 oz',NULL,6.00,2),
(14,'Blanco','#ffffff',0,1), (14,'Negro','#111111',3.00,2), (14,'Rojo','#dc2626',3.00,3), (14,'Azul','#1d4ed8',3.00,4),
(15,'11 oz',NULL,0,1),
(16,'11 oz',NULL,0,1), (16,'15 oz',NULL,6.00,2),
(17,'Negro','#111111',0,1), (17,'Rojo','#dc2626',0,2), (17,'Azul','#1d4ed8',0,3), (17,'Rosado','#ec4f95',0,4);

-- ---------- STICKERS ----------
INSERT INTO atributo_valores (atributo_id, valor, color_hex, recargo, orden) VALUES
(18,'Vinil brillante',NULL,0,1), (18,'Vinil mate',NULL,0,2), (18,'Holográfico',NULL,6.00,3),
(19,'5 x 5 cm',NULL,0,1), (19,'7 x 7 cm',NULL,2.00,2), (19,'10 x 10 cm',NULL,5.00,3),
(20,'Vinil brillante',NULL,0,1), (20,'Vinil mate',NULL,0,2), (20,'Papel adhesivo',NULL,0,3);

-- ---------- LLAVEROS ----------
INSERT INTO atributo_valores (atributo_id, valor, color_hex, recargo, orden) VALUES
(21,'5 cm',NULL,0,1), (21,'7 cm',NULL,3.00,2),
(22,'5 cm',NULL,0,1), (22,'7 cm',NULL,3.00,2);

-- ---------- AGENDAS Y CUADERNOS ----------
INSERT INTO atributo_valores (atributo_id, valor, color_hex, recargo, orden) VALUES
(23,'A5',NULL,0,1), (23,'A4',NULL,8.00,2),
(24,'Espiral metálico',NULL,0,1), (24,'Espiral plástico',NULL,0,2), (24,'Wire-o',NULL,4.00,3),
(25,'Negro','#111111',0,1), (25,'Azul','#1d4ed8',0,2), (25,'Rosado','#ec4f95',0,3), (25,'Beige','#e7dcc8',0,4),
(26,'A5',NULL,0,1), (26,'A4',NULL,6.00,2),
(27,'Rayada',NULL,0,1), (27,'Cuadriculada',NULL,0,2), (27,'Punteada',NULL,0,3), (27,'Blanca',NULL,0,4);

-- ---------- BOLSAS ----------
INSERT INTO atributo_valores (atributo_id, valor, color_hex, recargo, orden) VALUES
(28,'Mediana',NULL,0,1), (28,'Grande',NULL,4.00,2),
(29,'Crudo','#e7dcc8',0,1), (29,'Negro','#111111',0,2), (29,'Azul','#1d4ed8',0,3),
(30,'DTF',NULL,0,1), (30,'Serigrafía',NULL,0,2),
(31,'Mediana',NULL,0,1), (31,'Grande',NULL,5.00,2);

-- ---------- TOMATODOS ----------
INSERT INTO atributo_valores (atributo_id, valor, color_hex, recargo, orden) VALUES
(32,'500 ml',NULL,0,1), (32,'750 ml',NULL,5.00,2), (32,'1 litro',NULL,9.00,3),
(33,'Negro','#111111',0,1), (33,'Blanco','#ffffff',0,2), (33,'Azul','#1d4ed8',0,3), (33,'Rosado','#ec4f95',0,4),
(34,'500 ml',NULL,0,1), (34,'750 ml',NULL,12.00,2);

-- ---------- GORROS ----------
INSERT INTO atributo_valores (atributo_id, valor, color_hex, recargo, orden) VALUES
(35,'Jockey',NULL,0,1), (35,'Bucket',NULL,4.00,2), (35,'Trucker',NULL,2.00,3),
(36,'Negro','#111111',0,1), (36,'Blanco','#ffffff',0,2), (36,'Beige','#e7dcc8',0,3), (36,'Azul','#1d4ed8',0,4),
(37,'Bordado',NULL,0,1), (37,'DTF',NULL,0,2);

-- ---------- LAPICEROS ----------
INSERT INTO atributo_valores (atributo_id, valor, color_hex, recargo, orden) VALUES
(38,'Blanco','#ffffff',0,1), (38,'Negro','#111111',0,2), (38,'Azul','#1d4ed8',0,3), (38,'Rojo','#dc2626',0,4);

-- ---------- CAJAS ----------
INSERT INTO atributo_valores (atributo_id, valor, color_hex, recargo, orden) VALUES
(39,'Cartulina dúplex',NULL,0,1), (39,'Microcorrugado',NULL,3.00,2),
(40,'Pequeña',NULL,0,1), (40,'Mediana',NULL,2.00,2), (40,'Grande',NULL,5.00,3);

-- ---------- BANNERS ----------
INSERT INTO atributo_valores (atributo_id, valor, color_hex, recargo, orden) VALUES
(41,'Banner 13 oz',NULL,0,1), (41,'Vinil adhesivo',NULL,15.00,2),
(42,'Con ojales',NULL,0,1), (42,'Con bastón',NULL,20.00,2),
(43,'Estándar',NULL,0,1), (43,'Con estuche reforzado',NULL,35.00,2);


-- =====================================================================
--  COMPROBACIÓN
--  Debe salir:  usuarios 2 · categorias 11 · productos 22
--               atributos 43 · atributo_valores 134
-- =====================================================================
SELECT 'usuarios'         AS tabla, COUNT(*) AS filas FROM usuarios
UNION ALL SELECT 'categorias',       COUNT(*) FROM categorias
UNION ALL SELECT 'productos',        COUNT(*) FROM productos
UNION ALL SELECT 'atributos',        COUNT(*) FROM atributos
UNION ALL SELECT 'atributo_valores', COUNT(*) FROM atributo_valores;
