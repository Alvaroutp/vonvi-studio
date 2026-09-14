const express = require('express');
const db = require('../../db');
const { requiereSesion, requiereAdmin } = require('../../sesion');

const router = express.Router();

function aSlug(texto) {
    return String(texto)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}


// NIVEL 1 CATEGORÍAS

// Listar
router.get('/admin/categorias', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const [categorias] = await db.query(`
            SELECT c.id, c.nombre, c.slug, c.descripcion, c.imagen, c.icono, c.activo,
                   COUNT(p.id) AS total_productos
              FROM categorias c
              LEFT JOIN productos p ON p.categoria_id = c.id
             GROUP BY c.id, c.nombre, c.slug, c.descripcion, c.imagen, c.icono, c.activo
             ORDER BY c.id
        `);

        res.json({ ok: true, total: categorias.length, categorias });

    } catch (error) {
        console.error('Error listando categorías:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo consultar la base de datos' });
    }
});


// Crear
router.post('/admin/categorias', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const nombre = (req.body.nombre || '').trim();
        const descripcion = (req.body.descripcion || '').trim() || null;
        const imagen = (req.body.imagen || '').trim() || null;
        const icono = (req.body.icono || '').trim() || null;

        if (!nombre) {
            return res.status(400).json({ ok: false, mensaje: 'Escribe el nombre de la categoría' });
        }

        const slug = aSlug(nombre);

        if (!slug) {
            return res.status(400).json({ ok: false, mensaje: 'Ese nombre no sirve, usa letras o números' });
        }

        const [resultado] = await db.query(
            'INSERT INTO categorias (nombre, slug, descripcion, imagen, icono) VALUES (?, ?, ?, ?, ?)',
            [nombre, slug, descripcion, imagen, icono]
        );

        res.status(201).json({
            ok: true,
            mensaje: 'Categoría creada',
            categoria: { id: resultado.insertId, nombre, slug, descripcion, imagen, icono, activo: 1 },
        });

    } catch (error) {
        // El slug ya existe porque la columna es UNIQUE
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ ok: false, mensaje: 'Ya existe una categoría con ese nombre' });
        }
        console.error('Error creando categoría:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear la categoría' });
    }
});


// Editar
router.put('/admin/categorias/:id', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        const [existe] = await db.query('SELECT id FROM categorias WHERE id = ?', [id]);

        if (existe.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Esa categoría no existe' });
        }

        const nombre = (req.body.nombre || '').trim();

        if (!nombre) {
            return res.status(400).json({ ok: false, mensaje: 'Escribe el nombre de la categoría' });
        }

        await db.query(
            `UPDATE categorias
                SET nombre = ?, slug = ?, descripcion = ?, imagen = ?, icono = ?, activo = ?
              WHERE id = ?`,
            [
                nombre,
                aSlug(nombre),
                (req.body.descripcion || '').trim() || null,
                (req.body.imagen || '').trim() || null,
                (req.body.icono || '').trim() || null,
                req.body.activo === false ? 0 : 1,
                id,
            ]
        );

        res.json({ ok: true, mensaje: 'Categoría actualizada' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ ok: false, mensaje: 'Ya existe otra categoría con ese nombre' });
        }
        console.error('Error editando categoría:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo actualizar la categoría' });
    }
});


// Borrar
router.delete('/admin/categorias/:id', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        const [cuenta] = await db.query(
            'SELECT COUNT(*) AS total FROM productos WHERE categoria_id = ?', [id]
        );

        if (cuenta[0].total > 0) {
            return res.status(400).json({
                ok: false,
                mensaje: `Esta categoría tiene ${cuenta[0].total} producto(s). Bórralos primero.`,
            });
        }

        const [r] = await db.query('DELETE FROM categorias WHERE id = ?', [id]);

        if (r.affectedRows === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Esa categoría no existe' });
        }

        res.json({ ok: true, mensaje: 'Categoría eliminada' });

    } catch (error) {
        console.error('Error borrando categoría:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo eliminar la categoría' });
    }
});


