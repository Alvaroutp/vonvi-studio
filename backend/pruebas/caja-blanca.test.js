const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');

const db = require('../db');
const estadoServicio = require('../servicios/estadoServicio');
const pedidoDAO = require('../dao/pedidoDAO');

const ADMIN = { id: 1, rol: 'admin' };
const EMPLEADO = { id: 2, rol: 'empleado' };

const CODIGO = 'PED-BLANCA-1';
const SLUG = 'producto-solo-para-pruebas';

let pedidoId;
let productoId;

async function nacePedido(estado, pago) {
    await db.query('DELETE FROM pedido_historial WHERE pedido_id = ?', [pedidoId || 0]);
    await db.query('DELETE FROM pedido_items WHERE pedido_id = ?', [pedidoId || 0]);
    await db.query('DELETE FROM pedidos WHERE codigo = ?', [CODIGO]);

    const [r] = await db.query(
        `INSERT INTO pedidos
            (codigo, usuario_id, estado, estado_pago, subtotal, envio, total,
             nombre_contacto, email_contacto, telefono_contacto, tipo_entrega, creado_en)
         VALUES (?, 3, ?, ?, 100, 0, 100,
                 'Prueba Blanca', 'blanca@example.com', '987654321', 'recojo', NOW())`,
        [CODIGO, estado, pago]
    );

    pedidoId = r.insertId;

    await db.query(
        `INSERT INTO pedido_items
            (pedido_id, producto_id, nombre_producto, nombre_categoria,
             cantidad, precio_unitario, subtotal)
         VALUES (?, ?, 'Producto de prueba', 'Pruebas', 5, 20, 100)`,
        [pedidoId, productoId]
    );

    return pedidoId;
}

async function stockAhora() {
    const [f] = await db.query('SELECT stock FROM productos WHERE id = ?', [productoId]);

    return Number(f[0].stock);
}

before(async () => {
    const [cat] = await db.query('SELECT id FROM categorias LIMIT 1');

    await db.query('DELETE FROM productos WHERE slug = ?', [SLUG]);

    const [r] = await db.query(
        `INSERT INTO productos
            (categoria_id, nombre, slug, descripcion, precio,
             stock, cantidad_minima, dias_produccion, activo)
         VALUES (?, 'Producto solo para pruebas', ?, 'No se vende', 10,
                 100, 1, 1, 0)`,
        [cat[0].id, SLUG]
    );

    productoId = r.insertId;
});

after(async () => {
    if (pedidoId) {
        await db.query('DELETE FROM pedido_historial WHERE pedido_id = ?', [pedidoId]);
        await db.query('DELETE FROM pedido_items WHERE pedido_id = ?', [pedidoId]);
        await db.query('DELETE FROM pedidos WHERE id = ?', [pedidoId]);
    }

    if (productoId) {
        await db.query('DELETE FROM pedido_items WHERE producto_id = ?', [productoId]);
        await db.query('DELETE FROM productos WHERE id = ?', [productoId]);
    }

    await db.end();
});

describe('cambiar(): los caminos de la funcion, uno por uno', () => {

    test('camino 1: el pedido no existe, sale por el 404', async () => {
        await assert.rejects(
            () => estadoServicio.cambiar(ADMIN, 'PED-NO-EXISTE', 'listo'),
            (e) => e.codigo === 404 && /No encontramos/.test(e.message)
        );
    });

    test('camino 2: el estado destino no existe', async () => {
        await nacePedido('recibido', 'pagado');

        await assert.rejects(
            () => estadoServicio.cambiar(ADMIN, CODIGO, 'volando'),
            (e) => /Ese estado no existe/.test(e.message)
        );
    });

    test('camino 3: pedido sin pagar y destino distinto de cancelado', async () => {
        await nacePedido('recibido', 'pendiente');

        await assert.rejects(
            () => estadoServicio.cambiar(ADMIN, CODIGO, 'diseno_enviado'),
            (e) => e.codigo === 409 && /no esta pagado|no está pagado/.test(e.message)
        );
    });

    test('camino 4: pedido sin pagar pero cancelando, el 409 no se dispara', async () => {
        await nacePedido('recibido', 'pendiente');

        const r = await estadoServicio.cambiar(ADMIN, CODIGO, 'cancelado');

        assert.equal(r.estado, 'cancelado');
    });

    test('camino 5: empleado con el pedido todavia en diseno', async () => {
        await nacePedido('recibido', 'pagado');

        await assert.rejects(
            () => estadoServicio.cambiar(EMPLEADO, CODIGO, 'diseno_enviado'),
            (e) => e.codigo === 403 && /administrador/.test(e.message)
        );
    });

    test('camino 6: empleado intentando cancelar desde el taller', async () => {
        await nacePedido('por_aprobar', 'pagado');

        await assert.rejects(
            () => estadoServicio.cambiar(EMPLEADO, CODIGO, 'cancelado'),
            (e) => e.codigo === 403 && /Solo el administrador/.test(e.message)
        );
    });

    test('camino 7: mandarlo al estado en el que ya esta', async () => {
        await nacePedido('por_aprobar', 'pagado');

        await assert.rejects(
            () => estadoServicio.cambiar(ADMIN, CODIGO, 'por_aprobar'),
            (e) => /ya esta en|ya está en/.test(e.message)
        );
    });

    test('camino 8: un salto que la maquina no permite', async () => {
        await nacePedido('recibido', 'pagado');

        await assert.rejects(
            () => estadoServicio.cambiar(ADMIN, CODIGO, 'listo'),
            (e) => /solo puedes pasar a/.test(e.message)
        );
    });

    test('camino 9: un pedido entregado ya no se mueve', async () => {
        await nacePedido('entregado', 'pagado');

        await assert.rejects(
            () => estadoServicio.cambiar(ADMIN, CODIGO, 'listo'),
            (e) => /ya no se puede mover/.test(e.message)
        );
    });

    test('camino 10: el camino bueno graba el historial y la fecha', async () => {
        await nacePedido('por_aprobar', 'pagado');

        const r = await estadoServicio.cambiar(ADMIN, CODIGO, 'en_produccion', 'Entro a prensa');

        assert.equal(r.estado, 'en_produccion');
        assert.ok(r.historial.some((h) => h.comentario === 'Entro a prensa'));

        const [f] = await db.query(
            'SELECT fecha_produccion FROM pedidos WHERE id = ?', [pedidoId]
        );

        assert.ok(f[0].fecha_produccion !== null);
    });

    test('camino 11: el comentario se corta en 300 caracteres', async () => {
        await nacePedido('por_aprobar', 'pagado');

        await estadoServicio.cambiar(ADMIN, CODIGO, 'en_produccion', 'x'.repeat(500));

        const [f] = await db.query(
            'SELECT comentario FROM pedido_historial WHERE pedido_id = ? ORDER BY id DESC LIMIT 1',
            [pedidoId]
        );

        assert.equal(f[0].comentario.length, 300);
    });

    test('camino 12: cancelar un pedido pagado devuelve el stock', async () => {
        await nacePedido('recibido', 'pagado');

        const antes = await stockAhora();

        await estadoServicio.cambiar(ADMIN, CODIGO, 'cancelado');

        assert.equal(await stockAhora(), antes + 5);
    });

    test('camino 13: cancelar uno sin pagar no regala stock', async () => {
        await nacePedido('recibido', 'pendiente');

        const antes = await stockAhora();

        await estadoServicio.cambiar(ADMIN, CODIGO, 'cancelado');

        assert.equal(await stockAhora(), antes);
    });
});

