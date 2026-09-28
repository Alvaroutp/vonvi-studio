const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { requiereSesion, requiereRol } = require('../../sesion');
const proveedorDAO = require('../../dao/proveedorDAO');
const usuarioDAO = require('../../dao/usuarioDAO');
const ordenDAO = require('../../dao/ordenDAO');

const router = express.Router();

function claveTemporal() {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numeros = '23456789';
    let clave = '';
    for (let i = 0; i < 4; i++) clave += letras[crypto.randomInt(letras.length)];
    for (let i = 0; i < 4; i++) clave += numeros[crypto.randomInt(numeros.length)];
    return clave;
}


function validarRUC(ruc) {
    return typeof ruc === 'string' && /^[0-9]{11}$/.test(ruc);
}


function leerEmpresa(body) {
    return {
        razon_social: (body.razon_social || '').trim(),
        ruc: (body.ruc || '').trim(),
        direccion: (body.direccion || '').trim() || null,
        telefono: (body.telefono || '').trim() || null,
        email: (body.email || '').trim().toLowerCase() || null,
    };
}



router.get('/admin/proveedores', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        res.json({ ok: true, proveedores: await proveedorDAO.listar() });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo listar proveedores' });
    }
});


router.post('/admin/proveedores', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const datos = leerEmpresa(req.body);

        if (!datos.razon_social) {
            return res.status(400).json({ ok: false, mensaje: 'Escribe la razón social' });
        }
        if (!validarRUC(datos.ruc)) {
            return res.status(400).json({ ok: false, mensaje: 'RUC debe tener 11 dígitos' });
        }

        res.status(201).json({ ok: true, id: await proveedorDAO.crear(datos) });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ ok: false, mensaje: 'Ese RUC ya está registrado' });
        }
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear el proveedor' });
    }
});


router.get('/admin/proveedores/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const proveedor = await proveedorDAO.buscarPorId(Number(req.params.id));

        if (!proveedor) {
            return res.status(404).json({ ok: false, mensaje: 'Proveedor no encontrado' });
        }

        res.json({ ok: true, proveedor });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo obtener el proveedor' });
    }
});


router.put('/admin/proveedores/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!await proveedorDAO.existe(id)) {
            return res.status(404).json({ ok: false, mensaje: 'Ese proveedor no existe' });
        }

        const datos = leerEmpresa(req.body);

        if (!datos.razon_social) {
            return res.status(400).json({ ok: false, mensaje: 'Escribe la razón social' });
        }
        if (!validarRUC(datos.ruc)) {
            return res.status(400).json({ ok: false, mensaje: 'RUC debe tener 11 dígitos' });
        }

        await proveedorDAO.actualizar(id, datos);
        res.json({ ok: true });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ ok: false, mensaje: 'Ese RUC ya está registrado' });
        }
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo actualizar el proveedor' });
    }
});


router.delete('/admin/proveedores/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!await proveedorDAO.existe(id)) {
            return res.status(404).json({ ok: false, mensaje: 'Ese proveedor no existe' });
        }

        if (await ordenDAO.contarPorProveedor(id) > 0) {
            return res.status(400).json({
                ok: false, mensaje: 'No se puede borrar un proveedor con órdenes'
            });
        }

        await usuarioDAO.borrarPorProveedor(id);
        await proveedorDAO.borrar(id);

        res.json({ ok: true });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo borrar el proveedor' });
    }
});


router.get('/admin/proveedores/:id/encargados', requiereSesion, requiereRol('admin'),
    async (req, res) => {
        try {
            const encargados = await usuarioDAO.listarEncargados(Number(req.params.id));
            res.json({ ok: true, encargados });

        } catch (error) {
            console.error(error.message);
            res.status(500).json({ ok: false, mensaje: 'No se pudo listar los encargados' });
        }
    });


router.post('/admin/proveedores/:id/encargados', requiereSesion, requiereRol('admin'),
    async (req, res) => {
        try {
            const proveedorId = Number(req.params.id);

            const datos = {
                nombres: (req.body.nombres || '').trim(),
                apellidos: (req.body.apellidos || '').trim(),
                email: (req.body.email || '').trim().toLowerCase(),
                telefono: (req.body.telefono || '').trim() || null,
            };

            if (!datos.nombres || !datos.apellidos) {
                return res.status(400).json({
                    ok: false, mensaje: 'Nombres y apellidos obligatorios'
                });
            }
            if (!datos.email.includes('@')) {
                return res.status(400).json({ ok: false, mensaje: 'Correo no válido' });
            }

            if (!await proveedorDAO.existe(proveedorId)) {
                return res.status(404).json({ ok: false, mensaje: 'Proveedor no existe' });
            }

            const clave = claveTemporal();
            const cifrada = await bcrypt.hash(clave, 10);

            const id = await usuarioDAO.crearEncargado(proveedorId, datos, cifrada);

            res.status(201).json({ ok: true, id: id, clave_temporal: clave });

        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    ok: false, mensaje: 'Ese correo ya está registrado'
                });
            }
            console.error(error.message);
            res.status(500).json({ ok: false, mensaje: 'No se pudo crear el encargado' });
        }
    });


router.put('/admin/encargados/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);

        const datos = {
            nombres: (req.body.nombres || '').trim(),
            apellidos: (req.body.apellidos || '').trim(),
            telefono: (req.body.telefono || '').trim() || null,
        };

        if (!datos.nombres || !datos.apellidos) {
            return res.status(400).json({ ok: false, mensaje: 'Nombres y apellidos obligatorios' });
        }

        if (!await usuarioDAO.existeEncargado(id)) {
            return res.status(404).json({ ok: false, mensaje: 'Encargado no existe' });
        }

        await usuarioDAO.actualizarEncargado(id, datos);
        res.json({ ok: true });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo actualizar el encargado' });
    }
});


router.put('/admin/encargados/:id/clave', requiereSesion, requiereRol('admin'),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (!await usuarioDAO.existeEncargado(id)) {
                return res.status(404).json({ ok: false, mensaje: 'Encargado no existe' });
            }

            const clave = claveTemporal();
            const cifrada = await bcrypt.hash(clave, 10);

            await usuarioDAO.cambiarPassword(id, cifrada);

            res.json({ ok: true, clave_temporal: clave });

        } catch (error) {
            console.error(error.message);
            res.status(500).json({ ok: false, mensaje: 'No se pudo generar la clave' });
        }
    });


module.exports = router;
