const express = require('express');
const { requiereSesion, requiereRol } = require('../../sesion');
const metricaServicio = require('../../servicios/metricaServicio');
const reporteServicio = require('../../servicios/reporteServicio');
const alertaServicio = require('../../servicios/alertaServicio');
const router = express.Router();

const EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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

router.get('/admin/reportes/ventas', requiereSesion, requiereRol('admin', 'empleado'),
async (req, res) => {
    try {
    const libro = await reporteServicio.libro();

    res.setHeader('Content-Type', EXCEL);
    res.setHeader('Content-Disposition',
        `attachment; filename="${reporteServicio.nombreArchivo()}"`);

    await libro.xlsx.write(res);
    res.end();
    } catch (error) {
    console.error('No se pudo generar el reporte:', error.message);
    res.status(500).json({ ok: false, mensaje: 'No se pudo generar el reporte' });
    }
});

router.get('/admin/alertas/stock', requiereSesion, requiereRol('admin', 'empleado'),
async (req, res) => {
    try {
    res.json({ ok: true, ...await alertaServicio.stock() });
    } catch (error) {
    console.error('No se pudieron cargar las alertas:', error.message);
    res.status(500).json({ ok: false, mensaje: 'No se pudieron cargar las alertas' });
    }
});

module.exports = router;
