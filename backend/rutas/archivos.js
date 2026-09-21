const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { requiereSesion, requiereRol } = require('../sesion');

const router = express.Router();

// Donde se guarda y con que nombre
const almacen = multer.diskStorage({
    destination: path.join(__dirname, '..', '..', 'frontend', 'img'),
    filename: (req, archivo, listo) => {
        const extension = path.extname(archivo.originalname).toLowerCase();
        listo(null, crypto.randomBytes(8).toString('hex') + extension);
    },
});

const subir = multer({
    storage: almacen,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, archivo, listo) => {
        listo(null, ['image/jpeg', 'image/png', 'image/webp'].includes(archivo.mimetype));
    },
});

// POST /admin/imagenes — recibe una imagen y devuelve su ruta
router.post('/admin/imagenes', requiereSesion, requiereRol('admin'),
    subir.single('imagen'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                ok: false, mensaje: 'Sube una imagen JPG, PNG o WEBP de menos de 2 MB'
            });
        }
        res.status(201).json({ ok: true, ruta: 'img/' + req.file.filename });
    });

module.exports = router;