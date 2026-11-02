const config = require('../config');

const BASE = 'http://localhost:' + (config.puerto || process.env.PORT || 3000);

const CUENTAS = {
    admin: { email: 'admin@vonvi.pe', password: 'Vonvi2026' },
    empleado: { email: 'kelvin@vonvi.pe', password: 'Vonvi2026' },
    empleado2: { email: 'ivonne@vonvi.pe', password: 'Vonvi2026' },
    cliente: { email: 'maria@example.com', password: 'Vonvi2026' },
    proveedor: { email: 'mario@textileslima.pe', password: 'Vonvi2026' },
};

const sesiones = {};

async function llamar(ruta, opciones, token) {
    const cabeceras = { 'Content-Type': 'application/json' };

    if (token) cabeceras.Authorization = 'Bearer ' + token;

    const r = await fetch(BASE + ruta, {
        method: opciones.metodo || 'GET',
        headers: cabeceras,
        body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
    });

    let datos = null;

    try { datos = await r.json(); } catch (e) { datos = null; }

    return { estado: r.status, datos };
}

async function entrar(quien) {
    const cuenta = CUENTAS[quien];

    if (!cuenta) throw new Error('No conozco la cuenta "' + quien + '"');

    const r = await llamar('/api/auth/login', { metodo: 'POST', cuerpo: cuenta }, null);

    if (r.estado !== 200) {
        throw new Error(
            'No se pudo entrar como ' + quien + ' (' + r.estado + '). ' +
            'Carga backend/sql/datos.sql antes de probar.'
        );
    }

    sesiones[quien] = r.datos.token;

    return r.datos.token;
}

async function sesionDe(quien, renovar) {
    if (renovar || !sesiones[quien]) return entrar(quien);

    return sesiones[quien];
}

async function pedir(ruta, opciones = {}) {
    if (!opciones.como) return llamar(ruta, opciones, opciones.token);

    const r = await llamar(ruta, opciones, await sesionDe(opciones.como));

    if (r.estado !== 401) return r;

    return llamar(ruta, opciones, await sesionDe(opciones.como, true));
}

async function exigirServidor() {
    try {
        await fetch(BASE + '/api/categorias');
    } catch (e) {
        throw new Error(
            'El servidor no responde en ' + BASE + '. ' +
            'Abre otra consola, entra a backend y ejecuta: node servidor.js'
        );
    }
}

module.exports = { BASE, CUENTAS, pedir, entrar, sesionDe, exigirServidor };
