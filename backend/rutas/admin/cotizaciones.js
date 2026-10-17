const express = require('express');
const { requiereSesion, requiereRol } = require('../../sesion');
const cotizacionServicio = require('../../servicios/cotizacionServicio');
const router = express.Router();

const SOLO_PANEL = [requiereSesion, requiereRol('admin', 'empleado')];

function fallo(res, error, mensaje) {
    if (error.codigo) {
    return res.status(error.codigo).json({ ok: false, mensaje: error.message });
    }
    console.error(mensaje + ':', error.message);
    res.status(500).json({ ok: false, mensaje });
}

router.get('/admin/cotizaciones', SOLO_PANEL, async (req, res) => {
    try {
    res.json({ ok: true, ...(await cotizacionServicio.listar()) });
    } catch (error) {
    fallo(res, error, 'No se pudieron cargar las cotizaciones');
    }
});

router.patch('/admin/cotizaciones/:id', SOLO_PANEL, async (req, res) => {
    try {
    const cotizacion = await cotizacionServicio.cambiarEstado(
        Number(req.params.id), req.body.estado
    );
    res.json({ ok: true, cotizacion });
    } catch (error) {
    fallo(res, error, 'No se pudo actualizar la cotización');
    }
});

module.exports = router;
