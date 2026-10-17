const db = require('../db');

async function resumen() {
  const [filas] = await db.query(
    `SELECT COUNT(*) AS pedidos_total,
    IFNULL(SUM(CASE WHEN estado_pago = 'pagado' AND estado <> 'cancelado' THEN total END), 0) AS ventas_cobradas,
    IFNULL(SUM(CASE WHEN estado_pago = 'pendiente' AND estado <> 'cancelado' THEN total END), 0) AS por_cobrar,
    SUM(CASE WHEN DATE(creado_en) = CURDATE() THEN 1 ELSE 0 END) AS pedidos_hoy
    FROM pedidos`
  );
  return filas[0];
}

async function contarClientes() {
  const [filas] = await db.query(
    "SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'cliente'"
  );
  return filas[0].total;
}

async function cotizacionesNuevas() {
  const [filas] = await db.query(
    "SELECT COUNT(*) AS total FROM cotizaciones WHERE estado = 'nueva'"
  );
  return filas[0].total;
}

async function porEstado() {
  const [filas] = await db.query(
    `SELECT estado, COUNT(*) AS total
    FROM pedidos
    GROUP BY estado`
  );
  return filas;
}

async function topProductos(limite) {
  const [filas] = await db.query(
    `SELECT i.nombre_producto, i.nombre_categoria,
    SUM(i.cantidad) AS unidades,
    SUM(i.subtotal) AS ingresos
    FROM pedido_items i
    JOIN pedidos p ON p.id = i.pedido_id
    WHERE p.estado_pago = 'pagado' AND p.estado <> 'cancelado'
    GROUP BY i.nombre_producto, i.nombre_categoria
    ORDER BY unidades DESC
    LIMIT ?`,
    [limite]
  );
  return filas;
}

module.exports = {
  resumen,
  contarClientes,
  cotizacionesNuevas,
  porEstado,
  topProductos,
};
