const express = require('express');

const { requiereSesion, requiereRol } = require('../../sesion');
const ordenDAO = require('../../dao/ordenDAO');
const proveedorDAO = require('../../dao/proveedorDAO');
const usuarioDAO = require('../../dao/usuarioDAO');

const router = express.Router();

const IGV = 0.18;

async function siguienteCodigo() {
    const anio = new Date().getFullYear();
    const ultimo = await ordenDAO.ultimoNumeroDelAnio(anio);
    const numero = String(ultimo + 1).padStart(3, '0');

    return `OC-${anio}-${numero}`;
}



function leerItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return { error: 'La orden debe tener al menos un item' };
    }

    const limpias = [];

    for (const it of items) {
        const descripcion = (it.descripcion || '').trim();
        const cantidad = Number(it.cantidad);
        const precio_unitario = Number(it.precio_unitario);

        if (!descripcion || isNaN(cantidad) || cantidad < 1 ||
            isNaN(precio_unitario) || precio_unitario < 0) {
            return { error: 'Item inválido' };
        }

        limpias.push({
            descripcion,
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

        const revision = leerItems(req.body.items);
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

        if (!await ordenDAO.existe(id)) {
            return res.status(404).json({ ok: false, mensaje: 'Orden no encontrada' });
        }

        await ordenDAO.borrar(id);
        res.json({ ok: true });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo eliminar la orden' });
    }
});


module.exports = router;
