const { BASE, pedir, entrar, exigirServidor } = require('./ayuda');

const REPETICIONES = 100;
const CALENTAMIENTO = 3;
const SIMULTANEAS = 100;

const LIMITE_VERDE = 300;
const LIMITE_AMBAR = 1000;

function resumir(tiempos) {
    const orden = [...tiempos].sort((a, b) => a - b);
    const suma = orden.reduce((t, n) => t + n, 0);

    return {
        min: orden[0],
        media: suma / orden.length,
        p95: orden[Math.min(orden.length - 1, Math.ceil(orden.length * 0.95) - 1)],
        max: orden[orden.length - 1],
    };
}

function veredicto(media) {
    if (media < LIMITE_VERDE) return 'bien';
    if (media < LIMITE_AMBAR) return 'aceptable';
    return 'lento';
}

async function medir(ruta, token) {
    for (let i = 0; i < CALENTAMIENTO; i++) await pedir(ruta, { token });

    const tiempos = [];
    let fallos = 0;

    for (let i = 0; i < REPETICIONES; i++) {
        const inicio = process.hrtime.bigint();
        const r = await pedir(ruta, { token });
        const fin = process.hrtime.bigint();

        if (r.estado >= 400) fallos++;

        tiempos.push(Number(fin - inicio) / 1e6);
    }

    return { ...resumir(tiempos), fallos };
}

async function todasALaVez(rutas) {
    const llamadas = Array.from({ length: SIMULTANEAS }, (sinUso, i) => rutas[i % rutas.length]);

    const inicio = process.hrtime.bigint();

    const salidas = await Promise.all(llamadas.map(async ([nombre, ruta, token]) => {
        const uno = process.hrtime.bigint();
        const r = await pedir(ruta, { token });
        return { ms: Number(process.hrtime.bigint() - uno) / 1e6, estado: r.estado };
    }));

    const total = Number(process.hrtime.bigint() - inicio) / 1e6;

    return {
        ...resumir(salidas.map((x) => x.ms)),
        total,
        fallos: salidas.filter((x) => x.estado >= 400).length,
        porSegundo: (SIMULTANEAS / total) * 1000,
    };
}

function fila(nombre, r) {
    return [
        nombre.padEnd(34),
        (r.min.toFixed(1) + ' ms').padStart(11),
        (r.media.toFixed(1) + ' ms').padStart(11),
        (r.p95.toFixed(1) + ' ms').padStart(11),
        (r.max.toFixed(1) + ' ms').padStart(11),
        '  ' + veredicto(r.media),
    ].join('');
}

async function main() {
    await exigirServidor();

    const admin = await entrar('admin');
    const empleado = await entrar('empleado');

    console.log('');
    console.log('  PRUEBA DE RENDIMIENTO - Vonvi Studio Peru');
    console.log('  ' + BASE + '   ' + REPETICIONES + ' llamadas por ruta');
    console.log('');
    console.log('  ' + 'Ruta'.padEnd(34) + 'minimo'.padStart(11) +
        'promedio'.padStart(11) + 'p95'.padStart(11) + 'maximo'.padStart(11) + '  estado');
    console.log('  ' + '-'.repeat(91));

    const rutas = [
        ['Catalogo de categorias', '/api/categorias', null],
        ['Ficha de un producto', '/api/productos/taza-ceramica-11-oz', null],
        ['Buscador de productos', '/api/productos?buscar=polo', null],
        ['Tablero del admin', '/api/admin/metricas', admin],
        ['Tablero filtrado por ano', '/api/admin/metricas?desde=2026-01-01&hasta=2026-12-31', admin],
        ['Lista de pedidos (20 por pagina)', '/api/admin/pedidos', admin],
        ['Lista de pedidos pagina 5', '/api/admin/pedidos?pagina=5', admin],
        ['Buscar un pedido por texto', '/api/admin/pedidos?buscar=maria', admin],
        ['Detalle de un pedido', '/api/admin/pedidos/PED-2026-100', admin],
        ['Taller del empleado', '/api/admin/pedidos', empleado],
        ['Alertas de stock', '/api/admin/alertas/stock', admin],
        ['Cotizaciones del panel', '/api/admin/cotizaciones', admin],
    ];

    const resultados = [];

    for (const [nombre, ruta, token] of rutas) {
        const r = await medir(ruta, token);

        resultados.push([nombre, r]);
        console.log('  ' + fila(nombre, r) + (r.fallos ? '   (' + r.fallos + ' fallos)' : ''));
    }

    console.log('');
    console.log('  AGUANTE: ' + SIMULTANEAS + ' peticiones al mismo tiempo, repartidas entre las ' +
        rutas.length + ' rutas');
    console.log('  ' + '-'.repeat(91));

    const juntas = await todasALaVez(rutas);

    console.log('  ' + fila('Todas a la vez', juntas));
    console.log('  Las ' + SIMULTANEAS + ' atendidas en ' + juntas.total.toFixed(0) + ' ms' +
        '   ~' + juntas.porSegundo.toFixed(0) + ' respuestas por segundo' +
        '   fallos: ' + juntas.fallos);

    const lentas = resultados.filter(([, r]) => r.media >= LIMITE_VERDE);

    console.log('');
    console.log('  CONCLUSION');
    console.log('  ' + '-'.repeat(91));

    if (lentas.length === 0) {
        console.log('  Todas las rutas respondieron por debajo de ' + LIMITE_VERDE + ' ms de promedio.');
    } else {
        console.log('  Rutas que pasan de ' + LIMITE_VERDE + ' ms y conviene revisar:');
        for (const [nombre, r] of lentas) {
            console.log('   - ' + nombre + ': ' + r.media.toFixed(0) + ' ms de promedio');
        }
    }

    console.log('');
}

main().catch((e) => {
    console.error('');
    console.error('  ' + e.message);
    console.error('');
    process.exit(1);
});
