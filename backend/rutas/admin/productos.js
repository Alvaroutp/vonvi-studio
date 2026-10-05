const express = require('express');

const { requiereSesion, requiereRol } = require('../../sesion');
const categoriaDAO = require('../../dao/categoriaDAO');
const productoDAO = require('../../dao/productoDAO');
const atributoDAO = require('../../dao/atributoDAO');

const router = express.Router();

const TIPOS = ['select', 'color', 'radio'];

function aSlug(texto) {
    return String(texto)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}


// NIVEL 1 CATEGORIAS

router.post('/admin/categorias', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const nombre = (req.body.nombre || '').trim();

        if (!nombre) {
            return res.status(400).json({ ok: false, mensaje: 'Escribe el nombre de la categoría' });
        }

        const slug = aSlug(nombre);

        if (!slug) {
            return res.status(400).json({
                ok: false, mensaje: 'Ese nombre no sirve, usa letras o números'
            });
        }

        const datos = {
            nombre,
            slug,
            descripcion: (req.body.descripcion || '').trim() || null,
            imagen: (req.body.imagen || '').trim() || null,
            icono: (req.body.icono || '').trim() || null,
        };

        const id = await categoriaDAO.crear(datos);

        res.status(201).json({
            ok: true,
            mensaje: 'Categoría creada',
            categoria: { id, ...datos, activo: 1 },
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                ok: false, mensaje: 'Ya existe una categoría con ese nombre'
            });
        }
        console.error('Error creando categoría:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear la categoría' });
    }
});


router.get('/admin/categorias', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const categorias = await categoriaDAO.listarTodas();
        res.json({ ok: true, total: categorias.length, categorias });

    } catch (error) {
        console.error('Error listando categorías:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo consultar la base de datos' });
    }
});


router.put('/admin/categorias/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!await categoriaDAO.existe(id)) {
            return res.status(404).json({ ok: false, mensaje: 'Esa categoría no existe' });
        }

        const nombre = (req.body.nombre || '').trim();

        if (!nombre) {
            return res.status(400).json({ ok: false, mensaje: 'Escribe el nombre de la categoría' });
        }

        await categoriaDAO.actualizar(id, {
            nombre,
            slug: aSlug(nombre),
            descripcion: (req.body.descripcion || '').trim() || null,
            imagen: (req.body.imagen || '').trim() || null,
            icono: (req.body.icono || '').trim() || null,
            activo: req.body.activo === false ? 0 : 1,
        });

        res.json({ ok: true, mensaje: 'Categoría actualizada' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                ok: false, mensaje: 'Ya existe otra categoría con ese nombre'
            });
        }
        console.error('Error editando categoría:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo actualizar la categoría' });
    }
});


router.delete('/admin/categorias/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);

        const total = await productoDAO.contarPorCategoria(id);

        if (total > 0) {
            return res.status(400).json({
                ok: false,
                mensaje: `Esta categoría tiene ${total} producto(s). Bórralos primero.`,
            });
        }

        if (await categoriaDAO.borrar(id) === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Esa categoría no existe' });
        }

        res.json({ ok: true, mensaje: 'Categoría eliminada' });

    } catch (error) {
        console.error('Error borrando categoría:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo eliminar la categoría' });
    }
});


// NIVEL 2 PRODUCTOS
async function leerProducto(body) {
    const nombre = (body.nombre || '').trim();
    const categoriaId = Number(body.categoriaId || body.categoria_id);
    const precio = Number(body.precioBase ?? body.precio);

    if (!nombre) return { error: 'Escribe el nombre del producto' };
    if (!categoriaId) return { error: 'Elige una categoría' };
    if (isNaN(precio) || precio < 0) return { error: 'El precio base no es válido' };

    if (!await categoriaDAO.existe(categoriaId)) return { error: 'Esa categoría no existe' };

    // Si el formulario no manda stock se deja en null y el DAO no lo toca
    let stock = null;

    if (body.stock !== undefined && body.stock !== '') {
        stock = Number(body.stock);

        if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
            return { error: 'El stock tiene que ser un número entero de 0 para arriba' };
        }
    }

    return {
        stock,
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


router.post('/admin/productos', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const d = await leerProducto(req.body);

        if (d.error) {
            return res.status(400).json({ ok: false, mensaje: d.error });
        }

        const id = await productoDAO.crear(d);

        res.status(201).json({
            ok: true,
            mensaje: 'Producto creado',
            producto: { id, ...d },
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                ok: false, mensaje: 'Ya existe un producto con ese nombre'
            });
        }
        console.error('Error creando producto:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear el producto' });
    }
});


