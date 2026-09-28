const db = require('../db');

// Atributos

async function listarPorProducto(productoId) {
    const [filas] = await db.query(
        `SELECT id, nombre, tipo, orden
           FROM atributos
          WHERE producto_id = ?
          ORDER BY orden, id`,
        [productoId]
    );

    return filas;
}


async function existe(id) {
    const [filas] = await db.query('SELECT id FROM atributos WHERE id = ?', [id]);
    return filas.length > 0;
}


async function siguienteOrden(productoId) {
    const [filas] = await db.query(
        `SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente
           FROM atributos
          WHERE producto_id = ?`,
        [productoId]
    );

    return filas[0].siguiente;
}


async function crear(productoId, datos) {
    const [r] = await db.query(
        'INSERT INTO atributos (producto_id, nombre, tipo, orden) VALUES (?, ?, ?, ?)',
        [productoId, datos.nombre, datos.tipo, datos.orden]
    );

    return r.insertId;
}


async function actualizar(id, datos) {
    const [r] = await db.query(
        'UPDATE atributos SET nombre = ?, tipo = ? WHERE id = ?',
        [datos.nombre, datos.tipo, id]
    );

    return r.affectedRows;
}


async function borrar(id) {
    const [r] = await db.query('DELETE FROM atributos WHERE id = ?', [id]);
    return r.affectedRows;
}


// Valores

async function listarValoresDeProducto(productoId) {
    const [filas] = await db.query(
        `SELECT v.id, v.atributo_id, v.valor, v.color_hex, v.recargo, v.orden
           FROM atributo_valores v
           JOIN atributos a ON a.id = v.atributo_id
          WHERE a.producto_id = ?
          ORDER BY v.orden, v.id`,
        [productoId]
    );

    return filas;
}


async function siguienteOrdenValor(atributoId) {
    const [filas] = await db.query(
        `SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente
           FROM atributo_valores
          WHERE atributo_id = ?`,
        [atributoId]
    );

    return filas[0].siguiente;
}


async function crearValor(atributoId, datos) {
    const [r] = await db.query(
        `INSERT INTO atributo_valores (atributo_id, valor, color_hex, recargo, orden)
         VALUES (?, ?, ?, ?, ?)`,
        [atributoId, datos.valor, datos.colorHex, datos.recargo, datos.orden]
    );

    return r.insertId;
}


async function actualizarValor(id, datos) {
    const [r] = await db.query(
        'UPDATE atributo_valores SET valor = ?, color_hex = ?, recargo = ? WHERE id = ?',
        [datos.valor, datos.colorHex, datos.recargo, id]
    );

    return r.affectedRows;
}


async function borrarValor(id) {
    const [r] = await db.query('DELETE FROM atributo_valores WHERE id = ?', [id]);
    return r.affectedRows;
}


module.exports = {
    listarPorProducto,
    existe,
    siguienteOrden,
    crear,
    actualizar,
    borrar,
    listarValoresDeProducto,
    siguienteOrdenValor,
    crearValor,
    actualizarValor,
    borrarValor,
};
