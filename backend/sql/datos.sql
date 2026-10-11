-- Datos de prueba de Vonvi Studio Peru
--
-- CUENTA DEL ADMINISTRADOR
--   Correo:      admin@vonvi.pe
--   Contrasena:  Vonvi2026
--
-- Todas las demas cuentas usan la misma contrasena:
--   kelvin@vonvi.pe         empleado
--   maria@example.com       cliente
--   mario@textileslima.pe   proveedor
--
-- Se ejecuta DESPUES de base_datos.sql, y se puede repetir las veces
-- que quieras: lo primero que hace es vaciar las tablas.

USE vonvi_studio;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE carrito_item_opciones;
TRUNCATE TABLE carrito_items;
TRUNCATE TABLE carritos;
TRUNCATE TABLE orden_items;
TRUNCATE TABLE ordenes_compra;
TRUNCATE TABLE atributo_valores;
TRUNCATE TABLE atributos;
TRUNCATE TABLE productos;
TRUNCATE TABLE categorias;
TRUNCATE TABLE usuarios;
TRUNCATE TABLE proveedores;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO proveedores (id, razon_social, ruc, direccion, telefono, email) VALUES
(1, 'Textiles Lima S.A.C.', '20512345678', 'Av. Argentina 1234, Cercado de Lima',
    '987 654 321', 'ventas@textileslima.pe'),
(2, 'Grafica Andina E.I.R.L.', '20487654321', 'Jr. Paruro 567, Lima',
    '981 223 445', 'contacto@graficaandina.pe'),
(3, 'Ceramicas del Sur S.A.', '20599887766', 'Av. Los Olivos 890, Ate',
    '945 112 889', 'pedidos@ceramicasdelsur.pe');

INSERT INTO usuarios (id, nombres, apellidos, email, password, telefono, proveedor_id, rol) VALUES

(1, 'Alvaro', 'Crivillero', 'admin@vonvi.pe',
    '$2b$10$74VkFfuCPJ9DZqxS3VHjFeICD3FPnpfUBIn8pSSuHSY0QIovPMTui',
    '907 100 820', NULL, 'admin'),

(2, 'Kelvin', 'Lazaro Barzola', 'kelvin@vonvi.pe',
    '$2b$10$74VkFfuCPJ9DZqxS3VHjFeICD3FPnpfUBIn8pSSuHSY0QIovPMTui',
    '912 334 556', NULL, 'empleado'),
(3, 'Ivonne', 'Escobar Murillo', 'ivonne@vonvi.pe',
    '$2b$10$74VkFfuCPJ9DZqxS3VHjFeICD3FPnpfUBIn8pSSuHSY0QIovPMTui',
    '933 221 004', NULL, 'empleado'),

(4, 'Maria', 'Fernandez Rojas', 'maria@example.com',
    '$2b$10$74VkFfuCPJ9DZqxS3VHjFeICD3FPnpfUBIn8pSSuHSY0QIovPMTui',
    '987 654 321', NULL, 'cliente'),
(5, 'Jorge', 'Quispe Mamani', 'jorge@example.com',
    '$2b$10$74VkFfuCPJ9DZqxS3VHjFeICD3FPnpfUBIn8pSSuHSY0QIovPMTui',
    '961 445 220', NULL, 'cliente'),
(6, 'Lucia', 'Torres Vega', 'lucia@example.com',
    '$2b$10$74VkFfuCPJ9DZqxS3VHjFeICD3FPnpfUBIn8pSSuHSY0QIovPMTui',
    '975 330 118', NULL, 'cliente'),

(7, 'Mario', 'Salas Pinto', 'mario@textileslima.pe',
    '$2b$10$74VkFfuCPJ9DZqxS3VHjFeICD3FPnpfUBIn8pSSuHSY0QIovPMTui',
    '988 111 222', 1, 'proveedor'),
(8, 'Ana', 'Ramirez Cueva', 'ana@textileslima.pe',
    '$2b$10$74VkFfuCPJ9DZqxS3VHjFeICD3FPnpfUBIn8pSSuHSY0QIovPMTui',
    '988 333 444', 1, 'proveedor'),
