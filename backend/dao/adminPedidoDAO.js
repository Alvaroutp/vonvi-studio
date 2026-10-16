const db = require('../db');


// Las columnas de fecha que se pueden escribir. Esta lista existe para
// que el nombre de la columna NUNCA venga de afuera: abajo se arma SQL
// pegando texto, y pegar texto que mando el navegador es una inyeccion
const COLUMNAS_FECHA = [
    'fecha_recibido', 'fecha_diseno', 'fecha_aprobacion',
    'fecha_produccion', 'fecha_control', 'fecha_listo', 'fecha_entregado',
];


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


// Arma el WHERE segun lo que eligio el admin en los filtros. Cada
// pedazo guarda su interrogante aparte, nunca el valor pegado al texto
function filtrar(f) {
    const partes = [];
    const datos = [];

    if (f.desde) { partes.push('p.creado_en >= ?'); datos.push(f.desde + ' 00:00:00'); }
    if (f.hasta) { partes.push('p.creado_en <= ?'); datos.push(f.hasta + ' 23:59:59'); }
    if (f.estado) { partes.push('p.estado = ?'); datos.push(f.estado); }
    if (f.pago) { partes.push('p.estado_pago = ?'); datos.push(f.pago); }

    if (f.buscar) {
        partes.push('(p.codigo LIKE ? OR p.nombre_contacto LIKE ? OR p.email_contacto LIKE ?)');
        const texto = '%' + f.buscar + '%';
        datos.push(texto, texto, texto);
    }

    return {
        where: partes.length ? 'WHERE ' + partes.join(' AND ') : '',
        datos,
    };
}


async function contar(f) {
    const { where, datos } = filtrar(f);

    const [filas] = await db.query(
        `SELECT COUNT(*) AS total FROM pedidos p ${where}`, datos
    );

    return filas[0].total;
}


async function listar(f, limite, salto) {
    const { where, datos } = filtrar(f);

    const [filas] = await db.query(
        `SELECT p.id, p.codigo, p.estado, p.estado_pago, p.total, p.creado_en,
                p.nombre_contacto AS cliente, p.email_contacto AS cliente_email
           FROM pedidos p
           ${where}
          ORDER BY p.id DESC
          LIMIT ? OFFSET ?`,
        [...datos, limite, salto]
    );

    return filas;
}


// El admin puede abrir cualquier pedido, por eso aqui no va el usuario
async function buscarPorCodigo(codigo) {
    const [filas] = await db.query('SELECT * FROM pedidos WHERE codigo = ?', [codigo]);
    return filas[0] || null;
}


async function items(pedidoId) {
    const [filas] = await db.query(
        'SELECT * FROM pedido_items WHERE pedido_id = ? ORDER BY id', [pedidoId]
    );

    return filas;
}


async function historial(pedidoId) {
    const [filas] = await db.query(
        `SELECT estado, comentario, creado_en
           FROM pedido_historial
          WHERE pedido_id = ?
          ORDER BY id`,
        [pedidoId]
    );

    return filas;
}


// Cambia el estado solo si el pedido sigue en el estado que creiamos.
// Si otro empleado lo movio mientras tanto, devuelve 0 y no pisa nada
async function cambiarEstado(cx, pedidoId, estadoAnterior, estadoNuevo, columnaFecha) {
    let sql = 'UPDATE pedidos SET estado = ?';

    if (columnaFecha && COLUMNAS_FECHA.includes(columnaFecha)) {
        sql += `, ${columnaFecha} = NOW()`;
    }

    sql += ' WHERE id = ? AND estado = ?';

    const [r] = await cx.query(sql, [estadoNuevo, pedidoId, estadoAnterior]);

    return r.affectedRows;
}


async function agregarHistorial(cx, pedidoId, estado, comentario, usuarioId) {
    await cx.query(
        `INSERT INTO pedido_historial (pedido_id, estado, comentario, usuario_id)
         VALUES (?, ?, ?, ?)`,
        [pedidoId, estado, comentario, usuarioId]
    );
}


// Al cancelar un pedido ya pagado, lo que se habia descontado vuelve
async function devolverStock(cx, productoId, cantidad) {
    const [r] = await cx.query(
        'UPDATE productos SET stock = stock + ? WHERE id = ?', [cantidad, productoId]
    );

    return r.affectedRows;
}


module.exports = {
    transaccion,
    contar,
    listar,
    buscarPorCodigo,
    items,
    historial,
    cambiarEstado,
    agregarHistorial,
    devolverStock,
};
