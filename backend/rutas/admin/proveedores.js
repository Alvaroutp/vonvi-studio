const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../../db');
const { requiereSesion, requiereRol } = require('../../sesion');

const router = express.Router();

// Armar contraseña
function claveTemporal() {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numeros = '23456789';
    let clave = '';
    for (let i = 0; i < 4; i++) clave += letras[crypto.randomInt(letras.length)];
    for (let i = 0; i < 4; i++) clave += numeros[crypto.randomInt(numeros.length)];
    return clave;
}

// Revisa lo que llegó del formulario
function leerProveedor(body) {
    const nombres = (body.nombres || '').trim();
    const apellidos = (body.apellidos || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const telefono = (body.telefono || '').trim();

    if (!nombres) return { error: 'Escribe el nombre del contacto' };
    if (!apellidos) return { error: 'Escribe el nombre de la empresa' };
    if (!email.includes('@')) return { error: 'El correo no es valido' };

    return {nombres, apellidos, email, telefono: telefono || null};
}

// Listar proveedores
router.get('/admin/proveedores', requiereSesion, requiereRol('admin'), async (req, res) => {
    const [filas] = await db.query(
        `SELECT id, nombres, apellidos, email, telefono, creado_en
         FROM usuarios
         WHERE rol = 'proveedor'
         ORDER BY creado_en DESC`
    );

    res.json({ ok: true, proveedores: filas });
});

// Crear un proveedor
router.post('/admin/proveedores', requiereSesion, requiereRol('admin'), async (req, res) => {
    const datos = leerProveedor(req.body);

    if (datos.error) return res.status(400).json({ok: false, mensaje: datos.error});
    

    const clave = claveTemporal();
    const cifrada = await bcrypt.hash(clave, 10);

    try {
        const [r] = await db.query(
            `INSERT INTO usuarios (nombres, apellidos, email, password, telefono, rol)
             VALUES (?, ?, ?, ?, ?, 'proveedor')`,
            [datos.nombres, datos.apellidos, datos.email, cifrada,datos.telefono]
        );

        res.status(201).json({ok: true,id: r.insertId,clave_temporal: clave});
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ok: false, mensaje: 'Ese correo ya esta registrado'
            });
        }

        throw e;
    }
});

// Borrar proveedor
router.delete('/admin/proveedores/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    const id = Number(req.params.id);

    const [filas] = await db.query(
        "SELECT id FROM usuarios WHERE id = ? AND rol = 'proveedor'",
        [id]
    );

    if (filas.length === 0) {
        return res.status(404).json({ok: false, mensaje: 'Ese proveedor no existe'
        });
    }

    await db.query('DELETE FROM usuarios WHERE id = ?', [id]);

    res.json({ ok: true });
});

// Ver las solicitudes de un proveedor
router.get('/admin/proveedores/:id/solicitudes', requiereSesion, requiereRol('admin'), async (req, res) => {
    const id = Number(req.params.id);

    const [filas] = await db.query(
        `SELECT id, descripcion, cantidad, estado, respuesta, creado_en, respondido_en
         FROM solicitudes
         WHERE proveedor_id = ?
         ORDER BY creado_en DESC`,
        [id]
    );

    res.json({ok: true, solicitudes: filas});
});

// Mandar una solicitud
router.post('/admin/solicitudes', requiereSesion, requiereRol('admin'), async (req, res) => {
    const proveedorId = Number(req.body.proveedorId);
    const descripcion = (req.body.descripcion || '').trim();
    const cantidad = Number(req.body.cantidad);

    if (!descripcion) {
        return res.status(400).json({ok: false, mensaje: 'Escribe que necesitas'});
    }

    if (isNaN(cantidad) || cantidad < 1) {
        return res.status(400).json({ok: false, mensaje: 'La cantidad no es valida'});
    }

    const [prov] = await db.query(
        "SELECT id FROM usuarios WHERE id = ? AND rol = 'proveedor'", [proveedorId]
    );

    if (prov.length === 0) {
        return res.status(404).json({ok: false, mensaje: 'Ese proveedor no existe'});
    }

    const [r] = await db.query(
        'INSERT INTO solicitudes (proveedor_id, descripcion, cantidad) VALUES (?, ?, ?)',
        [proveedorId, descripcion, cantidad]
    );

    res.status(201).json({ok: true, id: r.insertId});
});

module.exports = router;
