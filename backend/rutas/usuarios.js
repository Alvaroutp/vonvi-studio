const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const { requiereSesion } = require('../sesion');
const usuarioDAO = require('../dao/usuarioDAO');

const router = express.Router();

function nuevoToken() {
    return crypto.randomBytes(24).toString('hex');
}


router.post('/auth/registro', async (req, res) => {
    try {
        const datos = {
            nombres: (req.body.nombres || '').trim(),
            apellidos: (req.body.apellidos || '').trim(),
            email: (req.body.email || '').trim().toLowerCase(),
            telefono: (req.body.telefono || '').trim() || null,
        };
        const password = req.body.password || '';

        const errores = [];

        if (datos.nombres.length < 2) {
            errores.push({ campo: 'nombres', mensaje: 'Escribe tu nombre' });
        }
        if (datos.apellidos.length < 2) {
            errores.push({ campo: 'apellidos', mensaje: 'Escribe tus apellidos' });
        }
        if (!datos.email.includes('@')) {
            errores.push({ campo: 'email', mensaje: 'Correo no válido' });
        }
        if (password.length < 8) {
            errores.push({ campo: 'password', mensaje: 'Mínimo 8 caracteres' });
        }

        if (errores.length > 0) {
            return res.status(400).json({
                ok: false, mensaje: 'Revisa los datos', detalles: errores
            });
        }

        if (await usuarioDAO.existeEmail(datos.email)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Ese correo ya tiene una cuenta',
                detalles: [{ campo: 'email', mensaje: 'Ya está registrado' }]
            });
        }

        const cifrada = await bcrypt.hash(password, 10);
        const id = await usuarioDAO.crearCliente(datos, cifrada);

        const token = nuevoToken();
        await usuarioDAO.guardarToken(id, token);

        res.status(201).json({
            ok: true,
            token: token,
            usuario: {
                id: id,
                nombres: datos.nombres,
                apellidos: datos.apellidos,
                email: datos.email,
                telefono: datos.telefono,
                rol: 'cliente'
            }
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ ok: false, mensaje: 'Ese correo ya tiene una cuenta' });
        }
        console.error('Error en registro:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear la cuenta' });
    }
});


router.post('/auth/login', async (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        const password = req.body.password || '';

        if (!email || !password) {
            return res.status(400).json({
                ok: false, mensaje: 'Escribe tu correo y tu contraseña'
            });
        }

        const usuario = await usuarioDAO.buscarPorEmail(email);

        if (!usuario) {
            return res.status(401).json({ ok: false, mensaje: 'Correo o contraseña incorrectos' });
        }

        const coincide = await bcrypt.compare(password, usuario.password);

        if (!coincide) {
            return res.status(401).json({ ok: false, mensaje: 'Correo o contraseña incorrectos' });
        }

        const token = nuevoToken();
        await usuarioDAO.guardarToken(usuario.id, token);

        delete usuario.password;

        res.json({ ok: true, token: token, usuario: usuario });

    } catch (error) {
        console.error('Error en login:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo iniciar sesión' });
    }
});


router.get('/auth/perfil', requiereSesion, (req, res) => {
    res.json({ ok: true, usuario: req.usuario });
});


router.put('/auth/perfil', requiereSesion, async (req, res) => {
    try {
        const datos = {
            nombres: (req.body.nombres || '').trim(),
            apellidos: (req.body.apellidos || '').trim(),
            telefono: (req.body.telefono || '').trim() || null,
        };

        if (datos.nombres.length < 2 || datos.apellidos.length < 2) {
            return res.status(400).json({
                ok: false, mensaje: 'Nombre y apellidos son obligatorios'
            });
        }

        await usuarioDAO.actualizarPerfil(req.usuario.id, datos);

        res.json({ ok: true, usuario: { ...req.usuario, ...datos } });

    } catch (error) {
        console.error('Error actualizando el perfil:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo guardar' });
    }
});


router.put('/auth/password', requiereSesion, async (req, res) => {
    try {
        const actual = req.body.passwordActual || '';
        const nueva = req.body.passwordNueva || '';

        if (nueva.length < 8) {
            return res.status(400).json({
                ok: false, mensaje: 'La nueva debe tener mínimo 8 caracteres'
            });
        }

        const guardada = await usuarioDAO.passwordDe(req.usuario.id);
        const coincide = await bcrypt.compare(actual, guardada);

        if (!coincide) {
            return res.status(400).json({
                ok: false, mensaje: 'La contraseña actual no es correcta'
            });
        }

        const cifrada = await bcrypt.hash(nueva, 10);
        await usuarioDAO.cambiarPasswordPropia(req.usuario.id, cifrada);

        res.json({ ok: true, mensaje: 'Contraseña actualizada' });

    } catch (error) {
        console.error('Error cambiando la contraseña:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo cambiar la contraseña' });
    }
});


module.exports = router;
