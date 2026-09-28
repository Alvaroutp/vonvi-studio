const express = require('express');
const db = require('../db');
const { requiereSesion, requiereRol } = require('../sesion');
const router = express.Router();

// Listar órdenes del proveedor
router.get('/proveedor/ordenes', requiereSesion, requiereRol('proveedor'), async (req, res) => {
    try {
        const proveedorId = req.usuario.proveedor_id;
        if (!proveedorId) return res.status(403).json({ ok: false, mensaje: 'No estás asociado a un proveedor' });

        const [ordenes] = await db.query('SELECT * FROM ordenes_compra WHERE proveedor_id = ? ORDER BY creado_en DESC', [proveedorId]);
        for (const ord of ordenes) {
            const [items] = await db.query('SELECT * FROM orden_items WHERE orden_id = ?', [ord.id]);
            ord.items = items;
        }
        res.json({ ok: true, ordenes });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo listar las órdenes' });
    }
});

// Responder una orden (aceptar o rechazar) - proveedor
router.put('/proveedor/ordenes/:id/responder', requiereSesion, requiereRol('proveedor'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const accion = (req.body.accion || '').trim(); // 'aceptar' o 'rechazar'
        const respuesta = (req.body.respuesta || '').trim() || null;

        if (!['aceptar', 'rechazar'].includes(accion)) {
            return res.status(400).json({ ok: false, mensaje: 'Acción inválida' });
        }

        const proveedorId = req.usuario.proveedor_id;
        if (!proveedorId) return res.status(403).json({ ok: false, mensaje: 'No estás asociado a un proveedor' });

        const nuevoEstado = accion === 'aceptar' ? 'aceptada' : 'rechazada';
        if (nuevoEstado === 'rechazada' && !respuesta) return res.status(400).json({ ok: false, mensaje: 'Escribe el motivo del rechazo' });

        const [r] = await db.query(
            `UPDATE ordenes_compra SET estado = ?, respuesta = ?, respondido_en = NOW() WHERE id = ? AND proveedor_id = ? AND estado = 'enviada'`,
            [nuevoEstado, respuesta, id, proveedorId]
        );

        if (r.affectedRows === 0) return res.status(404).json({ ok: false, mensaje: 'Orden no existe, no es tuya o ya fue respondida' });

        res.json({ ok: true });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo responder la orden' });
    }
});

module.exports = router;