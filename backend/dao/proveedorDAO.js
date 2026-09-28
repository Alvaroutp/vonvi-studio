const db = require('../db');


async function listar() {
    const [filas] = await db.query(
        `SELECT p.id, p.razon_social, p.ruc, p.direccion, p.telefono, p.email, p.creado_en,
                (SELECT COUNT(*) FROM usuarios u
                  WHERE u.proveedor_id = p.id) AS encargados,
                (SELECT COUNT(*) FROM ordenes_compra o
                  WHERE o.proveedor_id = p.id) AS ordenes
           FROM proveedores p
          ORDER BY p.creado_en DESC`
    );

    return filas;
}


async function buscarPorId(id) {
    const [filas] = await db.query('SELECT * FROM proveedores WHERE id = ?', [id]);
    return filas[0] || null;
}


async function existe(id) {
    const [filas] = await db.query('SELECT id FROM proveedores WHERE id = ?', [id]);
    return filas.length > 0;
}


async function crear(datos) {
    const [r] = await db.query(
        `INSERT INTO proveedores (razon_social, ruc, direccion, telefono, email)
         VALUES (?, ?, ?, ?, ?)`,
        [datos.razon_social, datos.ruc, datos.direccion, datos.telefono, datos.email]
    );

    return r.insertId;
}

async function actualizar(id, datos) {
    const [r] = await db.query(
        `UPDATE proveedores
            SET razon_social = ?, ruc = ?, direccion = ?, telefono = ?, email = ?
          WHERE id = ?`,
        [datos.razon_social, datos.ruc, datos.direccion, datos.telefono, datos.email, id]
    );

    return r.affectedRows;
}


async function borrar(id) {
    const [r] = await db.query('DELETE FROM proveedores WHERE id = ?', [id]);
    return r.affectedRows;
}


module.exports = { 
    listar, 
    buscarPorId, 
    existe, 
    crear, 
    actualizar, 
    borrar };
