const db = require('../db');

async function buscarDeCliente(codigo, usuarioId) {
    const [filas] = await db.query(
        'SELECT * FROM pedidos WHERE codigo = ? AND usuario_id = ?',
        [codigo, usuarioId]
    );


    return filas[0] || null;
}


async function lineas(pedidoId) {
    const [filas] = await db.query(
        `SELECT i.*, p.imagen AS producto_imagen
           FROM pedido_items i
           LEFT JOIN productos p ON p.id = i.producto_id
          WHERE i.pedido_id = ?
          ORDER BY i.id`,
        [pedidoId]
    );

    return filas;
}


async function pasos(pedidoId) {
    const [filas] = await db.query(
        `SELECT estado, comentario, creado_en
           FROM pedido_historial
          WHERE pedido_id = ?
          ORDER BY id`,
        [pedidoId]
    );

    return filas;
}


module.exports = {
    buscarDeCliente,
    lineas,
    pasos,
};