// NIVEL 2 PRODUCTOS

// Listar
router.get('/admin/productos', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const filtro = Number(req.query.categoria) || null;

        const [productos] = await db.query(`
            SELECT p.id, p.categoria_id, p.nombre, p.slug, p.descripcion,
                   p.precio AS precio_base,
                   p.imagen, p.cantidad_minima, p.dias_produccion, p.activo,
                   c.nombre AS categoria,
                   COUNT(a.id) AS total_atributos
              FROM productos p
              JOIN categorias c ON c.id = p.categoria_id
              LEFT JOIN atributos a ON a.producto_id = p.id
             WHERE (? IS NULL OR p.categoria_id = ?)
             GROUP BY p.id, p.categoria_id, p.nombre, p.slug, p.descripcion,
                      p.precio, p.imagen, p.cantidad_minima, p.dias_produccion,
                      p.activo, c.nombre
             ORDER BY c.id, p.id
        `, [filtro, filtro]);

        res.json({ ok: true, total: productos.length, productos });

    } catch (error) {
        console.error('Error listando productos:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo consultar la base de datos' });
    }
});

async function leerProducto(body) {
    const nombre = (body.nombre || '').trim();
    const categoriaId = Number(body.categoriaId || body.categoria_id);
    const precio = Number(body.precioBase ?? body.precio);

    if (!nombre) return { error: 'Escribe el nombre del producto' };
    if (!categoriaId) return { error: 'Elige una categoría' };
    if (isNaN(precio) || precio < 0) return { error: 'El precio base no es válido' };

    const [categoria] = await db.query('SELECT id FROM categorias WHERE id = ?', [categoriaId]);
    if (categoria.length === 0) return { error: 'Esa categoría no existe' };

    return {
        nombre,
        slug: aSlug(nombre),
        categoriaId,
        precio,
        descripcion: (body.descripcion || '').trim() || null,
        imagen: (body.imagen || '').trim() || null,
        cantidadMinima: Number(body.cantidadMinima) > 0 ? Number(body.cantidadMinima) : 1,
        diasProduccion: Number(body.diasProduccion) > 0 ? Number(body.diasProduccion) : 3,
        activo: body.activo === false ? 0 : 1,
    };
}


