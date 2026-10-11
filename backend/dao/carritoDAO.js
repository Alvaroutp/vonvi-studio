const db = require('../db');

async function obtener(usuarioId, token) {
    if (usuarioId) {
        const [filas] = await db.query('SELECT * FROM carritos WHERE usuario_id = ?', [usuarioId]);
        return filas[0] || null;
    }

    if (!token) return null;

    const [filas] = await db.query('SELECT * FROM carritos WHERE token = ?', [token]);
    return filas[0] || null;
}


async function crear(usuarioId, token) {
    const [r] = await db.query(
        'INSERT INTO carritos (usuario_id, token) VALUES (?, ?)',
        [usuarioId || null, usuarioId ? null : token]
    );

    return r.insertId;
}

async function tocar(carritoId) {
    await db.query('UPDATE carritos SET actualizado_en = NOW() WHERE id = ?', [carritoId]);
}

async function items(carritoId) {
    const [lineas] = await db.query(
        `SELECT ci.id, ci.cantidad, ci.precio_unitario, ci.notas,
                ci.estampa_archivo, ci.estampa_nombre,
                p.id   AS producto_id,
                p.nombre AS producto_nombre,
                p.slug   AS producto_slug,
                p.imagen AS producto_imagen,
                p.stock, p.cantidad_minima, p.dias_produccion, p.activo,
                c.nombre AS categoria_nombre
           FROM carrito_items ci
           JOIN productos  p ON p.id = ci.producto_id
           JOIN categorias c ON c.id = p.categoria_id
          WHERE ci.carrito_id = ?
          ORDER BY ci.id`,
        [carritoId]
    );

    if (lineas.length === 0) return [];

    const ids = lineas.map((l) => l.id);

    const [opciones] = await db.query(
        `SELECT o.item_id, a.nombre AS atributo, v.valor, v.id AS valor_id, v.recargo
           FROM carrito_item_opciones o
           JOIN atributo_valores v ON v.id = o.valor_id
           JOIN atributos        a ON a.id = v.atributo_id
          WHERE o.item_id IN (?)
          ORDER BY a.orden, a.id, v.orden, v.id`,
        [ids]
    );

    return lineas.map((l) => ({
        ...l,
        subtotal: Number((Number(l.precio_unitario) * l.cantidad).toFixed(2)),
        estampa_url: l.estampa_archivo ? 'img/disenos/' + l.estampa_archivo : null,
        opciones: opciones.filter((o) => o.item_id === l.id),
    }));
}

async function opcionesPorItem(carritoId) {
    const [filas] = await db.query(
        `SELECT o.item_id, o.valor_id
           FROM carrito_item_opciones o
           JOIN carrito_items ci ON ci.id = o.item_id
          WHERE ci.carrito_id = ?`,
        [carritoId]
    );

    return filas;
}

async function itemsSimples(carritoId) {
    const [filas] = await db.query(
        `SELECT id, producto_id, cantidad, notas, estampa_archivo
           FROM carrito_items
          WHERE carrito_id = ?`,
        [carritoId]
    );

    return filas;
}


async function agregarItem(carritoId, datos) {
    const [r] = await db.query(
        `INSERT INTO carrito_items
            (carrito_id, producto_id, cantidad, precio_unitario,
             estampa_archivo, estampa_nombre, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [carritoId, datos.producto_id, datos.cantidad, datos.precio_unitario,
         datos.estampa_archivo, datos.estampa_nombre, datos.notas]
    );

    return r.insertId;
}


async function agregarOpcion(itemId, valorId) {
    await db.query(
        'INSERT INTO carrito_item_opciones (item_id, valor_id) VALUES (?, ?)',
        [itemId, valorId]
    );
}


async function cambiarCantidad(itemId, carritoId, cantidad) {
    const [r] = await db.query(
        'UPDATE carrito_items SET cantidad = ? WHERE id = ? AND carrito_id = ?',
        [cantidad, itemId, carritoId]
    );

    return r.affectedRows;
}


async function sumarCantidad(itemId, cantidad) {
    const [r] = await db.query(
        'UPDATE carrito_items SET cantidad = cantidad + ? WHERE id = ?',
        [cantidad, itemId]
    );

    return r.affectedRows;
}


async function borrarItem(itemId, carritoId) {
    const [r] = await db.query(
        'DELETE FROM carrito_items WHERE id = ? AND carrito_id = ?', [itemId, carritoId]
    );

    return r.affectedRows;
}

async function vaciar(carritoId) {
    const [r] = await db.query('DELETE FROM carrito_items WHERE carrito_id = ?', [carritoId]);
    return r.affectedRows;
}

async function moverItems(deCarritoId, aCarritoId) {
    const [r] = await db.query(
        'UPDATE carrito_items SET carrito_id = ? WHERE carrito_id = ?',
        [aCarritoId, deCarritoId]
    );

    return r.affectedRows;
}


async function borrar(carritoId) {
    const [r] = await db.query('DELETE FROM carritos WHERE id = ?', [carritoId]);
    return r.affectedRows;
}


module.exports = {
    obtener,
    crear,
    tocar,
    items,
    itemsSimples,
    opcionesPorItem,
    agregarItem,
    agregarOpcion,
    cambiarCantidad,
    sumarCantidad,
    borrarItem,
    vaciar,
    moverItems,
    borrar,
};