describe('El candado del stock', () => {

    test('si hay suficiente, descuenta', async () => {
        await db.query('UPDATE productos SET stock = 10 WHERE id = ?', [productoId]);

        const filas = await pedidoDAO.transaccion(
            (cx) => pedidoDAO.bajarStock(cx, productoId, 4)
        );

        assert.equal(filas, 1);
        assert.equal(await stockAhora(), 6);
    });

    test('si falta uno, no descuenta y avisa con 0 filas', async () => {
        await db.query('UPDATE productos SET stock = 3 WHERE id = ?', [productoId]);

        const filas = await pedidoDAO.transaccion(
            (cx) => pedidoDAO.bajarStock(cx, productoId, 4)
        );

        assert.equal(filas, 0);
        assert.equal(await stockAhora(), 3);
    });

    test('dos compras a la vez del ultimo producto: solo una gana', async () => {
        await db.query('UPDATE productos SET stock = 1 WHERE id = ?', [productoId]);

        const [a, b] = await Promise.all([
            pedidoDAO.transaccion((cx) => pedidoDAO.bajarStock(cx, productoId, 1)),
            pedidoDAO.transaccion((cx) => pedidoDAO.bajarStock(cx, productoId, 1)),
        ]);

        assert.equal(a + b, 1);
        assert.equal(await stockAhora(), 0);
    });

    test('la transaccion deshace todo si algo revienta a medias', async () => {
        await db.query('UPDATE productos SET stock = 10 WHERE id = ?', [productoId]);

        await assert.rejects(() => pedidoDAO.transaccion(async (cx) => {
            await pedidoDAO.bajarStock(cx, productoId, 4);
            throw new Error('se cayo la luz');
        }));

        assert.equal(await stockAhora(), 10);
    });
});

describe('El seguro contra el doble clic', () => {

    const CARRITO = 999001;
    const USUARIO = 3;

    before(async () => {
        await db.query('DELETE FROM pedidos WHERE carrito_id = ?', [CARRITO]);
    });

    after(async () => {
        await db.query('DELETE FROM pedidos WHERE carrito_id = ?', [CARRITO]);
    });

    test('un pedido de hace 5 segundos si lo encuentra', async () => {
        await db.query(
            `INSERT INTO pedidos
                (codigo, usuario_id, carrito_id, estado, estado_pago,
                 subtotal, envio, total, nombre_contacto, email_contacto,
                 telefono_contacto, tipo_entrega, creado_en)
             VALUES ('PED-DOBLE-1', ?, ?, 'recibido', 'pagado', 50, 0, 50,
                     'Prueba', 'p@example.com', '987654321', 'recojo',
                     NOW() - INTERVAL 5 SECOND)`,
            [USUARIO, CARRITO]
        );

        const hallado = await pedidoDAO.recienteDeCarrito(CARRITO, USUARIO, 60);

        assert.ok(hallado);
        assert.equal(hallado.codigo, 'PED-DOBLE-1');
    });

    test('el mismo pedido de hace 2 horas ya no cuenta', async () => {
        await db.query(
            'UPDATE pedidos SET creado_en = NOW() - INTERVAL 2 HOUR WHERE carrito_id = ?',
            [CARRITO]
        );

        assert.equal(await pedidoDAO.recienteDeCarrito(CARRITO, USUARIO, 60), null);
    });

    test('el pedido de otro usuario no se devuelve nunca', async () => {
        await db.query(
            'UPDATE pedidos SET creado_en = NOW() WHERE carrito_id = ?', [CARRITO]
        );

        assert.equal(await pedidoDAO.recienteDeCarrito(CARRITO, 9999, 60), null);
    });
});
