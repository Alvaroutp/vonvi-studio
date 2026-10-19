const db = require('../db');

// El pedido de este cliente y de nadie mas. El usuario va en el WHERE
// para que nadie abra el pedido de otro escribiendo un codigo
async function buscarDeCliente(codigo, usuarioId) {
    const [filas] = await db.query(
        'SELECT * FROM pedidos WHERE codigo = ? AND usuario_id = ?',
        [codigo, usuarioId]
    );


    return filas[0] || null;
}


// Las lineas con la foto del producto. Va LEFT JOIN y no JOIN porque el
// producto pudo borrarse del catalogo: la linea sigue existiendo y el
// pedido tiene que poder abrirse igual, solo que sin foto
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


// Los pasos que ya dio el pedido, con la fecha y el comentario que
// escribio el panel
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