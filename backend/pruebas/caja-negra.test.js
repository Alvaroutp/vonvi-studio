const { test, describe, before } = require('node:test');
const assert = require('node:assert');

const { pedir, entrar, exigirServidor } = require('./ayuda');

before(exigirServidor);

describe('Compra completa de un cliente', () => {

    const CANDIDATOS = [
        'taza-ceramica-11-oz', 'taza-magica', 'polo-cuello-v',
        'polo-manga-larga', 'polo-clasico-algodon-20-1',
    ];

    let codigo;
    let compra;

    async function buscarProductoConStock() {
        for (const slug of CANDIDATOS) {
            const r = await pedir('/api/productos/' + slug);

            if (r.estado !== 200 || !r.datos.producto) continue;

            const p = r.datos.producto;
            const cantidad = Number(p.cantidad_minima);

            if (Number(p.stock) < cantidad) continue;

            const seleccion = {};

            for (const a of p.atributos || []) {
                if (a.valores && a.valores.length) seleccion[a.id] = a.valores[0].id;
            }

            return { slug, cantidad, seleccion };
        }

        return null;
    }

    before(async () => {
        await pedir('/api/carrito', { metodo: 'DELETE', como: 'cliente' });
        compra = await buscarProductoConStock();
    });

    test('1. el catalogo se ve sin iniciar sesion', async () => {
        const categorias = await pedir('/api/categorias');
        const busqueda = await pedir('/api/productos?buscar=taza');

        assert.equal(categorias.estado, 200);
        assert.ok(categorias.datos.categorias.length > 0);
        assert.ok(busqueda.datos.productos.length > 0);
    });

    test('2. agrega un producto al carrito', async (t) => {
        if (!compra) return t.skip('ningun producto tiene stock suficiente');

        const r = await pedir('/api/carrito/items', {
            metodo: 'POST', como: 'cliente',
            cuerpo: {
                producto: compra.slug,
                cantidad: compra.cantidad,
                seleccion: compra.seleccion,
            },
        });

        assert.equal(r.estado, 201);
        assert.equal(r.datos.carrito.items.length, 1);
    });

    test('3. el carrito suma bien el total', async (t) => {
        if (!compra) return t.skip('sin producto con stock');

        const r = await pedir('/api/carrito', { como: 'cliente' });
        const item = r.datos.carrito.items[0];
        const esperado = Number((Number(item.precio_unitario) * item.cantidad).toFixed(2));

        assert.equal(Number(item.subtotal), esperado);
        assert.equal(r.datos.carrito.resumen.subtotal, esperado);
        assert.equal(r.datos.carrito.resumen.total_articulos, item.cantidad);
    });

    test('4. paga y el pedido nace pagado', async (t) => {
        if (!compra) return t.skip('sin producto con stock');

        const r = await pedir('/api/pedidos', {
            metodo: 'POST', como: 'cliente',
            cuerpo: {
                tipoEntrega: 'recojo',
                telefonoContacto: '987654321',
                metodo: 'tarjeta',
                titular: 'Maria Lopez',
                numeroTarjeta: '4111 1111 1111 1111',
            },
        });

        assert.equal(r.estado, 201, r.datos && r.datos.mensaje);
        assert.equal(r.datos.pedido.estado_pago, 'pagado');

        codigo = r.datos.pedido.codigo;
    });

    test('5. del numero de tarjeta solo quedan los 4 ultimos', async (t) => {
        if (!codigo) return t.skip('no se llego a pagar');

        const r = await pedir('/api/pedidos/' + codigo, { como: 'cliente' });
        const texto = JSON.stringify(r.datos);

        assert.ok(!texto.includes('4111111111111111'));
        assert.ok(!texto.includes('4111 1111 1111 1111'));
        assert.ok(texto.includes('1111'));
    });

    test('6. el pedido aparece en sus pedidos', async (t) => {
        if (!codigo) return t.skip('no se llego a pagar');

        const r = await pedir('/api/pedidos', { como: 'cliente' });

        assert.ok(r.datos.pedidos.some((p) => p.codigo === codigo));
    });

    test('7. el carrito quedo vacio', async (t) => {
        if (!codigo) return t.skip('no se llego a pagar');

        const r = await pedir('/api/carrito', { como: 'cliente' });

        assert.equal(r.datos.carrito.items.length, 0);
    });

    test('8. no puede ver el pedido de otro cliente', async (t) => {
        const todos = await pedir('/api/admin/pedidos', { como: 'admin' });
        const correo = 'maria@example.com';

        const ajeno = todos.datos.pedidos.find((p) => p.cliente_email !== correo);

        if (!ajeno) return t.skip('todos los pedidos son del mismo cliente');

        const r = await pedir('/api/pedidos/' + ajeno.codigo, { como: 'cliente' });

        assert.ok(r.estado === 403 || r.estado === 404);
    });
});

