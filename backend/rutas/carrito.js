const express = require('express');

const carritoServicio = require('../servicios/carritoServicio');
const usuarioDAO = require('../dao/usuarioDAO');

const router = express.Router();

async function sesionOpcional(req, res, next) {
    try {
        const token = (req.headers.authorization || '').split(' ')[1];
        if (token) req.usuario = await usuarioDAO.buscarPorToken(token);
        next();

    } catch (error) {
        console.error('Error leyendo la sesión del carrito:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo leer la sesión' });
    }
}

router.use(sesionOpcional);


function quienEs(req) {
    return {
        usuarioId: req.usuario ? req.usuario.id : null,
        token: (req.headers['x-carrito-token'] || '').trim() || null,
    };
}

function fallo(res, error, mensaje) {
    if (error.codigo) {
        return res.status(error.codigo).json({ ok: false, mensaje: error.message });
    }

    console.error(mensaje + ':', error.message);
    res.status(500).json({ ok: false, mensaje });
}


router.get('/carrito', async (req, res) => {
    const { usuarioId, token } = quienEs(req);

    try {
        res.json({ ok: true, carrito: await carritoServicio.ver(usuarioId, token) });

    } catch (error) {
        fallo(res, error, 'No se pudo cargar el carrito');
    }
});


router.post('/carrito/items', async (req, res) => {
    const { usuarioId, token } = quienEs(req);

    try {
        const carrito = await carritoServicio.agregar(usuarioId, token, req.body);
        res.status(201).json({ ok: true, carrito });

    } catch (error) {
        fallo(res, error, 'No se pudo agregar al carrito');
    }
});


router.put('/carrito/items/:id', async (req, res) => {
    const { usuarioId, token } = quienEs(req);

    try {
        const carrito = await carritoServicio.cambiarCantidad(
            usuarioId, token, Number(req.params.id), Number(req.body.cantidad)
        );
        res.json({ ok: true, carrito });

    } catch (error) {
        fallo(res, error, 'No se pudo cambiar la cantidad');
    }
});


router.delete('/carrito/items/:id', async (req, res) => {
    const { usuarioId, token } = quienEs(req);

    try {
        const carrito = await carritoServicio.quitar(usuarioId, token, Number(req.params.id));
        res.json({ ok: true, carrito });

    } catch (error) {
        fallo(res, error, 'No se pudo quitar el producto');
    }
});


router.delete('/carrito', async (req, res) => {
    const { usuarioId, token } = quienEs(req);

    try {
        res.json({ ok: true, carrito: await carritoServicio.vaciar(usuarioId, token) });

    } catch (error) {
        fallo(res, error, 'No se pudo vaciar el carrito');
    }
});

router.post('/carrito/fusionar', async (req, res) => {
    const { usuarioId, token } = quienEs(req);

    try {
        res.json({ ok: true, carrito: await carritoServicio.fusionar(usuarioId, token) });

    } catch (error) {
        fallo(res, error, 'No se pudo recuperar tu carrito');
    }
});


module.exports = router;
