const express = require('express');

const { requiereSesion, requiereRol } = require('../sesion');
const ordenDAO = require('../dao/ordenDAO');

const router = express.Router();


router.get('/proveedor/ordenes', requiereSesion, requiereRol('proveedor'), async (req, res) => {
    try {
        const proveedorId = req.usuario.proveedor_id;

        if (!proveedorId) {
            return res.status(403).json({ ok: false, mensaje: 'No estás asociado a un proveedor' });
        }

        const ordenes = await ordenDAO.listarPorProveedor(proveedorId);
        res.json({ ok: true, ordenes });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo listar las órdenes' });
    }
});


router.put('/proveedor/ordenes/:id/responder', requiereSesion, requiereRol('proveedor'),
    async (req, res) => {
        try {
            const id = Number(req.params.id);
            const accion = (req.body.accion || '').trim();
            const respuesta = (req.body.respuesta || '').trim() || null;

            if (!['aceptar', 'rechazar'].includes(accion)) {
                return res.status(400).json({ ok: false, mensaje: 'Acción inválida' });
            }

            const proveedorId = req.usuario.proveedor_id;

            if (!proveedorId) {
                return res.status(403).json({
                    ok: false, mensaje: 'No estás asociado a un proveedor'
                });
            }

            const estado = accion === 'aceptar' ? 'aceptada' : 'rechazada';

            if (estado === 'rechazada' && !respuesta) {
                return res.status(400).json({
                    ok: false, mensaje: 'Escribe el motivo del rechazo'
                });
            }
            
            const cambiadas = await ordenDAO.responder(id, proveedorId, estado, respuesta);

            if (cambiadas === 0) {
                return res.status(404).json({
                    ok: false, mensaje: 'Orden no existe, no es tuya o ya fue respondida'
                });
            }

            res.json({ ok: true });

        } catch (error) {
            console.error(error.message);
            res.status(500).json({ ok: false, mensaje: 'No se pudo responder la orden' });
        }
    });


module.exports = router;
