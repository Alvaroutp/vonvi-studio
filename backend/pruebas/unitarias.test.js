const { test, describe } = require('node:test');
const assert = require('node:assert');

const estadoServicio = require('../servicios/estadoServicio');
const pedidoServicio = require('../servicios/pedidoServicio');
const alertaServicio = require('../servicios/alertaServicio');
const metricaServicio = require('../servicios/metricaServicio');
const seguimientoServicio = require('../servicios/seguimientoServicio');

describe('Maquina de estados del pedido', () => {

    test('tiene las 8 fases en orden', () => {
        const codigos = estadoServicio.ESTADOS.map((e) => e.codigo);

        assert.deepEqual(codigos, [
            'recibido', 'diseno_enviado', 'por_aprobar', 'en_produccion',
            'control', 'listo', 'entregado', 'cancelado',
        ]);
    });

    test('desde recibido solo se puede ir a diseno enviado o cancelar', () => {
        assert.deepEqual(estadoServicio.SIGUIENTES.recibido, ['diseno_enviado', 'cancelado']);
    });

    test('en produccion ya no se puede cancelar', () => {
        assert.ok(!estadoServicio.SIGUIENTES.en_produccion.includes('cancelado'));
    });

    test('entregado y cancelado son el final del camino', () => {
        assert.deepEqual(estadoServicio.SIGUIENTES.entregado, []);
        assert.deepEqual(estadoServicio.SIGUIENTES.cancelado, []);
    });

    test('no hay fase que apunte a una fase que no existe', () => {
        const codigos = estadoServicio.ESTADOS.map((e) => e.codigo);

        for (const [origen, destinos] of Object.entries(estadoServicio.SIGUIENTES)) {
            assert.ok(codigos.includes(origen), origen + ' no esta en el catalogo');

            for (const d of destinos) {
                assert.ok(codigos.includes(d), origen + ' apunta a ' + d);
            }
        }
    });

    test('buscarEstado devuelve null si el codigo no existe', () => {
        assert.equal(estadoServicio.buscarEstado('inventado'), null);
        assert.equal(estadoServicio.buscarEstado('listo').orden, 6);
    });

    test('el catalogo no expone el nombre de las columnas de fecha', () => {
        assert.ok(estadoServicio.catalogo().every((e) => e.fecha === undefined));
    });

    test('decorar le pega nombre y color al pedido', () => {
        const d = estadoServicio.decorar({ codigo: 'PED-1', estado: 'control' });

        assert.equal(d.estado_nombre, 'Control de calidad');
        assert.equal(d.estado_orden, 5);
        assert.equal(d.estado_color, '#06b6d4');
    });
});

describe('Permisos sobre el pedido', () => {

    const enTaller = { estado: 'por_aprobar', estado_pago: 'pagado' };
    const enDiseno = { estado: 'recibido', estado_pago: 'pagado' };
    const sinPagar = { estado: 'por_aprobar', estado_pago: 'pendiente' };

    const admin = { rol: 'admin' };
    const empleado = { rol: 'empleado' };

    test('un pedido sin pagar no se mueve ni para el admin', () => {
        assert.deepEqual(estadoServicio.permitidosDe(sinPagar, admin), []);
    });

    test('el admin puede avanzar y cancelar', () => {
        assert.deepEqual(estadoServicio.permitidosDe(enTaller, admin),
            ['en_produccion', 'cancelado']);
    });

    test('el empleado puede avanzar pero no cancelar', () => {
        assert.deepEqual(estadoServicio.permitidosDe(enTaller, empleado), ['en_produccion']);
    });

    test('el empleado no toca un pedido que sigue en diseno', () => {
        assert.deepEqual(estadoServicio.permitidosDe(enDiseno, empleado), []);
        assert.deepEqual(estadoServicio.permitidosDe(enDiseno, admin),
            ['diseno_enviado', 'cancelado']);
    });
});

describe('Costo de envio', () => {

    test('recoger en tienda nunca cuesta', () => {
        assert.equal(pedidoServicio.envioDe('recojo', 10), 0);
        assert.equal(pedidoServicio.envioDe('recojo', 5000), 0);
    });

    test('delivery barato paga los 12 soles', () => {
        assert.equal(pedidoServicio.envioDe('delivery', 100), pedidoServicio.COSTO_ENVIO);
    });

    test('justo en 250 el envio ya sale gratis', () => {
        assert.equal(pedidoServicio.envioDe('delivery', pedidoServicio.ENVIO_GRATIS_DESDE), 0);
    });

    test('un sol menos y vuelve a cobrar', () => {
        assert.equal(
            pedidoServicio.envioDe('delivery', pedidoServicio.ENVIO_GRATIS_DESDE - 1),
            pedidoServicio.COSTO_ENVIO
        );
    });
});

describe('Fecha estimada de entrega', () => {

    test('nunca cae sabado ni domingo', () => {
        for (let dias = 1; dias <= 15; dias++) {
            const f = new Date(pedidoServicio.fechaEstimada(dias) + 'T12:00:00');

            assert.ok(f.getDay() !== 0 && f.getDay() !== 6,
                dias + ' dias cayo en fin de semana');
        }
    });

    test('siempre es despues de hoy', () => {
        const hoy = new Date().toISOString().slice(0, 10);

        assert.ok(pedidoServicio.fechaEstimada(1) > hoy);
    });
});

