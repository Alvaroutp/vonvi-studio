const express = require('express');
const bcrypt = require('bcryptjs');  
const crypto = require('crypto');     
const db = require('../db');
const { requiereSesion } = require('../sesion');

const router = express.Router();

router.post('/auth/registro', async (req, res) => {
    try {
        const nombres   = (req.body.nombres   || '').trim();
        const apellidos = (req.body.apellidos || '').trim();
        const email     = (req.body.email     || '').trim().toLowerCase();
        const telefono  = (req.body.telefono  || '').trim();
        const password  =  req.body.password  || '';

        const errores = [];

        if (nombres.length   < 2) errores.push({ campo: 'nombres',   mensaje: 'Escribe tu nombre' });
        if (apellidos.length < 2) errores.push({ campo: 'apellidos', mensaje: 'Escribe tus apellidos' });
        if (!email.includes('@')) errores.push({ campo: 'email',     mensaje: 'Correo no válido' });
        if (password.length  < 8) errores.push({ campo: 'password',  mensaje: 'Mínimo 8 caracteres' });

        if (errores.length > 0) {
            return res.status(400).json({ ok: false, mensaje: 'Revisa los datos', detalles: errores });
        }

        const [repetidos] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (repetidos.length > 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Ese correo ya tiene una cuenta',
                detalles: [{ campo: 'email', mensaje: 'Ya está registrado' }]
            });
        }

        const passwordCifrada = await bcrypt.hash(password, 10);

        const [resultado] = await db.query(
            'INSERT INTO usuarios (nombres, apellidos, email, password, telefono) VALUES (?, ?, ?, ?, ?)',
            [nombres, apellidos, email, passwordCifrada, telefono || null]
        );

        const idNuevo = resultado.insertId;

        const token = crypto.randomBytes(24).toString('hex');
        await db.query('UPDATE usuarios SET token = ? WHERE id = ?', [token, idNuevo]);

        res.status(201).json({
            ok: true,
            token: token,
            usuario: { id: idNuevo, nombres, apellidos, email, telefono, rol: 'cliente' }
        });

    } catch (error) {
        console.error('Error en registro:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear la cuenta' });
    }
});

router.post('/auth/login', async (req, res) => {
    try {
        const email    = (req.body.email || '').trim().toLowerCase();
        const password =  req.body.password || '';

        if (!email || !password) {
            return res.status(400).json({ ok: false, mensaje: 'Escribe tu correo y tu contraseña' });
        }

        const [usuarios] = await db.query(
            'SELECT id, nombres, apellidos, email, password, telefono, rol FROM usuarios WHERE email = ?',
            [email]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({ ok: false, mensaje: 'Correo o contraseña incorrectos' });
        }

        const usuario = usuarios[0];

        const coincide = await bcrypt.compare(password, usuario.password);

        if (!coincide) {
            return res.status(401).json({ ok: false, mensaje: 'Correo o contraseña incorrectos' });
        }

        const token = crypto.randomBytes(24).toString('hex');
        await db.query('UPDATE usuarios SET token = ? WHERE id = ?', [token, usuario.id]);

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
        const nombres   = (req.body.nombres   || '').trim();
        const apellidos = (req.body.apellidos || '').trim();
        const telefono  = (req.body.telefono  || '').trim();

        if (nombres.length < 2 || apellidos.length < 2) {
            return res.status(400).json({ ok: false, mensaje: 'Nombre y apellidos son obligatorios' });
        }

        await db.query(
            'UPDATE usuarios SET nombres = ?, apellidos = ?, telefono = ? WHERE id = ?',
            [nombres, apellidos, telefono || null, req.usuario.id]
        );

        res.json({ ok: true, usuario: { ...req.usuario, nombres, apellidos, telefono } });

    } catch (error) {
        console.error('Error actualizando el perfil:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo guardar' });
    }
});


router.put('/auth/password', requiereSesion, async (req, res) => {
    try {
        const actual = req.body.passwordActual || '';
        const nueva  = req.body.passwordNueva  || '';

        if (nueva.length < 8) {
            return res.status(400).json({ ok: false, mensaje: 'La nueva debe tener mínimo 8 caracteres' });
        }

        const [filas] = await db.query('SELECT password FROM usuarios WHERE id = ?', [req.usuario.id]);

        const coincide = await bcrypt.compare(actual, filas[0].password);
        if (!coincide) {
            return res.status(400).json({ ok: false, mensaje: 'La contraseña actual no es correcta' });
        }

        const cifrada = await bcrypt.hash(nueva, 10);
        await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [cifrada, req.usuario.id]);

        res.json({ ok: true, mensaje: 'Contraseña actualizada' });

    } catch (error) {
        console.error('Error cambiando la contraseña:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo cambiar la contraseña' });
    }
});


module.exports = router;