router.get('/admin/productos', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const filtro = Number(req.query.categoria) || null;

        const productos = await productoDAO.listarParaAdmin(filtro);

        res.json({ ok: true, total: productos.length, productos });

    } catch (error) {
        console.error('Error listando productos:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo consultar la base de datos' });
    }
});


router.put('/admin/productos/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!await productoDAO.existe(id)) {
            return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
        }

        const d = await leerProducto(req.body);

        if (d.error) {
            return res.status(400).json({ ok: false, mensaje: d.error });
        }

        await productoDAO.actualizar(id, d);

        res.json({ ok: true, mensaje: 'Producto actualizado' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                ok: false, mensaje: 'Ya existe otro producto con ese nombre'
            });
        }
        console.error('Error editando producto:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo actualizar el producto' });
    }
});


router.get('/admin/productos/elegibles', requiereSesion, requiereRol('admin'),
    async (req, res) => {
        try {
            const productos = await productoDAO.listarParaElegir();
            res.json({ ok: true, productos });

        } catch (error) {
            console.error(error.message);
            res.status(500).json({ ok: false, mensaje: 'No se pudo listar los productos' });
        }
    });


router.put('/admin/productos/:id/stock', requiereSesion, requiereRol('admin'),
    async (req, res) => {
        try {
            const stock = Number(req.body.stock);

            if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
                return res.status(400).json({
                    ok: false, mensaje: 'El stock tiene que ser un número entero de 0 para arriba'
                });
            }

            if (await productoDAO.ajustarStock(Number(req.params.id), stock) === 0) {
                return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
            }

            res.json({ ok: true, mensaje: 'Stock corregido' });

        } catch (error) {
            console.error(error.message);
            res.status(500).json({ ok: false, mensaje: 'No se pudo cambiar el stock' });
        }
    });


router.put('/admin/productos/:id/activar', requiereSesion, requiereRol('admin'),
    async (req, res) => {
        try {
            if (await productoDAO.cambiarActivo(Number(req.params.id), 1) === 0) {
                return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
            }

            res.json({ ok: true, mensaje: 'Producto activado' });

        } catch (error) {
            console.error('Error activando producto:', error.message);
            res.status(500).json({ ok: false, mensaje: 'No se pudo activar el producto' });
        }
    });


router.put('/admin/productos/:id/desactivar', requiereSesion, requiereRol('admin'),
    async (req, res) => {
        try {
            if (await productoDAO.cambiarActivo(Number(req.params.id), 0) === 0) {
                return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
            }

            res.json({ ok: true, mensaje: 'Producto desactivado' });

        } catch (error) {
            console.error('Error desactivando producto:', error.message);
            res.status(500).json({ ok: false, mensaje: 'No se pudo desactivar el producto' });
        }
    });


router.delete('/admin/productos/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        if (await productoDAO.borrar(Number(req.params.id)) === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
        }

        res.json({ ok: true, mensaje: 'Producto eliminado' });

    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se puede borrar: este producto aparece en órdenes de compra',
            });
        }
        console.error('Error borrando producto:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo eliminar el producto' });
    }
});


// NIVEL 3 ATRIBUTOS

router.post('/admin/atributos', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const productoId = Number(req.body.productoId);
        const nombre = (req.body.nombre || '').trim();
        const tipo = req.body.tipo || 'select';

        if (!productoId) return res.status(400).json({ ok: false, mensaje: 'Falta el producto' });

        if (!nombre) {
            return res.status(400).json({ ok: false, mensaje: 'Escribe el nombre del atributo' });
        }

        if (!TIPOS.includes(tipo)) {
            return res.status(400).json({ ok: false, mensaje: 'Ese tipo de atributo no existe' });
        }

        if (!await productoDAO.existe(productoId)) {
            return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
        }

        const orden = await atributoDAO.siguienteOrden(productoId);
        const id = await atributoDAO.crear(productoId, { nombre, tipo, orden });

        res.status(201).json({
            ok: true,
            mensaje: 'Atributo creado',
            atributo: { id, nombre, tipo, orden, detalles: [] },
        });

    } catch (error) {
        console.error('Error creando atributo:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear el atributo' });
    }
});


