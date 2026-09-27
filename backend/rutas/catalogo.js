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


function aSlug(texto) {
    return String(texto)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}



router.get('/categorias/:slug', async (req, res) => {
    try {
        const [categorias] = await db.query(
            'SELECT id, nombre, slug, descripcion, imagen, icono FROM categorias WHERE slug = ? AND activo = 1',
            [req.params.slug]
        );

        if (categorias.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Esa categoría no existe' });
        }

        const [productos] = await db.query(`
            SELECT p.id, p.nombre, p.slug, p.descripcion, p.imagen,
                   p.precio AS precio_base, p.cantidad_minima, p.dias_produccion
              FROM productos p
             WHERE p.categoria_id = ? AND p.activo = 1
             ORDER BY p.id
        `, [categorias[0].id]);

        res.json({ ok: true, categoria: categorias[0], productos });

    } catch (error) {
        console.error('Error consultando la categoría:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo consultar la base de datos' });
    }
});



router.get('/productos', async (req, res) => {
    try {
        const texto = (req.query.buscar || '').trim();

        if (texto.length < 2) {
            return res.json({ ok: true, total: 0, productos: [] });
        }

        // LIKE con % a los lados: encuentra el texto en cualquier parte
        // del nombre. Va parametrizado, nunca pegado a la consulta.
        const [productos] = await db.query(`
            SELECT p.id, p.nombre, p.slug, p.descripcion, p.imagen,
                   p.precio AS precio_base, p.cantidad_minima,
                   c.nombre AS categoria
              FROM productos p
              JOIN categorias c ON c.id = p.categoria_id
             WHERE p.activo = 1 AND (p.nombre LIKE ? OR p.descripcion LIKE ?)
             ORDER BY p.nombre
             LIMIT 30
        `, ['%' + texto + '%', '%' + texto + '%']);

        res.json({ ok: true, total: productos.length, productos });

    } catch (error) {
        console.error('Error buscando productos:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo buscar' });
    }
});


router.get('/productos/:slug', async (req, res) => {
    try {
        const [productos] = await db.query(`
            SELECT p.id, p.nombre, p.slug, p.descripcion, p.imagen,
                   p.precio AS precio_base, p.cantidad_minima, p.dias_produccion,
                   c.nombre AS categoria_nombre, c.slug AS categoria_slug
              FROM productos p
              JOIN categorias c ON c.id = p.categoria_id
             WHERE p.slug = ? AND p.activo = 1
        `, [req.params.slug]);

        if (productos.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
        }

        const producto = productos[0];

        const [atributos] = await db.query(
            'SELECT id, nombre, tipo, orden FROM atributos WHERE producto_id = ? ORDER BY orden, id',
            [producto.id]
        );

        const [valores] = await db.query(`
            SELECT v.id, v.atributo_id, v.valor, v.recargo,
                   v.color_hex AS codigo_hex
              FROM atributo_valores v
              JOIN atributos a ON a.id = v.atributo_id
             WHERE a.producto_id = ?
             ORDER BY v.orden, v.id
        `, [producto.id]);

        producto.atributos = atributos.map((a) => ({
            id: a.id,
            nombre: a.nombre,
            slug: 'atributo-' + a.id,
            tipo_input: a.tipo,
            obligatorio: true,
            valores: valores.filter((v) => v.atributo_id === a.id),
        }));

        producto.escalas = [];
        producto.permite_estampa = false;

        res.json({ ok: true, producto });

    } catch (error) {
        console.error('Error consultando el producto:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo consultar la base de datos' });
    }
});


router.post('/productos/:id/precio', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const cantidad = Number(req.body.cantidad) || 1;
        const seleccion = req.body.seleccion || {};

        const [productos] = await db.query(
            'SELECT id, nombre, precio, cantidad_minima FROM productos WHERE id = ? AND activo = 1',
            [id]
        );

        if (productos.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
        }

        const producto = productos[0];

        if (cantidad < producto.cantidad_minima) {
            return res.status(400).json({
                ok: false,
                mensaje: `El pedido mínimo de este producto es ${producto.cantidad_minima} unidad(es)`,
            });
        }

        const [atributos] = await db.query(
            'SELECT id, nombre FROM atributos WHERE producto_id = ?', [id]
        );

        const [valores] = await db.query(`
            SELECT v.id, v.atributo_id, v.valor, v.recargo
              FROM atributo_valores v
              JOIN atributos a ON a.id = v.atributo_id
             WHERE a.producto_id = ?
        `, [id]);

        const elegidos = Object.values(seleccion).map(Number);

        let recargos = 0;
        const detalle = [];

        for (const atributo of atributos) {
            const suyos = valores.filter((v) => v.atributo_id === atributo.id);
            const elegido = suyos.find((v) => elegidos.includes(v.id));

            if (!elegido) {
                return res.status(400).json({
                    ok: false,
                    mensaje: `Te falta elegir: ${atributo.nombre}`,
                });
            }

            recargos += Number(elegido.recargo);
            detalle.push({ atributo: atributo.nombre, valor: elegido.valor });
        }

        const precioUnitario = Number(producto.precio) + recargos;

        res.json({
            ok: true,
            cantidad,
            precio_unitario: precioUnitario,
            subtotal: precioUnitario * cantidad,
            desglose: {
                precio_base_aplicado: Number(producto.precio),
                recargos,
                opciones: detalle,
            },
        });

    } catch (error) {
        console.error('Error calculando el precio:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo calcular el precio' });
    }
});
module.exports = router;