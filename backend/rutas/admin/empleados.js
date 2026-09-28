const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { requiereSesion, requiereRol } = require('../../sesion');
const usuarioDAO = require('../../dao/usuarioDAO');

const router = express.Router();

function claveTemporal() {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numeros = '23456789';
    let clave = '';
    for (let i = 0; i < 4; i++) clave += letras[crypto.randomInt(letras.length)];
    for (let i = 0; i < 4; i++) clave += numeros[crypto.randomInt(numeros.length)];
    return clave;
}

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


router.get('/admin/empleados', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const empleados = await usuarioDAO.listarEmpleados();
        res.json({ ok: true, empleados });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo listar los empleados' });
    }
});


router.post('/admin/empleados', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const datos = leerEmpleado(req.body);
        if (datos.error) return res.status(400).json({ ok: false, mensaje: datos.error });

        const clave = claveTemporal();
        const cifrada = await bcrypt.hash(clave, 10);

        const id = await usuarioDAO.crearEmpleado(datos, cifrada);

        res.status(201).json({ ok: true, id: id, clave_temporal: clave });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ ok: false, mensaje: 'Ese correo ya esta registrado' });
        }
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear el empleado' });
    }
});


router.delete('/admin/empleados/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (id === req.usuario.id) {
            return res.status(400).json({ ok: false, mensaje: 'No puedes borrar tu propia cuenta' });
        }

        if (!await usuarioDAO.existeEmpleado(id)) {
            return res.status(404).json({ ok: false, mensaje: 'Ese empleado no existe' });
        }

        await usuarioDAO.borrarEmpleado(id);
        res.json({ ok: true });

    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({
                ok: false, mensaje: 'No se puede borrar, tiene registros asociados'
            });
        }
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo borrar el empleado' });
    }
});


module.exports = router;
