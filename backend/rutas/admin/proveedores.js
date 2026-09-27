const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../../db');
const { requiereSesion, requiereRol } = require('../../sesion');

const router = express.Router();

function claveTemporal() {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numeros = '23456789';
    let clave = '';
    for (let i = 0; i < 4; i++) clave += letras[crypto.randomInt(letras.length)];
    for (let i = 0; i < 4; i++) clave += numeros[crypto.randomInt(numeros.length)];
    return clave;
}

function validarRUC(ruc) {
    return typeof ruc === 'string' && /^[0-9]{11}$/.test(ruc);
}

// Listar proveedores con conteo de encargados y ordenes
router.get('/admin/proveedores', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const [filas] = await db.query(
            `SELECT p.id, p.razon_social, p.ruc, p.direccion, p.telefono, p.email, p.creado_en,
                    (SELECT COUNT(*) FROM usuarios u WHERE u.proveedor_id = p.id) AS encargados,
                    (SELECT COUNT(*) FROM ordenes_compra o WHERE o.proveedor_id = p.id) AS ordenes
             FROM proveedores p
             ORDER BY p.creado_en DESC`
        );

        res.json({ ok: true, proveedores: filas });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo listar proveedores' });
    }
});

// Crear proveedor
router.post('/admin/proveedores', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const razon_social = (req.body.razon_social || '').trim();
        const ruc = (req.body.ruc || '').trim();
        const direccion = (req.body.direccion || '').trim() || null;
        const telefono = (req.body.telefono || '').trim() || null;
        const email = (req.body.email || '').trim().toLowerCase() || null;

        if (!razon_social) return res.status(400).json({ ok: false, mensaje: 'Escribe la razón social' });
        if (!validarRUC(ruc)) return res.status(400).json({ ok: false, mensaje: 'RUC debe tener 11 dígitos' });

        const [r] = await db.query(
            'INSERT INTO proveedores (razon_social, ruc, direccion, telefono, email) VALUES (?, ?, ?, ?, ?)',
            [razon_social, ruc, direccion, telefono, email]
        );

        res.status(201).json({ ok: true, id: r.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ ok: false, mensaje: 'Ese RUC ya está registrado' });
        }
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear el proveedor' });
    }
});

// Obtener un proveedor
router.get('/admin/proveedores/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const [filas] = await db.query('SELECT * FROM proveedores WHERE id = ?', [id]);
        if (filas.length === 0) return res.status(404).json({ ok: false, mensaje: 'Proveedor no encontrado' });
        res.json({ ok: true, proveedor: filas[0] });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo obtener el proveedor' });
    }
});

// Actualizar proveedor
router.put('/admin/proveedores/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const razon_social = (req.body.razon_social || '').trim();
        const ruc = (req.body.ruc || '').trim();
        const direccion = (req.body.direccion || '').trim() || null;
        const telefono = (req.body.telefono || '').trim() || null;
        const email = (req.body.email || '').trim().toLowerCase() || null;

        if (!razon_social) return res.status(400).json({ ok: false, mensaje: 'Escribe la razón social' });
        if (!validarRUC(ruc)) return res.status(400).json({ ok: false, mensaje: 'RUC debe tener 11 dígitos' });

        await db.query('UPDATE proveedores SET razon_social = ?, ruc = ?, direccion = ?, telefono = ?, email = ? WHERE id = ?',
            [razon_social, ruc, direccion, telefono, email, id]);

        res.json({ ok: true });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ ok: false, mensaje: 'Ese RUC ya está registrado' });
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo actualizar el proveedor' });
    }
});

// Borrar proveedor (no permitir si tiene ordenes)
router.delete('/admin/proveedores/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const [prov] = await db.query('SELECT id FROM proveedores WHERE id = ?', [id]);
        if (prov.length === 0) return res.status(404).json({ ok: false, mensaje: 'Ese proveedor no existe' });

        const [ordenes] = await db.query('SELECT COUNT(*) AS c FROM ordenes_compra WHERE proveedor_id = ?', [id]);
        if (ordenes[0].c > 0) return res.status(400).json({ ok: false, mensaje: 'No se puede borrar un proveedor con órdenes' });

        await db.query('DELETE FROM proveedores WHERE id = ?', [id]);
        res.json({ ok: true });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo borrar el proveedor' });
    }
});

