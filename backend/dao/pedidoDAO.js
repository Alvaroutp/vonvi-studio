const db = require('../db');


async function transaccion(trabajo) {
    const cx = await db.getConnection();

    try {
        await cx.beginTransaction();
        const resultado = await trabajo(cx);
        await cx.commit();
        return resultado;

    } catch (error) {
        await cx.rollback();
        throw error;

    } finally {
        cx.release();
    }
}


async function siguienteCodigo(cx) {
    const anio = new Date().getFullYear();

    const [filas] = await (cx || db).query(
        'SELECT codigo FROM pedidos WHERE codigo LIKE ? ORDER BY id DESC LIMIT 1',
        ['PED-' + anio + '-%']
    );

    const ultimo = filas[0] ? Number(filas[0].codigo.split('-')[2]) : 0;

    return 'PED-' + anio + '-' + String(ultimo + 1).padStart(3, '0');
}


async function recienteDeCarrito(carritoId, usuarioId, segundos) {
    const [filas] = await db.query(
        `SELECT * FROM pedidos
          WHERE carrito_id = ? AND usuario_id = ?
            AND creado_en >= NOW() - INTERVAL ? SECOND
          ORDER BY id DESC LIMIT 1`,
        [carritoId, usuarioId, segundos]
    );

    return filas[0] || null;
}


async function crear(cx, datos) {
    const [r] = await cx.query(
        `INSERT INTO pedidos
            (codigo, usuario_id, carrito_id,
             nombre_contacto, email_contacto, telefono_contacto,
             tipo_entrega, departamento, provincia, distrito, direccion, referencia,
             subtotal, envio, total, notas,
             fecha_recibido, fecha_entrega_estimada)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [datos.codigo, datos.usuario_id, datos.carrito_id,
         datos.nombre_contacto, datos.email_contacto, datos.telefono_contacto,
         datos.tipo_entrega, datos.departamento, datos.provincia,
         datos.distrito, datos.direccion, datos.referencia,
         datos.subtotal, datos.envio, datos.total, datos.notas,
         datos.fecha_entrega_estimada]
    );

    return r.insertId;
}


async function agregarItem(cx, pedidoId, item) {
    await cx.query(
        `INSERT INTO pedido_items
            (pedido_id, producto_id, nombre_producto, nombre_categoria,
             cantidad, precio_unitario, subtotal, opciones, archivo, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [pedidoId, item.producto_id, item.nombre_producto, item.nombre_categoria,
         item.cantidad, item.precio_unitario, item.subtotal,
         item.opciones, item.archivo, item.notas]
    );
}


async function buscarPorCodigo(codigo, usuarioId) {
    const [filas] = await db.query(
        'SELECT * FROM pedidos WHERE codigo = ? AND usuario_id = ?',
        [codigo, usuarioId]
    );

    return filas[0] || null;
}


async function listarDe(usuarioId) {
    const [filas] = await db.query(
        `SELECT p.*, COUNT(i.id) AS total_lineas, SUM(i.cantidad) AS total_articulos
           FROM pedidos p
           LEFT JOIN pedido_items i ON i.pedido_id = p.id
          WHERE p.usuario_id = ?
          GROUP BY p.id
          ORDER BY p.id DESC`,
        [usuarioId]
    );

    return filas;
}


async function marcarPagado(cx, pedidoId, datos) {
    const [r] = await cx.query(
        `UPDATE pedidos
            SET estado_pago = 'pagado', metodo_pago = ?,
                referencia_pago = ?, ultimos4 = ?
          WHERE id = ? AND estado_pago = 'pendiente'`,
        [datos.metodo_pago, datos.referencia_pago, datos.ultimos4, pedidoId]
    );

    return r.affectedRows;
}


async function bajarStock(cx, productoId, cantidad) {
    const [r] = await cx.query(
        'UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?',
        [cantidad, productoId, cantidad]
    );

    return r.affectedRows;
}


async function stockDe(productoId) {
    const [filas] = await db.query(
        'SELECT stock FROM productos WHERE id = ?', [productoId]
    );

    return filas[0] ? filas[0].stock : 0;
}


module.exports = {
    transaccion,
    siguienteCodigo,
    recienteDeCarrito,
    crear,
    agregarItem,
    buscarPorCodigo,
    listarDe,
    marcarPagado,
    bajarStock,
    stockDe,
};
