const db = require('../db');

async function listarPorProveedor(proveedorId) {
    const [ordenes] = await db.query(
        `SELECT id, codigo, estado, fecha_entrega, respuesta,
                subtotal, igv, total, creado_en, respondido_en
           FROM ordenes_compra
          WHERE proveedor_id = ?
          ORDER BY creado_en DESC`,
        [proveedorId]
    );

    if (ordenes.length === 0) return [];

    const ids = ordenes.map((o) => o.id);

    const [lineas] = await db.query(
        `SELECT id, orden_id, descripcion, cantidad, precio_unitario, subtotal
           FROM orden_items
          WHERE orden_id IN (?)
          ORDER BY id`,
        [ids]
    );

    return ordenes.map((o) => ({
        ...o,
        items: lineas.filter((l) => l.orden_id === o.id),
    }));
}


async function contarPorProveedor(proveedorId) {
    const [filas] = await db.query(
        'SELECT COUNT(*) AS total FROM ordenes_compra WHERE proveedor_id = ?',
        [proveedorId]
    );

    return filas[0].total;
}


async function existe(id) {
    const [filas] = await db.query('SELECT id FROM ordenes_compra WHERE id = ?', [id]);
    return filas.length > 0;
}


async function ultimoNumeroDelAnio(anio) {
    const [filas] = await db.query(
        `SELECT MAX(CAST(SUBSTRING(codigo, 9) AS UNSIGNED)) AS ultimo
           FROM ordenes_compra
          WHERE codigo LIKE ?`,
        [`OC-${anio}-%`]
    );

    return filas[0].ultimo || 0;
}


async function crear(orden) {
    const [r] = await db.query(
        `INSERT INTO ordenes_compra (codigo, proveedor_id, fecha_entrega,
                                     subtotal, igv, total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orden.codigo, orden.proveedor_id, orden.fecha_entrega,
         orden.subtotal, orden.igv, orden.total]
    );

    return r.insertId;
}


async function agregarItem(ordenId, item) {
    await db.query(
        `INSERT INTO orden_items (orden_id, descripcion, cantidad,
                                  precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [ordenId, item.descripcion, item.cantidad, item.precio_unitario, item.subtotal]
    );
}


async function borrar(id) {
    const [r] = await db.query('DELETE FROM ordenes_compra WHERE id = ?', [id]);
    return r.affectedRows;
}


async function responder(id, proveedorId, estado, respuesta) {
    const [r] = await db.query(
        `UPDATE ordenes_compra
            SET estado = ?, respuesta = ?, respondido_en = NOW()
          WHERE id = ? AND proveedor_id = ? AND estado = 'enviada'`,
        [estado, respuesta, id, proveedorId]
    );

    return r.affectedRows;
}


module.exports = {
    listarPorProveedor,
    contarPorProveedor,
    existe,
    ultimoNumeroDelAnio,
    crear,
    agregarItem,
    borrar,
    responder,
};
