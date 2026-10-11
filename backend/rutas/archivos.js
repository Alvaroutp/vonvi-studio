const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { requiereSesion, requiereRol } = require('../sesion');

const router = express.Router();

const CARPETA_DISENOS = path.join(__dirname, '..', '..', 'frontend', 'img', 'disenos');
fs.mkdirSync(CARPETA_DISENOS, { recursive: true });

const EXTENSIONES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
};

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

router.post('/admin/imagenes', requiereSesion, requiereRol('admin'),
    subir.single('imagen'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                ok: false, mensaje: 'Sube una imagen JPG, PNG o WEBP de menos de 2 MB'
            });
        }
        res.status(201).json({ ok: true, ruta: 'img/' + req.file.filename });
    });

const almacenDisenos = multer.diskStorage({
    destination: CARPETA_DISENOS,
    filename: (req, archivo, listo) => {
        const extension = EXTENSIONES[archivo.mimetype] || '.bin';
        listo(null, crypto.randomBytes(10).toString('hex') + extension);
    },
});

const subirDiseno = multer({
    storage: almacenDisenos,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, archivo, listo) => listo(null, EXTENSIONES[archivo.mimetype] !== undefined),
});

router.post('/archivos/estampa', subirDiseno.single('archivo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            ok: false,
            mensaje: 'Sube un PNG, JPG, WEBP o PDF de menos de 10 MB',
        });
    }

    res.status(201).json({
        ok: true,
        archivo: {
            id: req.file.filename,
            nombre_original: req.file.originalname,
            tamano_kb: Math.round(req.file.size / 1024),
            ruta: 'img/disenos/' + req.file.filename,
        },
    });
});


module.exports = router;