const db = require('../db');

async function crear(datos) {
  const [r] = await db.query(
    `INSERT INTO cotizaciones
    (usuario_id, nombre, email, telefono, producto_interes,
    mensaje, preferencia_contacto, acepta_promociones)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [datos.usuario_id, datos.nombre, datos.email, datos.telefono,
    datos.producto_interes, datos.mensaje, datos.preferencia_contacto,
    datos.acepta_promociones]
  );
  return r.insertId;
}

async function listar() {
  const [filas] = await db.query(
    `SELECT * FROM cotizaciones
    ORDER BY (estado = 'nueva') DESC, id DESC`
  );
  return filas;
}

async function buscarPorId(id) {
  const [filas] = await db.query('SELECT * FROM cotizaciones WHERE id = ?', [id]);
  return filas[0] || null;
}

async function cambiarEstado(id, estado) {
  const [r] = await db.query(
    'UPDATE cotizaciones SET estado = ? WHERE id = ?', [estado, id]
  );
  return r.affectedRows;
}

async function recientesDe(email) {
  const [filas] = await db.query(
    `SELECT COUNT(*) AS total
    FROM cotizaciones
    WHERE email = ? AND creado_en > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
    [email]
  );
  return filas[0].total;
}

module.exports = {
  crear,
  listar,
  buscarPorId,
  cambiarEstado,
  recientesDe,
};
