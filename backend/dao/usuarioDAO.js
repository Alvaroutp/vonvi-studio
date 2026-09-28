const db = require('../db');

const CAMPOS = 'id, nombres, apellidos, email, telefono, rol, proveedor_id';

async function buscarPorToken(token) {
    const [filas] = await db.query(
        `SELECT ${CAMPOS} FROM usuarios WHERE token = ?`, [token]
    );

    return filas[0] || null;
}


async function buscarPorEmail(email) {
    const [filas] = await db.query(
        `SELECT ${CAMPOS}, password FROM usuarios WHERE email = ?`, [email]
    );

    return filas[0] || null;
}


async function existeEmail(email) {
    const [filas] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    return filas.length > 0;
}


async function guardarToken(id, token) {
    const [r] = await db.query('UPDATE usuarios SET token = ? WHERE id = ?', [token, id]);
    return r.affectedRows;
}


async function crearCliente(datos, passwordCifrada) {
    const [r] = await db.query(
        `INSERT INTO usuarios (nombres, apellidos, email, password, telefono)
         VALUES (?, ?, ?, ?, ?)`,
        [datos.nombres, datos.apellidos, datos.email, passwordCifrada, datos.telefono]
    );

    return r.insertId;
}


async function actualizarPerfil(id, datos) {
    const [r] = await db.query(
        `UPDATE usuarios
            SET nombres = ?, apellidos = ?, telefono = ?
          WHERE id = ?`,
        [datos.nombres, datos.apellidos, datos.telefono, id]
    );

    return r.affectedRows;
}


async function passwordDe(id) {
    const [filas] = await db.query('SELECT password FROM usuarios WHERE id = ?', [id]);
    return filas[0] ? filas[0].password : null;
}


async function cambiarPasswordPropia(id, passwordCifrada) {
    const [r] = await db.query(
        'UPDATE usuarios SET password = ? WHERE id = ?', [passwordCifrada, id]
    );

    return r.affectedRows;
}


async function listarEmpleados() {
    const [filas] = await db.query(
        `SELECT id, nombres, apellidos, email, telefono, rol, creado_en
           FROM usuarios
          WHERE rol = 'empleado'
          ORDER BY creado_en DESC`
    );

    return filas;
}


async function crearEmpleado(datos, passwordCifrada) {
    const [r] = await db.query(
        `INSERT INTO usuarios (nombres, apellidos, email, password, telefono, rol)
         VALUES (?, ?, ?, ?, ?, 'empleado')`,
        [datos.nombres, datos.apellidos, datos.email, passwordCifrada, datos.telefono]
    );

    return r.insertId;
}


async function existeEmpleado(id) {
    const [filas] = await db.query(
        "SELECT id FROM usuarios WHERE id = ? AND rol = 'empleado'", [id]
    );

    return filas.length > 0;
}


async function borrarEmpleado(id) {
    const [r] = await db.query(
        "DELETE FROM usuarios WHERE id = ? AND rol = 'empleado'", [id]
    );

    return r.affectedRows;
}


// Encargados de proveedores

async function listarEncargados(proveedorId) {
    const [filas] = await db.query(
        `SELECT id, nombres, apellidos, email, telefono, creado_en
           FROM usuarios
          WHERE proveedor_id = ?
          ORDER BY id`,
        [proveedorId]
    );

    return filas;
}


async function crearEncargado(proveedorId, datos, passwordCifrada) {
    const [r] = await db.query(
        `INSERT INTO usuarios (nombres, apellidos, email, password, telefono,
                               rol, proveedor_id)
         VALUES (?, ?, ?, ?, ?, 'proveedor', ?)`,
        [datos.nombres, datos.apellidos, datos.email, passwordCifrada,
         datos.telefono, proveedorId]
    );

    return r.insertId;
}


async function existeEncargado(id) {
    const [filas] = await db.query(
        "SELECT id FROM usuarios WHERE id = ? AND rol = 'proveedor'", [id]
    );

    return filas.length > 0;
}


async function actualizarEncargado(id, datos) {
    const [r] = await db.query(
        `UPDATE usuarios
            SET nombres = ?, apellidos = ?, telefono = ?
          WHERE id = ? AND rol = 'proveedor'`,
        [datos.nombres, datos.apellidos, datos.telefono, id]
    );

    return r.affectedRows;
}


async function cambiarPassword(id, passwordCifrada) {
    const [r] = await db.query(
        'UPDATE usuarios SET password = ?, token = NULL WHERE id = ?',
        [passwordCifrada, id]
    );

    return r.affectedRows;
}


async function borrarPorProveedor(proveedorId) {
    const [r] = await db.query('DELETE FROM usuarios WHERE proveedor_id = ?', [proveedorId]);
    return r.affectedRows;
}


async function contarPorProveedor(proveedorId) {
    const [filas] = await db.query(
        'SELECT COUNT(*) AS total FROM usuarios WHERE proveedor_id = ?', [proveedorId]
    );

    return filas[0].total;
}


module.exports = {
    buscarPorToken,
    buscarPorEmail,
    existeEmail,
    guardarToken,
    crearCliente,
    actualizarPerfil,
    passwordDe,
    cambiarPasswordPropia,
    listarEmpleados,
    crearEmpleado,
    existeEmpleado,
    borrarEmpleado,
    listarEncargados,
    crearEncargado,
    existeEncargado,
    actualizarEncargado,
    cambiarPassword,
    borrarPorProveedor,
    contarPorProveedor,
};
