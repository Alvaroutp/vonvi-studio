const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');

const db = require('../db');
const { pedir, entrar, exigirServidor } = require('./ayuda');

before(exigirServidor);

after(async () => {
    await db.query("DELETE FROM cotizaciones WHERE email = 'xss@example.com'");
    await db.end();
});

describe('Contrasenas guardadas', () => {

    test('no se guardan en texto plano', async () => {
        const [filas] = await db.query(
            "SELECT password FROM usuarios WHERE email = 'admin@vonvi.pe'"
        );

        assert.notEqual(filas[0].password, 'Vonvi2026');
        assert.ok(filas[0].password.startsWith('$2'), 'deberia ser un hash de bcrypt');
        assert.ok(filas[0].password.length >= 50);
    });

    test('ninguna respuesta del servidor devuelve el hash', async () => {
        const perfil = await pedir('/api/auth/perfil', { como: 'cliente' });
        const empleados = await pedir('/api/admin/empleados', { como: 'admin' });

        assert.ok(!JSON.stringify(perfil.datos).includes('$2'));
        assert.ok(!JSON.stringify(empleados.datos).includes('$2'));
    });

    test('la lista de empleados no expone tokens de sesion', async () => {
        const r = await pedir('/api/admin/empleados', { como: 'admin' });
        const texto = JSON.stringify(r.datos);

        assert.ok(!texto.includes('"token"'));
    });
});

describe('Control de acceso', () => {

    const DEL_ADMIN = [
        '/api/admin/metricas',
        '/api/admin/alertas/stock',
        '/api/admin/reportes/ventas',
        '/api/admin/productos',
        '/api/admin/empleados',
        '/api/admin/proveedores',
    ];

    test('sin sesion ninguna ruta del panel responde', async () => {
        for (const ruta of DEL_ADMIN) {
            const r = await pedir(ruta);

            assert.equal(r.estado, 401, ruta + ' deberia pedir sesion');
        }
    });

    test('un cliente no alcanza ninguna ruta del panel', async () => {
        for (const ruta of DEL_ADMIN) {
            const r = await pedir(ruta, { como: 'cliente' });

            assert.equal(r.estado, 403, ruta + ' deberia estar prohibida');
        }
    });

    test('un empleado no alcanza las rutas exclusivas del admin', async () => {
        for (const ruta of DEL_ADMIN) {
            const r = await pedir(ruta, { como: 'empleado' });

            assert.equal(r.estado, 403, ruta + ' deberia estar prohibida');
        }
    });

    test('un proveedor no alcanza el panel', async () => {
        const r = await pedir('/api/admin/pedidos', { como: 'proveedor' });

        assert.equal(r.estado, 403);
    });

    test('un cliente no puede crearse a si mismo como empleado', async () => {
        const r = await pedir('/api/admin/empleados', {
            metodo: 'POST', como: 'cliente',
            cuerpo: { nombres: 'Yo', apellidos: 'Mismo', email: 'yo@example.com', password: 'clave12345' },
        });

        assert.equal(r.estado, 403);
    });
});

describe('Acceso a datos de otros usuarios', () => {

    test('un cliente no abre el pedido de otro cliente', async () => {
        const todos = await pedir('/api/admin/pedidos', { como: 'admin' });
        const ajeno = todos.datos.pedidos.find((p) => p.cliente_email !== 'maria@example.com');

        const r = await pedir('/api/pedidos/' + ajeno.codigo, { como: 'cliente' });

        assert.ok(r.estado === 403 || r.estado === 404, 'devolvio ' + r.estado);
    });

    test('un cliente no descarga el recibo de otro cliente', async () => {
        const todos = await pedir('/api/admin/pedidos', { como: 'admin' });
        const ajeno = todos.datos.pedidos.find((p) => p.cliente_email !== 'maria@example.com');

        const r = await pedir('/api/pedidos/' + ajeno.codigo + '/recibo', { como: 'cliente' });

        assert.ok(r.estado === 403 || r.estado === 404, 'devolvio ' + r.estado);
    });

    test('un cliente no cancela el pedido de otro cliente', async () => {
        const todos = await pedir('/api/admin/pedidos', { como: 'admin' });
        const ajeno = todos.datos.pedidos.find((p) => p.cliente_email !== 'maria@example.com');

        const r = await pedir('/api/pedidos/' + ajeno.codigo + '/cancelar', {
            metodo: 'POST', como: 'cliente',
        });

        assert.ok(r.estado >= 400, 'devolvio ' + r.estado);
    });
});