describe('El empleado y el taller', () => {

    test('solo ve pedidos de la fase 3 en adelante', async () => {
        const r = await pedir('/api/admin/pedidos', { como: 'empleado' });

        assert.equal(r.estado, 200);
        assert.ok(r.datos.pedidos.every(
            (p) => p.estado_orden >= 3 && p.estado !== 'cancelado'
        ));
    });

    test('ve menos pedidos que el admin', async () => {
        const suyos = await pedir('/api/admin/pedidos', { como: 'empleado' });
        const todos = await pedir('/api/admin/pedidos', { como: 'admin' });

        assert.ok(suyos.datos.total < todos.datos.total,
            'empleado ' + suyos.datos.total + ' vs admin ' + todos.datos.total);
    });

    test('los dos empleados comparten la misma lista', async () => {
        const a = await pedir('/api/admin/pedidos', { como: 'empleado' });
        const b = await pedir('/api/admin/pedidos', { como: 'empleado2' });

        assert.equal(a.datos.total, b.datos.total);
    });

    test('no puede abrir un pedido que sigue en diseno', async (t) => {
        const todos = await pedir('/api/admin/pedidos?estado=recibido', { como: 'admin' });

        if (!todos.datos.pedidos || todos.datos.pedidos.length === 0) {
            return t.skip('no hay pedidos en la fase de diseno');
        }

        const r = await pedir('/api/admin/pedidos/' + todos.datos.pedidos[0].codigo, {
            como: 'empleado',
        });

        assert.equal(r.estado, 403);
    });

    test('no puede entrar al tablero ni al reporte', async () => {
        const tablero = await pedir('/api/admin/metricas', { como: 'empleado' });
        const alertas = await pedir('/api/admin/alertas/stock', { como: 'empleado' });

        assert.equal(tablero.estado, 403);
        assert.equal(alertas.estado, 403);
    });
});

describe('Puertas cerradas', () => {

    test('sin token el panel responde 401', async () => {
        const r = await pedir('/api/admin/pedidos');

        assert.equal(r.estado, 401);
    });

    test('con un token inventado responde 401', async () => {
        const r = await pedir('/api/admin/pedidos', { token: 'abc123noexiste' });

        assert.equal(r.estado, 401);
    });

    test('un cliente no entra al panel', async () => {
        const r = await pedir('/api/admin/pedidos', { como: 'cliente' });

        assert.equal(r.estado, 403);
    });

    test('un proveedor no entra al panel', async () => {
        const r = await pedir('/api/admin/pedidos', { como: 'proveedor' });

        assert.equal(r.estado, 403);
    });

    test('un cliente no ve las ordenes del proveedor', async () => {
        const r = await pedir('/api/proveedor/ordenes', { como: 'cliente' });

        assert.equal(r.estado, 403);
    });

    test('al volver a entrar el token viejo deja de servir', async () => {
        const viejo = await entrar('cliente');
        await entrar('cliente');

        const r = await pedir('/api/auth/perfil', { token: viejo });

        assert.equal(r.estado, 401);
    });
});

describe('Avance del pedido por el taller', () => {

    let codigo;

    async function alguienEn(estado) {
        const r = await pedir('/api/admin/pedidos?estado=' + estado, { como: 'admin' });

        if (!r.datos.pedidos) return null;

        const pagado = r.datos.pedidos.find((p) => p.estado_pago === 'pagado');

        return pagado ? pagado.codigo : null;
    }

    async function mover(cod, estado) {
        const r = await pedir('/api/admin/pedidos/' + cod + '/estado', {
            metodo: 'PATCH', como: 'admin', cuerpo: { estado },
        });

        return r.estado === 200;
    }

    before(async () => {
        codigo = await alguienEn('por_aprobar');

        if (codigo) return;

        const enDiseno = await alguienEn('diseno_enviado');

        if (enDiseno && await mover(enDiseno, 'por_aprobar')) {
            codigo = enDiseno;
            return;
        }

        const recien = await alguienEn('recibido');

        if (recien
            && await mover(recien, 'diseno_enviado')
            && await mover(recien, 'por_aprobar')) {
            codigo = recien;
        }
    });

    test('el empleado lo lleva hasta entregado', async (t) => {
        if (!codigo) return t.skip('ya no quedan pedidos para avanzar, vuelve a cargar datos.sql');

        for (const paso of ['en_produccion', 'control', 'listo', 'entregado']) {
            const r = await pedir('/api/admin/pedidos/' + codigo + '/estado', {
                metodo: 'PATCH', como: 'empleado', cuerpo: { estado: paso },
            });

            assert.equal(r.estado, 200, 'fallo al pasar a ' + paso);
            assert.equal(r.datos.pedido.estado, paso);
        }
    });

    test('ya entregado no se puede mover mas', async (t) => {
        if (!codigo) return t.skip('ya no quedan pedidos para avanzar, vuelve a cargar datos.sql');

        const r = await pedir('/api/admin/pedidos/' + codigo + '/estado', {
            metodo: 'PATCH', como: 'admin', cuerpo: { estado: 'listo' },
        });

        assert.equal(r.estado, 400);
    });

    test('cada paso quedo escrito en el historial', async (t) => {
        if (!codigo) return t.skip('ya no quedan pedidos para avanzar, vuelve a cargar datos.sql');

        const r = await pedir('/api/admin/pedidos/' + codigo, { como: 'admin' });
        const pasos = r.datos.pedido.historial.map((h) => h.estado);

        for (const paso of ['en_produccion', 'control', 'listo', 'entregado']) {
            assert.ok(pasos.includes(paso), 'falta ' + paso + ' en el historial');
        }
    });
});
