const express = require('express');

const { requiereSesion, requiereRol } = require('../../sesion');
const ordenDAO = require('../../dao/ordenDAO');
const proveedorDAO = require('../../dao/proveedorDAO');
const usuarioDAO = require('../../dao/usuarioDAO');
const productoDAO = require('../../dao/productoDAO');

const router = express.Router();

const IGV = 0.18;

function hoy() {
    const ahora = new Date();
    return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 10);
}


function fechaDeHoy() {
    const ahora = new Date();
    return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 10);
}

async function siguienteCodigo() {
    const anio = new Date().getFullYear();
    const ultimo = await ordenDAO.ultimoNumeroDelAnio(anio);
    const numero = String(ultimo + 1).padStart(3, '0');

    return `OC-${anio}-${numero}`;
}



async function leerItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return { error: 'La orden debe tener al menos un item' };
    }

    const limpias = [];

    for (const it of items) {
        const producto_id = Number(it.producto_id);
        const cantidad = Number(it.cantidad);
        const precio_unitario = Number(it.precio_unitario);

        if (!producto_id) {
            return { error: 'Cada línea tiene que ser un producto del catálogo' };
        }

        if (isNaN(cantidad) || cantidad < 1 ||
            isNaN(precio_unitario) || precio_unitario < 0) {
            return { error: 'Cantidad o precio inválido' };
        }

        const producto = await productoDAO.buscarPorId(producto_id);

        if (!producto) {
            return { error: 'Uno de los productos ya no existe' };
        }

        limpias.push({
            producto_id,
            descripcion: producto.nombre,
            cantidad,
            precio_unitario,
            subtotal: Number((cantidad * precio_unitario).toFixed(2)),
        });
    }

    return { items: limpias };
}


router.get('/admin/proveedores/:id/ordenes', requiereSesion, requiereRol('admin'),
    async (req, res) => {
        try {
            const ordenes = await ordenDAO.listarPorProveedor(Number(req.params.id));
            res.json({ ok: true, ordenes });

        } catch (error) {
            console.error(error.message);
            res.status(500).json({ ok: false, mensaje: 'No se pudo listar las órdenes' });
        }
    });


router.post('/admin/ordenes', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const proveedor_id = Number(req.body.proveedor_id);
        const fecha_entrega = req.body.fecha_entrega || null;

        if (!proveedor_id) {
            return res.status(400).json({ ok: false, mensaje: 'Proveedor requerido' });
        }

        // El calendario ya lo bloquea, pero el navegador se puede saltar
        if (fecha_entrega && fecha_entrega < hoy()) {
            return res.status(400).json({
                ok: false, mensaje: 'La fecha de entrega no puede ser anterior a hoy'
            });
        }

        if (fecha_entrega) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_entrega)) {
                return res.status(400).json({ ok: false, mensaje: 'Fecha de entrega inválida' });
            }

            if (fecha_entrega < fechaDeHoy()) {
                return res.status(400).json({
                    ok: false, mensaje: 'La fecha de entrega no puede ser anterior a hoy'
                });
            }
        }

        const revision = await leerItems(req.body.items);
        if (revision.error) {
            return res.status(400).json({ ok: false, mensaje: revision.error });
        }

        if (!await proveedorDAO.existe(proveedor_id)) {
            return res.status(404).json({ ok: false, mensaje: 'Ese proveedor no existe' });
        }

        if (await usuarioDAO.contarPorProveedor(proveedor_id) === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Ese proveedor no tiene cuenta de acceso. Creale una primero.'
            });
        }

        const subtotal = Number(
            revision.items.reduce((suma, l) => suma + l.subtotal, 0).toFixed(2)
        );
        const igv = Number((subtotal * IGV).toFixed(2));
        const total = Number((subtotal + igv).toFixed(2));

        const codigo = await siguienteCodigo();

        const ordenId = await ordenDAO.crear({
            codigo, proveedor_id, fecha_entrega, subtotal, igv, total,
        });

        try {
            for (const item of revision.items) {
                await ordenDAO.agregarItem(ordenId, item);
            }
        } catch (errorLineas) {
        
            await ordenDAO.borrar(ordenId);
            throw errorLineas;
        }

        res.status(201).json({ ok: true, id: ordenId, codigo });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear la orden' });
    }
});


router.delete('/admin/ordenes/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);

        const estado = await ordenDAO.estadoDe(id);

        if (!estado) {
            return res.status(404).json({ ok: false, mensaje: 'Orden no encontrada' });
        }

        if (estado === 'recibida') {
            return res.status(400).json({
                ok: false, mensaje: 'No se puede borrar una orden ya recibida'
            });
        }

        await ordenDAO.borrar(id);
        res.json({ ok: true });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo eliminar la orden' });
    }
});


router.put('/admin/ordenes/:id/recibir', requiereSesion, requiereRol('admin'),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            const cambiadas = await ordenDAO.marcarRecibida(id);

            if (cambiadas === 0) {
                const estado = await ordenDAO.estadoDe(id);

                if (!estado) {
                    return res.status(404).json({ ok: false, mensaje: 'Orden no encontrada' });
                }

                return res.status(400).json({
                    ok: false,
                    mensaje: estado === 'recibida'
                        ? 'Esa orden ya fue recibida'
                        : 'Solo se pueden recibir órdenes que el proveedor aceptó',
                });
            }

            const items = await ordenDAO.itemsDeOrden(id);

            for (const item of items) {
                if (item.producto_id) {
                    await productoDAO.sumarStock(item.producto_id, item.cantidad);
                }
            }

            res.json({ ok: true, mensaje: 'Mercadería recibida, el stock se actualizó' });

        } catch (error) {
            console.error(error.message);
            res.status(500).json({ ok: false, mensaje: 'No se pudo recibir la orden' });
        }
    });


module.exports = router;
