const express = require('express');
const { requiereSesion, requiereRol } = require('../../sesion');
const metricaServicio = require('../../servicios/metricaServicio');
const router = express.Router();

router.get('/admin/metricas', requiereSesion, requiereRol('admin', 'empleado'),
async (req, res) => {
    try {
    const rango = { desde: req.query.desde, hasta: req.query.hasta };

    res.json({ ok: true, metricas: await metricaServicio.tablero(rango) });
    } catch (error) {
    console.error('No se pudieron cargar las métricas:', error.message);
    res.status(500).json({ ok: false, mensaje: 'No se pudieron cargar las métricas' });
    }
});

module.exports = router;
