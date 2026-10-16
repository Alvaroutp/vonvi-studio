const express = require('express');

const pedidoServicio = require('../servicios/pedidoServicio');
const { requiereSesion } = require('../sesion');

const router = express.Router();


// Esta capa solo habla HTTP: lee la peticion, llama al servicio y
// responde. Aqui no hay reglas de negocio ni SQL.


// Para comprar hay que tener cuenta: el pedido necesita un dueno.
// Va ruta por ruta y NUNCA con router.use: este archivo se monta en
// /api sin prefijo, asi que un router.use le pediria sesion a toda la
// api, hasta para subir un diseno siendo invitado


function fallo(res, error, mensaje) {
    if (error.codigo) {
        return res.status(error.codigo).json({ ok: false, mensaje: error.message });
    }

    console.error(mensaje + ':', error.message);
    res.status(500).json({ ok: false, mensaje });
}


router.post('/pedidos', requiereSesion, async (req, res) => {
    try {
        const pedido = await pedidoServicio.crear(req.usuario, req.body);
        res.status(201).json({ ok: true, pedido });

    } catch (error) {
        fallo(res, error, 'No se pudo registrar el pedido');
    }
});


router.post('/pedidos/:codigo/pagar', requiereSesion, async (req, res) => {
    try {
        const r = await pedidoServicio.pagar(req.usuario, req.params.codigo, req.body);
        res.json({ ok: true, pedido: r.pedido, pago: r.pago });

    } catch (error) {
        fallo(res, error, 'No se pudo procesar el pago');
    }
});


router.get('/pedidos', requiereSesion, async (req, res) => {
    try {
        res.json({ ok: true, pedidos: await pedidoServicio.mios(req.usuario) });

    } catch (error) {
        fallo(res, error, 'No se pudieron cargar tus pedidos');
    }
});


router.get('/pedidos/:codigo', requiereSesion, async (req, res) => {
    try {
        res.json({ ok: true, pedido: await pedidoServicio.uno(req.usuario, req.params.codigo) });

    } catch (error) {
        fallo(res, error, 'No se pudo cargar el pedido');
    }
});


module.exports = router;