describe('Opciones del producto en texto', () => {

    test('sin opciones devuelve null', () => {
        assert.equal(pedidoServicio.opcionesEnTexto({ opciones: [] }), null);
        assert.equal(pedidoServicio.opcionesEnTexto({}), null);
    });

    test('las junta separadas por coma', () => {
        const texto = pedidoServicio.opcionesEnTexto({
            opciones: [
                { atributo: 'Talla', valor: 'M' },
                { atributo: 'Color', valor: 'Negro' },
            ],
        });

        assert.equal(texto, 'Talla: M, Color: Negro');
    });

    test('ida y vuelta: lo que arma se puede volver a leer', () => {
        const original = [{ atributo: 'Talla', valor: 'M' }, { atributo: 'Color', valor: 'Negro' }];
        const texto = pedidoServicio.opcionesEnTexto({ opciones: original });

        assert.deepEqual(seguimientoServicio.opcionesEnLista(texto), original);
    });
});

describe('Aviso de stock bajo', () => {

    test('sin unidades es agotado', () => {
        const a = alertaServicio.clasificar({ stock: 0, cantidad_minima: 10 });

        assert.equal(a.nivel, 'agotado');
    });

    test('menos que el pedido minimo es critico', () => {
        const a = alertaServicio.clasificar({ stock: 4, cantidad_minima: 10 });

        assert.equal(a.nivel, 'critico');
    });

    test('justo el minimo ya no es critico', () => {
        const a = alertaServicio.clasificar({ stock: 10, cantidad_minima: 10 });

        assert.equal(a.nivel, 'bajo');
    });

    test('dice para cuantos pedidos alcanza', () => {
        const a = alertaServicio.clasificar({ stock: 25, cantidad_minima: 10 });

        assert.match(a.detalle, /2 pedido/);
    });
});

describe('Fechas del tablero', () => {

    test('acepta el formato aaaa-mm-dd', () => {
        assert.equal(metricaServicio.fecha('2026-03-15'), '2026-03-15');
    });

    test('bota cualquier otra cosa', () => {
        for (const malo of ['15/03/2026', 'ayer', '2026-3-5', '', null, undefined, '2026-03-15; DROP']) {
            assert.equal(metricaServicio.fecha(malo), null, 'paso: ' + malo);
        }
    });
});

describe('Barras del tablero', () => {

    test('siempre devuelve las 8 fases aunque la consulta traiga una', () => {
        const barras = metricaServicio.barras([{ estado: 'listo', total: '3' }]);

        assert.equal(barras.length, 8);
        assert.equal(barras.find((b) => b.codigo === 'listo').total, 3);
        assert.equal(barras.find((b) => b.codigo === 'recibido').total, 0);
    });

    test('sin pedidos todas quedan en cero y no en vacio', () => {
        assert.ok(metricaServicio.barras([]).every((b) => b.total === 0));
    });

    test('convierte a numero lo que mysql devuelve como texto', () => {
        const r = metricaServicio.enNumero({
            pedidos_total: '12', ventas_cobradas: '980.50',
            por_cobrar: '0', pedidos_hoy: '2',
        });

        assert.strictEqual(r.pedidos_total, 12);
        assert.strictEqual(r.ventas_cobradas, 980.5);
    });
});

describe('Datos de entrega', () => {

    test('exige elegir recojo o delivery', () => {
        assert.throws(() => pedidoServicio.revisarDatos({ telefonoContacto: '987654321' }),
            /recoges/);
    });

    test('exige un celular de verdad', () => {
        assert.throws(() => pedidoServicio.revisarDatos({
            tipoEntrega: 'recojo', telefonoContacto: '123',
        }), /celular/);
    });
});

describe('Datos del pago', () => {

    test('exige elegir el metodo', () => {
        assert.throws(() => pedidoServicio.revisarPago({ metodo: 'trueque' }), /pagar/);
    });

    test('yape y transferencia no piden tarjeta', () => {
        assert.deepEqual(pedidoServicio.revisarPago({ metodo: 'yape' }),
            { metodo: 'yape', ultimos4: null });
    });

    test('la tarjeta pide titular', () => {
        assert.throws(() => pedidoServicio.revisarPago({
            metodo: 'tarjeta', titular: 'Ana', numeroTarjeta: '4111111111111111',
        }), /titular/);
    });

    test('rechaza una tarjeta corta', () => {
        assert.throws(() => pedidoServicio.revisarPago({
            metodo: 'tarjeta', titular: 'Ana Quispe', numeroTarjeta: '4111 1111',
        }), /no es valido|no es válido/);
    });

    test('guarda solo los ultimos 4 digitos', () => {
        const p = pedidoServicio.revisarPago({
            metodo: 'tarjeta', titular: 'Ana Quispe', numeroTarjeta: '4111 1111 1111 1234',
        });

        assert.equal(p.ultimos4, '1234');
        assert.equal(JSON.stringify(p).includes('4111'), false);
    });
});
