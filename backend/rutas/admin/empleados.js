const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../../db');
const { requiereSesion, requiereRol } = require('../../sesion');

const router = express.Router();

//Armar contraseña
function claveTemporal() {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numeros = '23456789';
    let clave = '';
    for (let i = 0; i < 4; i++) clave += letras[crypto.randomInt(letras.length)];
    for (let i = 0; i < 4; i++) clave += numeros[crypto.randomInt(numeros.length)];
    return clave;
}

//Revisa lo que llego del formulario
function leerEmpleado(body) {
    const nombres = (body.nombres || '').trim();
    const apellidos = (body.apellidos || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const telefono = (body.telefono || '').trim();

    if (!nombres) return { error: 'Escribe los nombres' };
    if (!apellidos) return { error: 'Escribe los apellidos' };
    if (!email.includes('@')) return { error: 'El correo no es valido' };

    return { nombres, apellidos, email, telefono: telefono || null };
}

//Listar empleados
router.get('/admin/empleados', requiereSesion, requiereRol('admin'), async (req, res) => {
    const [filas] = await db.query(
        `SELECT id, nombres, apellidos, email, telefono, rol, creado_en
         FROM usuarios
         WHERE rol IN ('empleado')
         ORDER BY creado_en DESC`
    );
    res.json({ ok: true, empleados: filas });
});

//Crear un empleado
router.post('/admin/empleados', requiereSesion, requiereRol('admin'), async (req, res) => {
    const datos = leerEmpleado(req.body);
    if (datos.error) return res.status(400).json({ ok: false, mensaje: datos.error });

    const clave = claveTemporal();
    const cifrada = await bcrypt.hash(clave, 10);

    try {
        const [r] = await db.query(
            `INSERT INTO usuarios (nombres, apellidos, email, password, telefono, rol)
             VALUES (?, ?, ?, ?, ?, 'empleado')`,
            [datos.nombres, datos.apellidos, datos.email, cifrada, datos.telefono]
        );
    
        res.status(201).json({ ok: true, id: r.insertId, clave_temporal: clave });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ ok: false, mensaje: 'Ese correo ya esta registrado' });
        }
        throw e;
    }
});

//Borrar
router.delete('/admin/empleados/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    const id = Number(req.params.id);

    if (id === req.usuario.id) {
        return res.status(400).json({ ok: false, mensaje: 'No puedes borrar tu propia cuenta' });
    }

    const [filas] = await db.query("SELECT id FROM usuarios WHERE id = ? AND rol = 'empleado'", [id]);
    if (filas.length === 0) return res.status(404).json({ ok: false, mensaje: 'Ese empleado no existe' });

    try {
        await db.query('DELETE FROM usuarios WHERE id = ?', [id]);
        res.json({ ok: true });
    } catch (e) {
        if (e.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ ok: false, mensaje: 'No se puede borrar, tiene registros asociados' });
        }
        throw e;
    }
});

module.exports = router;