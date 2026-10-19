const express = require('express');

const { requiereSesion } = require('../sesion');
const seguimientoServicio = require('../servicios/seguimientoServicio');
const reciboServicio = require('../servicios/reciboServicio');

const router = express.Router();

// Esta capa solo habla HTTP. Los permisos van pegados a cada ruta,
// nunca con router.use: este archivo se monta en /api sin prefijo, asi
// que un router.use le pediria sesion a toda la api


function fallo(res, error, mensaje) {
    if (error.codigo) {
        return res.status(error.codigo).json({ ok: false, mensaje: error.message });
    }

    console.error(mensaje + ':', error.message);
    res.status(500).json({ ok: false, mensaje });
}


router.post('/pedidos/:codigo/cancelar', requiereSesion, async (req, res) => {
    try {
        const pedido = await seguimientoServicio.cancelar(req.usuario, req.params.codigo);
        res.json({ ok: true, pedido });
    } catch (error) {
        fallo(res, error, 'No se pudo cancelar el pedido');
    }
});


router.get('/pedidos/:codigo/recibo', requiereSesion, async (req, res) => {
    try {
        const recibo = await reciboServicio.recibo(req.usuario, req.params.codigo);
        res.json({ ok: true, recibo });
    } catch (error) {
        fallo(res, error, 'No se pudo generar el recibo');
    }
});

module.exports = router;