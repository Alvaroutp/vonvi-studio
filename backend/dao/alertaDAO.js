const db = require('../db');


async function stockBajo(multiplo) {
    const [filas] = await db.query(
        `SELECT p.id, p.nombre, p.slug, p.stock, p.cantidad_minima,
                p.categoria_id, c.nombre AS categoria
           FROM productos p
           JOIN categorias c ON c.id = p.categoria_id
          WHERE p.activo = 1
            AND p.stock < p.cantidad_minima * ?
          ORDER BY p.stock, p.nombre`,
        [multiplo]
    );

    return filas;
}


module.exports = {
    stockBajo,
};
