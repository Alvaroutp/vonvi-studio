const db = require('../db');


async function pedidos() {
    const [filas] = await db.query(
        `SELECT p.codigo,
                DATE_FORMAT(p.creado_en, '%Y-%m-%d') AS fecha,
                YEAR(p.creado_en)  AS anio,
                MONTH(p.creado_en) AS mes,
                p.nombre_contacto, p.email_contacto, p.distrito,
                p.tipo_entrega, p.metodo_pago, p.estado,
                p.subtotal, p.envio, p.total,
                (SELECT SUM(cantidad) FROM pedido_items WHERE pedido_id = p.id) AS unidades
           FROM pedidos p
          ORDER BY p.creado_en`
    );

    return filas;
}


async function cotizaciones() {
    const [filas] = await db.query(
        `SELECT DATE_FORMAT(creado_en, '%Y-%m-%d') AS fecha,
                YEAR(creado_en)  AS anio,
                MONTH(creado_en) AS mes,
                nombre, email, telefono,
                IFNULL(producto_interes, '') AS producto,
                estado
           FROM cotizaciones
          ORDER BY creado_en`
    );

    return filas;
}


async function productos() {
    const [filas] = await db.query(
        `SELECT pr.nombre              AS nombre_producto,
                c.nombre               AS nombre_categoria,
                IFNULL(SUM(i.cantidad), 0)            AS unidades,
                IFNULL(SUM(i.subtotal), 0)            AS ingresos,
                COUNT(DISTINCT i.pedido_id)           AS pedidos
           FROM productos pr
           JOIN categorias c   ON c.id = pr.categoria_id
           LEFT JOIN pedido_items i ON i.producto_id = pr.id
          GROUP BY pr.id, pr.nombre, c.nombre

          UNION ALL

         SELECT i.nombre_producto, i.nombre_categoria,
                SUM(i.cantidad), SUM(i.subtotal), COUNT(DISTINCT i.pedido_id)
           FROM pedido_items i
          WHERE i.producto_id IS NULL
          GROUP BY i.nombre_producto, i.nombre_categoria

          ORDER BY ingresos DESC, unidades DESC, nombre_producto`
    );

    return filas;
}


module.exports = {
    pedidos,
    cotizaciones,
    productos,
};
