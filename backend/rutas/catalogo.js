const express = require('express');

const categoriaDAO = require('../dao/categoriaDAO');
const productoDAO = require('../dao/productoDAO');
const atributoDAO = require('../dao/atributoDAO');

const router = express.Router();


router.get('/categorias', async (req, res) => {
    try {
        const categorias = await categoriaDAO.listarActivas();
        res.json({ ok: true, total: categorias.length, categorias: categorias });

    } catch (error) {
        console.error('Error consultando categorías:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo consultar la base de datos' });
    }
});


router.get('/categorias/:slug', async (req, res) => {
    try {
        const categoria = await categoriaDAO.buscarPorSlugActiva(req.params.slug);

        if (!categoria) {
            return res.status(404).json({ ok: false, mensaje: 'Esa categoría no existe' });
        }

        const productos = await productoDAO.listarActivosDeCategoria(categoria.id);

        res.json({ ok: true, categoria, productos });

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

        const productos = await productoDAO.buscarPorTexto(texto);

        res.json({ ok: true, total: productos.length, productos });

    } catch (error) {
        console.error('Error buscando productos:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo buscar' });
    }
});


router.get('/productos/:slug', async (req, res) => {
    try {
        const producto = await productoDAO.buscarPorSlugActivo(req.params.slug);

        if (!producto) {
            return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
        }

        const atributos = await atributoDAO.listarPorProducto(producto.id);
        const valores = await atributoDAO.listarValoresDeProducto(producto.id);

        producto.atributos = atributos.map((a) => ({
            id: a.id,
            nombre: a.nombre,
            slug: 'atributo-' + a.id,
            tipo_input: a.tipo,
            obligatorio: true,
            valores: valores
                .filter((v) => v.atributo_id === a.id)
                .map((v) => ({
                    id: v.id,
                    atributo_id: v.atributo_id,
                    valor: v.valor,
                    recargo: v.recargo,
                    codigo_hex: v.color_hex,
                })),
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

        const producto = await productoDAO.buscarActivoPorId(id);

        if (!producto) {
            return res.status(404).json({ ok: false, mensaje: 'Ese producto no existe' });
        }

        if (cantidad < producto.cantidad_minima) {
            return res.status(400).json({
                ok: false,
                mensaje: `El pedido mínimo de este producto es ${producto.cantidad_minima} unidad(es)`,
            });
        }

        const atributos = await atributoDAO.listarPorProducto(id);
        const valores = await atributoDAO.listarValoresDeProducto(id);

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
