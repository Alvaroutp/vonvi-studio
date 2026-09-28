const db = require('../db');

async function listarActivas() {
    const [filas] = await db.query(
        `SELECT c.id, c.nombre, c.slug, c.descripcion, c.imagen, c.icono,
                COUNT(p.id)   AS total_productos,
                MIN(p.precio) AS precio_desde
           FROM categorias c
           LEFT JOIN productos p
                  ON p.categoria_id = c.id AND p.activo = 1
          WHERE c.activo = 1
          GROUP BY c.id, c.nombre, c.slug, c.descripcion, c.imagen, c.icono
          ORDER BY c.id`
    );

    return filas;
}

async function listarTodas() {
    const [filas] = await db.query(
        `SELECT c.id, c.nombre, c.slug, c.descripcion, c.imagen, c.icono, c.activo,
                COUNT(p.id) AS total_productos
           FROM categorias c
           LEFT JOIN productos p ON p.categoria_id = c.id
          GROUP BY c.id, c.nombre, c.slug, c.descripcion, c.imagen, c.icono, c.activo
          ORDER BY c.id`
    );

    return filas;
}


async function buscarPorSlugActiva(slug) {
    const [filas] = await db.query(
        `SELECT id, nombre, slug, descripcion, imagen, icono
           FROM categorias
          WHERE slug = ? AND activo = 1`,
        [slug]
    );

    return filas[0] || null;
}


async function existe(id) {
    const [filas] = await db.query('SELECT id FROM categorias WHERE id = ?', [id]);
    return filas.length > 0;
}


async function crear(datos) {
    const [r] = await db.query(
        `INSERT INTO categorias (nombre, slug, descripcion, imagen, icono)
         VALUES (?, ?, ?, ?, ?)`,
        [datos.nombre, datos.slug, datos.descripcion, datos.imagen, datos.icono]
    );

    return r.insertId;
}


async function actualizar(id, datos) {
    const [r] = await db.query(
        `UPDATE categorias
            SET nombre = ?, slug = ?, descripcion = ?, imagen = ?, icono = ?, activo = ?
          WHERE id = ?`,
        [datos.nombre, datos.slug, datos.descripcion, datos.imagen,
         datos.icono, datos.activo, id]
    );

    return r.affectedRows;
}


async function borrar(id) {
    const [r] = await db.query('DELETE FROM categorias WHERE id = ?', [id]);
    return r.affectedRows;
}


module.exports = {
    listarActivas,
    listarTodas,
    buscarPorSlugActiva,
    existe,
    crear,
    actualizar,
    borrar,
};
