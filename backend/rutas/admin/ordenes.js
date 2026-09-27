const express = require('express');
const db = require('../../db');
const { requiereSesion, requiereRol } = require('../../sesion');

const router = express.Router();

async function siguienteCodigo() {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const [filas] = await db.query("SELECT codigo FROM ordenes_compra WHERE codigo LIKE ? ORDER BY id DESC LIMIT 1", [`OC-${anio}-%`]);
    if (filas.length === 0) return `OC-${anio}-001`;
    const ultimo = filas[0].codigo; // OC-2026-001
    const partes = ultimo.split('-');
    const num = parseInt(partes[2], 10) + 1;
    return `OC-${anio}-${String(num).padStart(3, '0')}`;
}

// Listar ordenes de un proveedor
router.get('/admin/proveedores/:id/ordenes', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const proveedorId = Number(req.params.id);
        const [ordenes] = await db.query('SELECT * FROM ordenes_compra WHERE proveedor_id = ? ORDER BY creado_en DESC', [proveedorId]);
        for (const ord of ordenes) {
            const [items] = await db.query('SELECT * FROM orden_items WHERE orden_id = ?', [ord.id]);
            ord.items = items;
        }
        res.json({ ok: true, ordenes });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo listar las órdenes' });
    }
});

// Crear orden
router.post('/admin/ordenes', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const proveedor_id = Number(req.body.proveedor_id);
        const fecha_entrega = req.body.fecha_entrega || null;
        const items = Array.isArray(req.body.items) ? req.body.items : [];

        if (!proveedor_id) return res.status(400).json({ ok: false, mensaje: 'Proveedor requerido' });
        if (items.length === 0) return res.status(400).json({ ok: false, mensaje: 'La orden debe tener al menos un item' });

        // Calcular subtotal en el servidor
        let subtotal = 0;
        const itemsToInsert = [];
        for (const it of items) {
            const descripcion = (it.descripcion || '').trim();
            const cantidad = Number(it.cantidad);
            const precio_unitario = Number(it.precio_unitario);
            if (!descripcion || isNaN(cantidad) || cantidad < 1 || isNaN(precio_unitario) || precio_unitario < 0) {
                return res.status(400).json({ ok: false, mensaje: 'Item inválido' });
            }
            const sub = Number((cantidad * precio_unitario).toFixed(2));
            subtotal += sub;
            itemsToInsert.push({ descripcion, cantidad, precio_unitario, subtotal: sub });
        }

        subtotal = Number(subtotal.toFixed(2));
        const igv = Number((subtotal * 0.18).toFixed(2));
        const total = Number((subtotal + igv).toFixed(2));

        const codigo = await siguienteCodigo();

        const [r] = await db.query('INSERT INTO ordenes_compra (codigo, proveedor_id, fecha_entrega, subtotal, igv, total) VALUES (?, ?, ?, ?, ?, ?)',
            [codigo, proveedor_id, fecha_entrega || null, subtotal, igv, total]);

        const ordenId = r.insertId;
        for (const it of itemsToInsert) {
            await db.query('INSERT INTO orden_items (orden_id, descripcion, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
                [ordenId, it.descripcion, it.cantidad, it.precio_unitario, it.subtotal]);
        }

        res.status(201).json({ ok: true, id: ordenId, codigo });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo crear la orden' });
    }
});

// Eliminar orden
router.delete('/admin/ordenes/:id', requiereSesion, requiereRol('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const [o] = await db.query('SELECT id FROM ordenes_compra WHERE id = ?', [id]);
        if (o.length === 0) return res.status(404).json({ ok: false, mensaje: 'Orden no encontrada' });
        await db.query('DELETE FROM ordenes_compra WHERE id = ?', [id]);
        res.json({ ok: true });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo eliminar la orden' });
    }
});

module.exports = router;
