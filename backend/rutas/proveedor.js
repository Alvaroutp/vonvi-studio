const express = require('express');
const db = require('../db');
const { requiereSesion, requiereRol } = require('../sesion');
const router = express.Router();

// GET /proveedor/solicitudes — que el proveedor vea las solicitudes que le llegaron
router.get('/proveedor/solicitudes', requiereSesion, requiereRol('proveedor'), async (req, res) => {
    const [filas] = await db.query(
        `SELECT id, descripcion, cantidad, estado, respuesta, creado_en, respondido_en
         FROM solicitudes
         WHERE proveedor_id = ?
         ORDER BY creado_en DESC`,
        [req.usuario.id]
    );
    res.json({ ok: true, solicitudes: filas });
});

// PUT /proveedor/solicitudes/:id/responder — que la acepte o la rechace
router.put('/proveedor/solicitudes/:id/responder', requiereSesion, requiereRol('proveedor'), async (req, res) => {
    const id = Number(req.params.id);
    const estado = (req.body.estado || '').trim();
    const respuesta = (req.body.respuesta || '').trim();

    if (estado !== 'aceptada' && estado !== 'rechazada') {
        return res.status(400).json({ ok: false, mensaje: 'Solo puedes aceptar o rechazar' });
    }
    if (estado === 'rechazada' && !respuesta) {
        return res.status(400).json({ ok: false, mensaje: 'Escribe el motivo del rechazo' });
    }

    const [r] = await db.query(
        `UPDATE solicitudes
         SET estado = ?, respuesta = ?, respondido_en = NOW()
         WHERE id = ? AND proveedor_id = ? AND estado = 'enviada'`,
        [estado, respuesta || null, id, req.usuario.id]
    );

    if (r.affectedRows === 0) {
        return res.status(404).json({
            ok: false,
            mensaje: 'Esa solicitud no existe, no es tuya o ya fue respondida'
        });
    }

    res.json({ ok: true });
});

module.exports = router;