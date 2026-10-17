const express = require('express');
const cotizacionServicio = require('../servicios/cotizacionServicio');
const usuarioDAO = require('../dao/usuarioDAO');
const router = express.Router();

async function sesionOpcional(req, res, next) {
    try {
    const token = (req.headers.authorization || '').split(' ')[1];
    if (token) req.usuario = await usuarioDAO.buscarPorToken(token);
    next();
    } catch (error) {
    console.error('Error leyendo la sesión:', error.message);
    next();
    }
}

router.post('/cotizaciones', sesionOpcional, async (req, res) => {
    try {
    const r = await cotizacionServicio.registrar(req.usuario, req.body);
    res.status(201).json({ ok: true, cotizacion: r });
    } catch (error) {
    if (error.codigo) {
        return res.status(error.codigo).json({ ok: false, mensaje: error.message });
    }
    console.error('No se pudo registrar la cotización:', error.message);
    res.status(500).json({ ok: false, mensaje: 'No se pudo enviar tu solicitud' });
    } 
});

module.exports = router;
