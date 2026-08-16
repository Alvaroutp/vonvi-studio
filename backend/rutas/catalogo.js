const express = require('express');
const db = require('../db');   

const router = express.Router();

router.get('/categorias', async (req, res) => {
    try {
        const [categorias] = await db.query(`
            SELECT c.id, c.nombre, c.slug, c.descripcion, c.imagen, c.icono,
                   COUNT(p.id)   AS total_productos,
                   MIN(p.precio) AS precio_desde
              FROM categorias c
              LEFT JOIN productos p
                     ON p.categoria_id = c.id AND p.activo = 1
             WHERE c.activo = 1
             GROUP BY c.id, c.nombre, c.slug, c.descripcion, c.imagen, c.icono
             ORDER BY c.id
        `);

        res.json({ ok: true, total: categorias.length, categorias: categorias });

    } catch (error) {
        console.error('Error consultando categorías:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo consultar la base de datos' });
    }
});

module.exports = router;