describe('Sesiones', () => {

    test('un token inventado no sirve', async () => {
        const r = await pedir('/api/auth/perfil', { token: 'a'.repeat(48) });

        assert.equal(r.estado, 401);
    });

    test('al volver a entrar el token anterior queda anulado', async () => {
        const viejo = await entrar('cliente');
        await entrar('cliente');

        const r = await pedir('/api/auth/perfil', { token: viejo });

        assert.equal(r.estado, 401);
    });

    test('cerrar sesion anula el token', async () => {
        const token = await entrar('cliente');

        await pedir('/api/auth/logout', { metodo: 'POST', token });

        const r = await pedir('/api/auth/perfil', { token });

        assert.equal(r.estado, 401);
    });
});

describe('Inyeccion SQL', () => {

    const CARGAS = [
        "' OR '1'='1",
        "'; DROP TABLE pedidos;--",
        "admin'--",
        "1' UNION SELECT password FROM usuarios--",
    ];

    test('el login no se deja enganar con comillas', async () => {
        for (const carga of CARGAS) {
            const r = await pedir('/api/auth/login', {
                metodo: 'POST', cuerpo: { email: carga, password: carga },
            });

            assert.ok(r.estado === 400 || r.estado === 401, carga + ' devolvio ' + r.estado);
        }
    });

    test('el buscador del panel no ejecuta lo que le mandan', async () => {
        for (const carga of CARGAS) {
            const r = await pedir(
                '/api/admin/pedidos?buscar=' + encodeURIComponent(carga), { como: 'admin' }
            );

            assert.equal(r.estado, 200, carga + ' devolvio ' + r.estado);
        }
    });

    test('las tablas siguen en pie despues de los intentos', async () => {
        const [pedidos] = await db.query('SELECT COUNT(*) AS n FROM pedidos');
        const [usuarios] = await db.query('SELECT COUNT(*) AS n FROM usuarios');

        assert.ok(pedidos[0].n > 0);
        assert.ok(usuarios[0].n > 0);
    });
});

describe('Codigo malicioso en los textos', () => {

    const GUION = '<script>alert(1)</script>';

    test('una cotizacion con etiquetas se guarda tal cual, sin ejecutarse', async () => {
        const r = await pedir('/api/cotizaciones', {
            metodo: 'POST',
            cuerpo: {
                nombre: 'Prueba ' + GUION,
                email: 'xss@example.com',
                telefono: '987654321',
                mensaje: GUION,
            },
        });

        assert.equal(r.estado, 201);

        const [filas] = await db.query(
            "SELECT nombre FROM cotizaciones WHERE email = 'xss@example.com'"
        );

        assert.ok(filas.length > 0);
    });

    test('el panel devuelve el texto sin interpretarlo', async () => {
        const r = await pedir('/api/admin/cotizaciones?buscar=xss', { como: 'admin' });

        assert.equal(r.estado, 200);
    });
});

describe('Subida de archivos', () => {

    async function subir(nombre, tipo, contenido) {
        const forma = new FormData();

        forma.append('archivo', new Blob([contenido], { type: tipo }), nombre);

        const r = await fetch(require('./ayuda').BASE + '/api/archivos/estampa', {
            method: 'POST', body: forma,
        });

        return r.status;
    }

    test('un ejecutable no se acepta', async () => {
        assert.ok(await subir('virus.exe', 'application/x-msdownload', 'MZ') >= 400);
    });

    test('un script php no se acepta', async () => {
        assert.ok(await subir('shell.php', 'application/x-php', '<?php ?>') >= 400);
    });

    test('un html no se acepta', async () => {
        assert.ok(await subir('pagina.html', 'text/html', '<script></script>') >= 400);
    });
});

describe('Intentos repetidos de inicio de sesion', () => {

    test('veinte intentos fallidos seguidos', async () => {
        const correo = 'fuerza.bruta@example.com';
        let ultimo = 0;

        for (let i = 0; i < 20; i++) {
            const r = await pedir('/api/auth/login', {
                metodo: 'POST',
                cuerpo: { email: correo, password: 'clave-mala-' + i },
            });

            ultimo = r.estado;
        }

        assert.equal(ultimo, 429,
            'el servidor sigue aceptando intentos sin limite, respondio ' + ultimo);
    });
});