(9, 'Luis', 'Chavez Ortiz', 'luis@graficaandina.pe',
    '$2b$10$74VkFfuCPJ9DZqxS3VHjFeICD3FPnpfUBIn8pSSuHSY0QIovPMTui',
    '981 555 666', 2, 'proveedor'),
(10, 'Rosa', 'Medina Lau', 'rosa@ceramicasdelsur.pe',
    '$2b$10$74VkFfuCPJ9DZqxS3VHjFeICD3FPnpfUBIn8pSSuHSY0QIovPMTui',
    '945 777 888', 3, 'proveedor');

INSERT INTO categorias (id, nombre, slug, descripcion, icono, activo) VALUES
(1, 'Polos', 'polos', 'Polos de algodon para empresas, eventos y campanas',
    'fa-solid fa-shirt', 1),
(2, 'Tazas', 'tazas', 'Tazas de ceramica personalizadas con tu diseno',
    'fa-solid fa-mug-hot', 1),
(3, 'Gorras', 'gorras', 'Gorras bordadas y estampadas',
    'fa-solid fa-hat-cowboy', 1),
(4, 'Stickers', 'stickers', 'Stickers en vinilo troquelado, resistentes al agua',
    'fa-solid fa-note-sticky', 1),
(5, 'Agendas', 'agendas', 'Agendas y cuadernos con tu logo',
    'fa-solid fa-book', 0);

INSERT INTO productos
    (id, categoria_id, nombre, slug, descripcion, precio, stock,
     cantidad_minima, dias_produccion, activo) VALUES

(1, 1, 'Polo clasico algodon 20/1', 'polo-clasico-algodon-20-1',
    'Polo cuello redondo en algodon peinado 20/1. Ideal para uniformes.',
    28.00, 120, 12, 3, 1),
(2, 1, 'Polo cuello V', 'polo-cuello-v',
    'Polo cuello en V, corte entallado.', 32.00, 45, 12, 4, 1),
(3, 1, 'Polo oversize', 'polo-oversize',
    'Corte ancho, tendencia urbana.', 38.00, 0, 10, 5, 1),
(4, 1, 'Polo manga larga', 'polo-manga-larga',
    'Para climas frios o uso corporativo.', 36.00, 18, 12, 4, 0),

(5, 2, 'Taza ceramica 11 oz', 'taza-ceramica-11-oz',
    'Taza blanca de ceramica, sublimada a todo color.', 15.00, 86, 6, 2, 1),
(6, 2, 'Taza magica', 'taza-magica',
    'Negra en frio, revela el diseno con el calor.', 22.00, 14, 6, 3, 1),
(7, 2, 'Taza de vidrio esmerilado', 'taza-de-vidrio-esmerilado',
    'Grabado laser sobre vidrio.', 26.00, 30, 6, 4, 1),

(8, 3, 'Gorra bordada 5 paneles', 'gorra-bordada-5-paneles',
    'Bordado directo, hasta tres colores de hilo.', 25.00, 60, 20, 6, 1),
(9, 3, 'Gorra trucker', 'gorra-trucker',
    'Frente de tela y malla atras.', 27.00, 0, 20, 6, 1),

(10, 4, 'Sticker vinilo troquelado', 'sticker-vinilo-troquelado',
    'Corte segun la forma de tu diseno. Resistente al agua.',
    1.50, 2400, 50, 2, 1),
(11, 4, 'Sticker holografico', 'sticker-holografico',
    'Acabado tornasolado.', 2.80, 900, 50, 3, 1),

(12, 5, 'Agenda anillada A5', 'agenda-anillada-a5',
    'Tapa dura con tu logo grabado.', 34.00, 25, 10, 7, 1);