router.put('/admin/atributos/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const nombre = (req.body.nombre || '').trim();
        const tipo = req.body.tipo || 'select';

        if (!nombre) {
            return res.status(400).json({ ok: false, mensaje: 'Escribe el nombre del atributo' });
        }

        if (!TIPOS.includes(tipo)) {
            return res.status(400).json({ ok: false, mensaje: 'Ese tipo de atributo no existe' });
        }

        const cambiadas = await atributoDAO.actualizar(Number(req.params.id), { nombre, tipo });

        if (cambiadas === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese atributo no existe' });
        }

        res.json({ ok: true, mensaje: 'Atributo actualizado' });

    } catch (error) {
        console.error('Error editando atributo:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo actualizar el atributo' });
    }
});


router.delete('/admin/atributos/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        if (await atributoDAO.borrar(Number(req.params.id)) === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese atributo no existe' });
        }

        res.json({ ok: true, mensaje: 'Atributo eliminado' });

    } catch (error) {
        console.error('Error borrando atributo:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo eliminar el atributo' });
    }
});


// NIVEL 4 DETALLES

router.post('/admin/detalles', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const atributoId = Number(req.body.atributoId);
        const valor = (req.body.valor || '').trim();
        const recargo = Number(req.body.recargo || 0);
        const colorHex = (req.body.colorHex || '').trim() || null;

        if (!atributoId) return res.status(400).json({ ok: false, mensaje: 'Falta el atributo' });

        if (!valor) {
            return res.status(400).json({ ok: false, mensaje: 'Escribe el valor del detalle' });
        }

        if (isNaN(recargo) || recargo < 0) {
            return res.status(400).json({ ok: false, mensaje: 'El recargo no es válido' });
        }

        if (!await atributoDAO.existe(atributoId)) {
            return res.status(404).json({ ok: false, mensaje: 'Ese atributo no existe' });
        }

        const orden = await atributoDAO.siguienteOrdenValor(atributoId);
        const id = await atributoDAO.crearValor(atributoId, { valor, colorHex, recargo, orden });

        res.status(201).json({
            ok: true,
            mensaje: 'Detalle creado',
            detalle: { id, atributo_id: atributoId, valor, color_hex: colorHex, recargo },
        });

    } catch (error) {
        console.error('Error creando detalle:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear el detalle' });
    }
});


router.put('/admin/detalles/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const valor = (req.body.valor || '').trim();
        const recargo = Number(req.body.recargo || 0);
        const colorHex = (req.body.colorHex || '').trim() || null;

        if (!valor) {
            return res.status(400).json({ ok: false, mensaje: 'Escribe el valor del detalle' });
        }

        if (isNaN(recargo) || recargo < 0) {
            return res.status(400).json({ ok: false, mensaje: 'El recargo no es válido' });
        }

        const cambiadas = await atributoDAO.actualizarValor(Number(req.params.id), {
            valor, colorHex, recargo,
        });

        if (cambiadas === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese detalle no existe' });
        }

        res.json({ ok: true, mensaje: 'Detalle actualizado' });

    } catch (error) {
        console.error('Error editando detalle:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo actualizar el detalle' });
    }
});


router.delete('/admin/detalles/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        if (await atributoDAO.borrarValor(Number(req.params.id)) === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese detalle no existe' });
        }

        res.json({ ok: true, mensaje: 'Detalle eliminado' });

    } catch (error) {
        console.error('Error borrando detalle:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo eliminar el detalle' });
    }
});


// EL ARBOL COMPLETO

router.get('/admin/productos/:id/arbol', requiereSesion, requiereRol('admin'),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            const producto = await productoDAO.buscarConCategoria(id);

            if (!producto) {
                return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
            }

            const atributos = await atributoDAO.listarPorProducto(id);
            const detalles = await atributoDAO.listarValoresDeProducto(id);

            const arbol = atributos.map((a) => ({
                ...a,
                detalles: detalles.filter((d) => d.atributo_id === a.id),
            }));

            res.json({ ok: true, producto, atributos: arbol });

        } catch (error) {
            console.error('Error consultando el árbol:', error.message);
            res.status(500).json({ ok: false, mensaje: 'No se pudo consultar la base de datos' });
        }
    });


module.exports = router;