// Crear
router.post('/admin/productos', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const d = await leerProducto(req.body);

        if (d.error) {
            return res.status(400).json({ ok: false, mensaje: d.error });
        }

        const [resultado] = await db.query(
            `INSERT INTO productos
                (categoria_id, nombre, slug, descripcion, precio, imagen,
                 cantidad_minima, dias_produccion, activo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [d.categoriaId, d.nombre, d.slug, d.descripcion, d.precio, d.imagen,
             d.cantidadMinima, d.diasProduccion, d.activo]
        );

        res.status(201).json({
            ok: true,
            mensaje: 'Producto creado',
            producto: { id: resultado.insertId, ...d },
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ ok: false, mensaje: 'Ya existe un producto con ese nombre' });
        }
        console.error('Error creando producto:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear el producto' });
    }
});


// Editar
router.put('/admin/productos/:id', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        const [fila] = await db.query('SELECT id FROM productos WHERE id = ?', [id]);

        if (fila.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
        }

        const d = await leerProducto(req.body);

        if (d.error) {
            return res.status(400).json({ ok: false, mensaje: d.error });
        }

        await db.query(
            `UPDATE productos
                SET categoria_id = ?, nombre = ?, slug = ?, descripcion = ?, precio = ?,
                    imagen = ?, cantidad_minima = ?, dias_produccion = ?, activo = ?
              WHERE id = ?`,
            [d.categoriaId, d.nombre, d.slug, d.descripcion, d.precio, d.imagen,
             d.cantidadMinima, d.diasProduccion, d.activo, id]
        );

        res.json({ ok: true, mensaje: 'Producto actualizado' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ ok: false, mensaje: 'Ya existe otro producto con ese nombre' });
        }
        console.error('Error editando producto:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo actualizar el producto' });
    }
});


// Activar
router.put('/admin/productos/:id/activar', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const [r] = await db.query(
            'UPDATE productos SET activo = 1 WHERE id = ?', [Number(req.params.id)]
        );

        if (r.affectedRows === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
        }

        res.json({ ok: true, mensaje: 'Producto activado' });

    } catch (error) {
        console.error('Error activando producto:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo activar el producto' });
    }
});


// Desactivar
router.put('/admin/productos/:id/desactivar', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const [r] = await db.query(
            'UPDATE productos SET activo = 0 WHERE id = ?', [Number(req.params.id)]
        );

        if (r.affectedRows === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
        }

        res.json({ ok: true, mensaje: 'Producto desactivado' });

    } catch (error) {
        console.error('Error desactivando producto:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo desactivar el producto' });
    }
});


// Borrar
router.delete('/admin/productos/:id', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const [r] = await db.query('DELETE FROM productos WHERE id = ?', [Number(req.params.id)]);

        if (r.affectedRows === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
        }

        res.json({ ok: true, mensaje: 'Producto eliminado' });

    } catch (error) {
        console.error('Error borrando producto:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo eliminar el producto' });
    }
});


// NIVEL 3 ATRIBUTOS

// Crear
router.post('/admin/atributos', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const productoId = Number(req.body.productoId);
        const nombre = (req.body.nombre || '').trim();
        const tipo = req.body.tipo || 'select';

        if (!productoId) return res.status(400).json({ ok: false, mensaje: 'Falta el producto' });
        if (!nombre) return res.status(400).json({ ok: false, mensaje: 'Escribe el nombre del atributo' });

        if (!['select', 'color', 'radio'].includes(tipo)) {
            return res.status(400).json({ ok: false, mensaje: 'Ese tipo de atributo no existe' });
        }

        const [producto] = await db.query('SELECT id FROM productos WHERE id = ?', [productoId]);
        if (producto.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
        }

        // El orden se calcula solo: va al final de los que ya tiene
        const [ultimo] = await db.query(
            'SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente FROM atributos WHERE producto_id = ?',
            [productoId]
        );

        const [resultado] = await db.query(
            'INSERT INTO atributos (producto_id, nombre, tipo, orden) VALUES (?, ?, ?, ?)',
            [productoId, nombre, tipo, ultimo[0].siguiente]
        );

        res.status(201).json({
            ok: true,
            mensaje: 'Atributo creado',
            atributo: { id: resultado.insertId, nombre, tipo, orden: ultimo[0].siguiente, detalles: [] },
        });

    } catch (error) {
        console.error('Error creando atributo:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear el atributo' });
    }
});


// Editar
router.put('/admin/atributos/:id', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const nombre = (req.body.nombre || '').trim();
        const tipo = req.body.tipo || 'select';

        if (!nombre) {
            return res.status(400).json({ ok: false, mensaje: 'Escribe el nombre del atributo' });
        }

        if (!['select', 'color', 'radio'].includes(tipo)) {
            return res.status(400).json({ ok: false, mensaje: 'Ese tipo de atributo no existe' });
        }

        const [r] = await db.query(
            'UPDATE atributos SET nombre = ?, tipo = ? WHERE id = ?',
            [nombre, tipo, Number(req.params.id)]
        );

        if (r.affectedRows === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese atributo no existe' });
        }

        res.json({ ok: true, mensaje: 'Atributo actualizado' });

    } catch (error) {
        console.error('Error editando atributo:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo actualizar el atributo' });
    }
});


// Borrar
router.delete('/admin/atributos/:id', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const [r] = await db.query('DELETE FROM atributos WHERE id = ?', [Number(req.params.id)]);

        if (r.affectedRows === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese atributo no existe' });
        }

        res.json({ ok: true, mensaje: 'Atributo eliminado' });

    } catch (error) {
        console.error('Error borrando atributo:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo eliminar el atributo' });
    }
});


// NIVEL 4 DETALLES

// Crear
router.post('/admin/detalles', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const atributoId = Number(req.body.atributoId);
        const valor = (req.body.valor || '').trim();
        const recargo = Number(req.body.recargo || 0);
        const colorHex = (req.body.colorHex || '').trim() || null;

        if (!atributoId) return res.status(400).json({ ok: false, mensaje: 'Falta el atributo' });
        if (!valor) return res.status(400).json({ ok: false, mensaje: 'Escribe el valor del detalle' });

        if (isNaN(recargo) || recargo < 0) {
            return res.status(400).json({ ok: false, mensaje: 'El recargo no es válido' });
        }

        const [atributo] = await db.query('SELECT id FROM atributos WHERE id = ?', [atributoId]);
        if (atributo.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese atributo no existe' });
        }

        const [ultimo] = await db.query(
            'SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente FROM atributo_valores WHERE atributo_id = ?',
            [atributoId]
        );

        const [resultado] = await db.query(
            'INSERT INTO atributo_valores (atributo_id, valor, color_hex, recargo, orden) VALUES (?, ?, ?, ?, ?)',
            [atributoId, valor, colorHex, recargo, ultimo[0].siguiente]
        );

        res.status(201).json({
            ok: true,
            mensaje: 'Detalle creado',
            detalle: { id: resultado.insertId, atributo_id: atributoId, valor, color_hex: colorHex, recargo },
        });

    } catch (error) {
        console.error('Error creando detalle:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear el detalle' });
    }
});


// Editar
router.put('/admin/detalles/:id', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const valor = (req.body.valor || '').trim();
        const recargo = Number(req.body.recargo || 0);

        if (!valor) return res.status(400).json({ ok: false, mensaje: 'Escribe el valor del detalle' });

        if (isNaN(recargo) || recargo < 0) {
            return res.status(400).json({ ok: false, mensaje: 'El recargo no es válido' });
        }

        const [r] = await db.query(
            'UPDATE atributo_valores SET valor = ?, color_hex = ?, recargo = ? WHERE id = ?',
            [valor, (req.body.colorHex || '').trim() || null, recargo, id]
        );

        if (r.affectedRows === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese detalle no existe' });
        }

        res.json({ ok: true, mensaje: 'Detalle actualizado' });

    } catch (error) {
        console.error('Error editando detalle:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo actualizar el detalle' });
    }
});


// Borrar
router.delete('/admin/detalles/:id', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const [r] = await db.query('DELETE FROM atributo_valores WHERE id = ?', [Number(req.params.id)]);

        if (r.affectedRows === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese detalle no existe' });
        }

        res.json({ ok: true, mensaje: 'Detalle eliminado' });

    } catch (error) {
        console.error('Error borrando detalle:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo eliminar el detalle' });
    }
});


// Arbol
router.get('/admin/productos/:id/arbol', requiereSesion, requiereAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        const [productos] = await db.query(`
            SELECT p.id, p.nombre, p.slug, p.precio AS precio_base, p.categoria_id,
                   c.nombre AS categoria
              FROM productos p
              JOIN categorias c ON c.id = p.categoria_id
             WHERE p.id = ?
        `, [id]);

        if (productos.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
        }

        const [atributos] = await db.query(
            'SELECT id, nombre, tipo, orden FROM atributos WHERE producto_id = ? ORDER BY orden, id',
            [id]
        );

        const [detalles] = await db.query(`
            SELECT v.id, v.atributo_id, v.valor, v.color_hex, v.recargo, v.orden
              FROM atributo_valores v
              JOIN atributos a ON a.id = v.atributo_id
             WHERE a.producto_id = ?
             ORDER BY v.orden, v.id
        `, [id]);

        // A cada atributo se le cuelgan sus detalles
        const arbol = atributos.map((a) => ({
            ...a,
            detalles: detalles.filter((d) => d.atributo_id === a.id),
        }));

        res.json({ ok: true, producto: productos[0], atributos: arbol });

    } catch (error) {
        console.error('Error consultando el árbol:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo consultar la base de datos' });
    }
});


module.exports = router;