const { test, describe, before } = require('node:test');
const assert = require('node:assert');

const { pedir, exigirServidor } = require('./ayuda');

before(exigirServidor);

describe('Registro de cuenta', () => {

    const bueno = {
        nombres: 'Ana', apellidos: 'Quispe',
        email: 'ana.prueba@example.com', password: 'clave12345',
    };

    test('sin ningun dato devuelve 400 y dice que falta', async () => {
        const r = await pedir('/api/auth/registro', { metodo: 'POST', cuerpo: {} });

        assert.equal(r.estado, 400);
        assert.ok(r.datos.detalles.length >= 4);
    });

    test('el correo sin arroba lo rechaza', async () => {
        const r = await pedir('/api/auth/registro', {
            metodo: 'POST', cuerpo: { ...bueno, email: 'anaexample.com' },
        });

        assert.equal(r.estado, 400);
        assert.ok(r.datos.detalles.some((d) => d.campo === 'email'));
    });

    test('la contrasena de 7 caracteres no pasa', async () => {
        const r = await pedir('/api/auth/registro', {
            metodo: 'POST', cuerpo: { ...bueno, password: '1234567' },
        });

        assert.equal(r.estado, 400);
        assert.ok(r.datos.detalles.some((d) => d.campo === 'password'));
    });

    test('el nombre de una sola letra no pasa', async () => {
        const r = await pedir('/api/auth/registro', {
            metodo: 'POST', cuerpo: { ...bueno, nombres: 'A' },
        });

        assert.equal(r.estado, 400);
        assert.ok(r.datos.detalles.some((d) => d.campo === 'nombres'));
    });

    test('un correo ya registrado avisa en vez de duplicar', async () => {
        const r = await pedir('/api/auth/registro', {
            metodo: 'POST', cuerpo: { ...bueno, email: 'maria@example.com' },
        });

        assert.equal(r.estado, 400);
        assert.match(r.datos.mensaje, /ya tiene una cuenta/);
    });
});

describe('Inicio de sesion', () => {

    test('contrasena equivocada da 401 sin decir cual de los dos fallo', async () => {
        const r = await pedir('/api/auth/login', {
            metodo: 'POST',
            cuerpo: { email: 'maria@example.com', password: 'estanoes' },
        });

        assert.equal(r.estado, 401);
        assert.match(r.datos.mensaje, /Correo o contrase/);
    });

    test('un correo que no existe tambien da 401', async () => {
        const r = await pedir('/api/auth/login', {
            metodo: 'POST',
            cuerpo: { email: 'nadie@example.com', password: 'loquesea12' },
        });

        assert.equal(r.estado, 401);
    });

    test('sin cuerpo no revienta el servidor', async () => {
        const r = await pedir('/api/auth/login', { metodo: 'POST', cuerpo: {} });

        assert.ok(r.estado === 400 || r.estado === 401);
    });
});

describe('Carrito', () => {

    test('cantidad cero no entra', async () => {
        const r = await pedir('/api/carrito/items', {
            metodo: 'POST',
            cuerpo: { producto: 'polo-clasico-algodon-20-1', cantidad: 0 },
        });

        assert.equal(r.estado, 400);
        assert.match(r.datos.mensaje, /Cantidad/);
    });

    test('cantidad negativa tampoco', async () => {
        const r = await pedir('/api/carrito/items', {
            metodo: 'POST',
            cuerpo: { producto: 'polo-clasico-algodon-20-1', cantidad: -5 },
        });

        assert.equal(r.estado, 400);
    });

    test('un producto inventado da 404', async () => {
        const r = await pedir('/api/carrito/items', {
            metodo: 'POST',
            cuerpo: { producto: 'polo-que-no-existe', cantidad: 20 },
        });

        assert.equal(r.estado, 404);
    });

    test('respeta el pedido minimo del producto', async () => {
        const r = await pedir('/api/carrito/items', {
            metodo: 'POST',
            cuerpo: { producto: 'polo-clasico-algodon-20-1', cantidad: 1 },
        });

        assert.equal(r.estado, 400);
        assert.match(r.datos.mensaje, /minimo|mínimo/);
    });
});

describe('Cotizacion', () => {

    const buena = {
        nombre: 'Ana Quispe', email: 'ana@example.com',
        telefono: '987654321', mensaje: 'Quiero 50 polos',
    };

    test('nombre de dos letras no pasa', async () => {
        const r = await pedir('/api/cotizaciones', {
            metodo: 'POST', cuerpo: { ...buena, nombre: 'An' },
        });

        assert.equal(r.estado, 400);
    });

    test('correo sin punto no pasa', async () => {
        const r = await pedir('/api/cotizaciones', {
            metodo: 'POST', cuerpo: { ...buena, email: 'ana@example' },
        });

        assert.equal(r.estado, 400);
        assert.match(r.datos.mensaje, /correo/);
    });

    test('telefono de 3 digitos no pasa', async () => {
        const r = await pedir('/api/cotizaciones', {
            metodo: 'POST', cuerpo: { ...buena, telefono: '123' },
        });

        assert.equal(r.estado, 400);
    });
});

describe('Cambio de estado del pedido', () => {

    test('un estado inventado da 400', async () => {
        const lista = await pedir('/api/admin/pedidos', { como: 'admin' });
        const codigo = lista.datos.pedidos[0].codigo;

        const r = await pedir('/api/admin/pedidos/' + codigo + '/estado', {
            metodo: 'PATCH', como: 'admin', cuerpo: { estado: 'volando' },
        });

        assert.equal(r.estado, 400);
        assert.match(r.datos.mensaje, /no existe/);
    });

    test('un pedido que no existe da 404', async () => {
        const r = await pedir('/api/admin/pedidos/PED-0000-000/estado', {
            metodo: 'PATCH', como: 'admin', cuerpo: { estado: 'listo' },
        });

        assert.equal(r.estado, 404);
    });
});

describe('Fechas del tablero', () => {

    test('una fecha con texto raro se ignora, no rompe', async () => {
        const r = await pedir('/api/admin/metricas?desde=ayer&hasta=manana', { como: 'admin' });

        assert.equal(r.estado, 200);
        assert.equal(r.datos.metricas.rango.desde, null);
    });

    test('un intento de inyeccion sql se ignora', async () => {
        const r = await pedir(
            '/api/admin/metricas?desde=' + encodeURIComponent("2026-01-01'; DROP TABLE pedidos;--"),
            { como: 'admin' }
        );

        assert.equal(r.estado, 200);
        assert.equal(r.datos.metricas.rango.desde, null);

        const siguen = await pedir('/api/admin/pedidos', { como: 'admin' });

        assert.equal(siguen.estado, 200);
        assert.ok(siguen.datos.total > 0);
    });
});