// Encargados: crear
router.post('/admin/proveedores/:id/encargados', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const proveedorId = Number(req.params.id);
        const nombres = (req.body.nombres || '').trim();
        const apellidos = (req.body.apellidos || '').trim();
        const email = (req.body.email || '').trim().toLowerCase();
        const telefono = (req.body.telefono || '').trim() || null;

        if (!nombres || !apellidos) return res.status(400).json({ ok: false, mensaje: 'Nombres y apellidos obligatorios' });
        if (!email.includes('@')) return res.status(400).json({ ok: false, mensaje: 'Correo no válido' });

        const clave = claveTemporal();
        const cifrada = await bcrypt.hash(clave, 10);

        const [prov] = await db.query('SELECT id FROM proveedores WHERE id = ?', [proveedorId]);
        if (prov.length === 0) return res.status(404).json({ ok: false, mensaje: 'Proveedor no existe' });

        const [r] = await db.query(
            'INSERT INTO usuarios (nombres, apellidos, email, password, telefono, rol, proveedor_id) VALUES (?, ?, ?, ?, ?, "proveedor", ?)',
            [nombres, apellidos, email, cifrada, telefono, proveedorId]
        );

        res.status(201).json({ ok: true, id: r.insertId, clave_temporal: clave });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ ok: false, mensaje: 'Ese correo ya está registrado' });
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear el encargado' });
    }
});

// Actualizar encargado
router.put('/admin/encargados/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const nombres = (req.body.nombres || '').trim();
        const apellidos = (req.body.apellidos || '').trim();
        const telefono = (req.body.telefono || '').trim() || null;

        if (!nombres || !apellidos) return res.status(400).json({ ok: false, mensaje: 'Nombres y apellidos obligatorios' });

        const [u] = await db.query('SELECT id FROM usuarios WHERE id = ? AND rol = "proveedor"', [id]);
        if (u.length === 0) return res.status(404).json({ ok: false, mensaje: 'Encargado no existe' });

        await db.query('UPDATE usuarios SET nombres = ?, apellidos = ?, telefono = ? WHERE id = ?', [nombres, apellidos, telefono, id]);
        res.json({ ok: true });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo actualizar el encargado' });
    }
});

// Generar/actualizar clave temporal para encargado
router.put('/admin/encargados/:id/clave', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const [u] = await db.query('SELECT id FROM usuarios WHERE id = ? AND rol = "proveedor"', [id]);
        if (u.length === 0) return res.status(404).json({ ok: false, mensaje: 'Encargado no existe' });

        const clave = claveTemporal();
        const cifrada = await bcrypt.hash(clave, 10);
        await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [cifrada, id]);

        res.json({ ok: true, clave_temporal: clave });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo generar la clave' });
    }
});

module.exports = router;

// Compatibilidad: endpoints antiguos de "solicitudes" para frontend
// Estas rutas no requieren la tabla `solicitudes` y devuelven respuestas seguras.
router.get('/admin/proveedores/:id/solicitudes', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const [prov] = await db.query('SELECT id FROM proveedores WHERE id = ?', [id]);
        if (prov.length === 0) return res.status(404).json({ ok: false, mensaje: 'Proveedor no existe' });
        // Devolver lista vacía para no romper el frontend antiguo
        res.json({ ok: true, solicitudes: [] });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo obtener las solicitudes' });
    }
});

router.post('/admin/solicitudes', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const proveedorId = Number(req.body.proveedorId);
        const descripcion = (req.body.descripcion || '').trim();
        const cantidad = Number(req.body.cantidad);

        if (!descripcion) return res.status(400).json({ ok: false, mensaje: 'Escribe que necesitas' });
        if (isNaN(cantidad) || cantidad < 1) return res.status(400).json({ ok: false, mensaje: 'La cantidad no es valida' });

        const [prov] = await db.query('SELECT id FROM proveedores WHERE id = ?', [proveedorId]);
        if (prov.length === 0) return res.status(404).json({ ok: false, mensaje: 'Ese proveedor no existe' });

        // No existe la tabla `solicitudes` (compatibilidad): simulamos creación y devolvemos id temporal
        const fakeId = Date.now();
        res.status(201).json({ ok: true, id: fakeId });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear la solicitud' });
    }
});
