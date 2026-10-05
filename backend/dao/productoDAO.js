const db = require('../db');

async function listarActivosDeCategoria(categoriaId) {
    const [filas] = await db.query(
        `SELECT p.id, p.nombre, p.slug, p.descripcion, p.imagen,
                p.precio AS precio_base, p.stock, p.cantidad_minima, p.dias_produccion
           FROM productos p
          WHERE p.categoria_id = ? AND p.activo = 1
          ORDER BY p.id`,
        [categoriaId]
    );

    return filas;
}


async function buscarPorTexto(texto) {
    const patron = '%' + texto + '%';

    const [filas] = await db.query(
        `SELECT p.id, p.nombre, p.slug, p.descripcion, p.imagen,
                p.precio AS precio_base, p.stock, p.cantidad_minima,
                c.nombre AS categoria
           FROM productos p
           JOIN categorias c ON c.id = p.categoria_id
          WHERE p.activo = 1 AND (p.nombre LIKE ? OR p.descripcion LIKE ?)
          ORDER BY p.nombre
          LIMIT 30`,
        [patron, patron]
    );

    return filas;
}


async function buscarPorSlugActivo(slug) {
    const [filas] = await db.query(
        `SELECT p.id, p.nombre, p.slug, p.descripcion, p.imagen,
                p.precio AS precio_base, p.stock, p.cantidad_minima, p.dias_produccion,
                c.nombre AS categoria_nombre, c.slug AS categoria_slug
           FROM productos p
           JOIN categorias c ON c.id = p.categoria_id
          WHERE p.slug = ? AND p.activo = 1`,
        [slug]
    );

    return filas[0] || null;
}


async function buscarActivoPorId(id) {
    const [filas] = await db.query(
        `SELECT id, nombre, precio, cantidad_minima
           FROM productos
          WHERE id = ? AND activo = 1`,
        [id]
    );

    return filas[0] || null;
}


async function listarParaAdmin(categoriaId) {
    const [filas] = await db.query(
        `SELECT p.id, p.categoria_id, p.nombre, p.slug, p.descripcion,
                p.precio AS precio_base, p.stock,
                p.imagen, p.cantidad_minima, p.dias_produccion, p.activo,
                c.nombre AS categoria,
                COUNT(a.id) AS total_atributos
           FROM productos p
           JOIN categorias c ON c.id = p.categoria_id
           LEFT JOIN atributos a ON a.producto_id = p.id
          WHERE (? IS NULL OR p.categoria_id = ?)
          GROUP BY p.id, p.categoria_id, p.nombre, p.slug, p.descripcion,
                   p.precio, p.stock, p.imagen, p.cantidad_minima, p.dias_produccion,
                   p.activo, c.nombre
          ORDER BY c.id, p.id`,
        [categoriaId, categoriaId]
    );

    return filas;
}

async function buscarConCategoria(id) {
    const [filas] = await db.query(
        `SELECT p.id, p.nombre, p.slug, p.precio AS precio_base, p.stock, p.categoria_id,
                c.nombre AS categoria
           FROM productos p
           JOIN categorias c ON c.id = p.categoria_id
          WHERE p.id = ?`,
        [id]
    );

    return filas[0] || null;
}


async function existe(id) {
    const [filas] = await db.query('SELECT id FROM productos WHERE id = ?', [id]);
    return filas.length > 0;
}


async function buscarPorId(id) {
    const [filas] = await db.query(
        'SELECT id, nombre, precio, stock, activo FROM productos WHERE id = ?', [id]
    );

    return filas[0] || null;
}


async function listarParaElegir() {
    const [filas] = await db.query(
        `SELECT p.id, p.nombre, p.precio, p.stock, c.nombre AS categoria
           FROM productos p
           JOIN categorias c ON c.id = p.categoria_id
          ORDER BY c.nombre, p.nombre`
    );

    return filas;
}


async function sumarStock(id, cantidad) {
    const [r] = await db.query(
        'UPDATE productos SET stock = stock + ? WHERE id = ?', [cantidad, id]
    );

    return r.affectedRows;
}


async function ajustarStock(id, stock) {
    const [r] = await db.query(
        'UPDATE productos SET stock = ? WHERE id = ?', [stock, id]
    );

    return r.affectedRows;
}


async function contarPorCategoria(categoriaId) {
    const [filas] = await db.query(
        'SELECT COUNT(*) AS total FROM productos WHERE categoria_id = ?', [categoriaId]
    );

    return filas[0].total;
}


async function crear(datos) {
    const [r] = await db.query(
        `INSERT INTO productos
            (categoria_id, nombre, slug, descripcion, precio, stock, imagen,
             cantidad_minima, dias_produccion, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [datos.categoriaId, datos.nombre, datos.slug, datos.descripcion, datos.precio,
         datos.stock || 0, datos.imagen, datos.cantidadMinima, datos.diasProduccion,
         datos.activo]
    );

    return r.insertId;
}


async function actualizar(id, datos) {
    const [r] = await db.query(
        `UPDATE productos
            SET categoria_id = ?, nombre = ?, slug = ?, descripcion = ?, precio = ?,
                stock = COALESCE(?, stock),
                imagen = ?, cantidad_minima = ?, dias_produccion = ?, activo = ?
          WHERE id = ?`,
        [datos.categoriaId, datos.nombre, datos.slug, datos.descripcion, datos.precio,
         datos.stock, datos.imagen, datos.cantidadMinima, datos.diasProduccion,
         datos.activo, id]
    );

    return r.affectedRows;
}

async function cambiarActivo(id, activo) {
    const [r] = await db.query(
        'UPDATE productos SET activo = ? WHERE id = ?', [activo, id]
    );

    return r.affectedRows;
}


async function borrar(id) {
    const [r] = await db.query('DELETE FROM productos WHERE id = ?', [id]);
    return r.affectedRows;
}


module.exports = {
    listarActivosDeCategoria,
    buscarPorTexto,
    buscarPorSlugActivo,
    buscarActivoPorId,
    listarParaAdmin,
    buscarConCategoria,
    existe,
    buscarPorId,
    listarParaElegir,
    sumarStock,
    ajustarStock,
    contarPorCategoria,
    crear,
    actualizar,
    cambiarActivo,
    borrar,
};