INSERT INTO atributos (id, producto_id, nombre, tipo, orden) VALUES
(1, 1, 'Talla', 'select', 1),
(2, 1, 'Color', 'color', 2),
(3, 2, 'Talla', 'select', 1),
(4, 2, 'Color', 'color', 2),
(5, 5, 'Color interior', 'color', 1),
(6, 5, 'Acabado', 'select', 2),
(7, 6, 'Color', 'color', 1),
(8, 8, 'Color', 'color', 1),
(9, 10, 'Tamano', 'select', 1),
(10, 11, 'Tamano', 'select', 1);

INSERT INTO atributo_valores (atributo_id, valor, color_hex, recargo, orden) VALUES
(1, 'S',  NULL, 0.00, 1),
(1, 'M',  NULL, 0.00, 2),
(1, 'L',  NULL, 0.00, 3),
(1, 'XL', NULL, 2.00, 4),
(2, 'Blanco',      '#ffffff', 0.00, 1),
(2, 'Negro',       '#111111', 0.00, 2),
(2, 'Azul marino', '#1b2a4a', 1.50, 3),
(2, 'Rojo',        '#c0392b', 1.50, 4),

(3, 'S', NULL, 0.00, 1),
(3, 'M', NULL, 0.00, 2),
(3, 'L', NULL, 0.00, 3),
(4, 'Blanco', '#ffffff', 0.00, 1),
(4, 'Gris',   '#8a93a0', 0.00, 2),

(5, 'Blanco',       '#ffffff', 0.00, 1),
(5, 'Negro magico', '#111111', 4.00, 2),
(5, 'Rojo',         '#c0392b', 3.00, 3),
(6, 'Brillante', NULL, 0.00, 1),
(6, 'Mate',      NULL, 2.50, 2),

(7, 'Negro', '#111111', 0.00, 1),
(7, 'Rojo',  '#c0392b', 0.00, 2),

(8, 'Negro', '#111111', 0.00, 1),
(8, 'Beige', '#d8c9a8', 0.00, 2),
(8, 'Azul',  '#1b2a4a', 0.00, 3),

(9,  '5 cm',  NULL, 0.00, 1),
(9,  '8 cm',  NULL, 0.80, 2),
(9,  '12 cm', NULL, 1.60, 3),
(10, '5 cm',  NULL, 0.00, 1),
(10, '8 cm',  NULL, 1.20, 2);

INSERT INTO ordenes_compra
    (id, codigo, proveedor_id, estado, fecha_entrega, respuesta,
     subtotal, igv, total, creado_en, respondido_en, recibido_en) VALUES

(1, 'OC-2026-001', 1, 'enviada', '2026-11-20', NULL,
    1700.00, 306.00, 2006.00, '2026-10-01 09:15:00', NULL, NULL),

(2, 'OC-2026-002', 2, 'aceptada', '2026-11-10', NULL,
    900.00, 162.00, 1062.00, '2026-10-02 11:40:00', '2026-10-02 16:05:00', NULL),

(3, 'OC-2026-003', 3, 'recibida', '2026-10-15', NULL,
    1230.00, 221.40, 1451.40, '2026-10-03 08:00:00',
    '2026-10-03 10:30:00', '2026-10-14 15:20:00'),

(4, 'OC-2026-004', 1, 'rechazada', '2026-10-25',
    'No tenemos stock de algodon 20/1 hasta diciembre.',
    560.00, 100.80, 660.80, '2026-10-04 14:10:00', '2026-10-05 09:00:00', NULL);

INSERT INTO orden_items
    (orden_id, producto_id, descripcion, cantidad, precio_unitario, subtotal) VALUES

(1, 1, 'Polo clasico algodon 20/1', 100, 14.00, 1400.00),
(1, 2, 'Polo cuello V',              20, 15.00,  300.00),

(2, 10, 'Sticker vinilo troquelado', 1500, 0.40, 600.00),
(2, 11, 'Sticker holografico',        300, 1.00, 300.00),

(3, 5, 'Taza ceramica 11 oz', 150, 6.20, 930.00),
(3, 6, 'Taza magica',          30, 10.00, 300.00),

(4, 1, 'Polo clasico algodon 20/1', 40, 14.00, 560.00);