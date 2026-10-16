const adminPedidoDAO = require('../dao/adminPedidoDAO');


// La maquina de estados del pedido. Todo lo que se puede y no se puede
// hacer esta en las dos tablas de abajo, no repartido en ifs.


// El catalogo. El orden es el de la cadena de fabricacion y es lo que
// usa la pantalla para pintar la insignia de color
const ESTADOS = [
    { id: 1, codigo: 'recibido', nombre: 'Recibido', orden: 1,
      color_hex: '#6b7280', fecha: 'fecha_recibido' },

    { id: 2, codigo: 'diseno_enviado', nombre: 'Diseño enviado', orden: 2,
      color_hex: '#3b82f6', fecha: 'fecha_diseno' },

    { id: 3, codigo: 'por_aprobar', nombre: 'Por aprobar', orden: 3,
      color_hex: '#f59e0b', fecha: 'fecha_aprobacion' },

    { id: 4, codigo: 'en_produccion', nombre: 'En producción', orden: 4,
      color_hex: '#8b5cf6', fecha: 'fecha_produccion' },

    { id: 5, codigo: 'control', nombre: 'Control de calidad', orden: 5,
      color_hex: '#06b6d4', fecha: 'fecha_control' },

    { id: 6, codigo: 'listo', nombre: 'Listo', orden: 6,
      color_hex: '#1d4ed8', fecha: 'fecha_listo' },

    { id: 7, codigo: 'entregado', nombre: 'Entregado', orden: 7,
      color_hex: '#15803d', fecha: 'fecha_entregado' },

    { id: 8, codigo: 'cancelado', nombre: 'Cancelado', orden: 8,
      color_hex: '#dc2626', fecha: null },
];


// A donde puede ir cada estado. Lo que no esta en la lista no se puede:
// no se salta pasos, no se vuelve atras, y cancelar solo se permite
// mientras no haya empezado la produccion
const SIGUIENTES = {
    recibido: ['diseno_enviado', 'cancelado'],
    diseno_enviado: ['por_aprobar', 'cancelado'],
    por_aprobar: ['en_produccion', 'cancelado'],
    en_produccion: ['control'],
    control: ['listo'],
    listo: ['entregado'],
    entregado: [],
    cancelado: [],
};


const POR_PAGINA = 20;


class ErrorEstado extends Error {
    constructor(mensaje, codigo = 400) {
        super(mensaje);
        this.codigo = codigo;
    }
}


function buscarEstado(codigo) {
    return ESTADOS.find((e) => e.codigo === codigo) || null;
}


// Lo que ve la pantalla: sin el nombre de la columna de fecha, que es
// cosa interna de la base
function catalogo() {
    return ESTADOS.map(({ fecha, ...resto }) => resto);
}


// Le pega al pedido el nombre y el color de su estado
function decorar(pedido) {
    const e = buscarEstado(pedido.estado) || ESTADOS[0];

    return {
        ...pedido,
        estado_id: e.id,
        estado_orden: e.orden,
        estado_nombre: e.nombre,
        estado_color: e.color_hex,
    };
}


// Las opciones se guardaron como "Talla: M, Color: Blanco" para que el
// pedido se pueda leer aunque borren ese color. Aqui se vuelven a
// separar porque la pantalla las pinta como pastillas
function opcionesEnLista(texto) {
    if (!texto) return [];

    return texto.split(', ').map((parte) => {
        const corte = parte.indexOf(': ');
        if (corte < 0) return { atributo: '', valor: parte };
        return { atributo: parte.slice(0, corte), valor: parte.slice(corte + 2) };
    });
}


function armarItem(fila) {
    return {
        ...fila,
        opciones: opcionesEnLista(fila.opciones),
        estampa_url: fila.archivo ? 'img/disenos/' + fila.archivo : null,
        estampa_nombre: fila.archivo ? 'Diseño del cliente' : null,
    };
}


// El pedido nace en "recibido" pero esa primera fila no la escribe
// nadie, asi que se arma con la fecha que guardo el pedido
function armarHistorial(pedido, filas) {
    const lista = filas.map((h) => {
        const e = buscarEstado(h.estado) || ESTADOS[0];
        return { ...h, nombre: e.nombre, color_hex: e.color_hex };
    });

    if (!lista.some((h) => h.estado === 'recibido')) {
        lista.unshift({
            estado: 'recibido',
            comentario: null,
            creado_en: pedido.fecha_recibido || pedido.creado_en,
            nombre: ESTADOS[0].nombre,
            color_hex: ESTADOS[0].color_hex,
        });
    }

    return lista;
}


async function listar(filtros) {
    const pagina = Math.max(1, Number(filtros.pagina) || 1);

    const total = await adminPedidoDAO.contar(filtros);
    const filas = await adminPedidoDAO.listar(filtros, POR_PAGINA, (pagina - 1) * POR_PAGINA);

    return {
        pedidos: filas.map(decorar),
        total,
        pagina,
        paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    };
}


async function uno(codigo) {
    const pedido = await adminPedidoDAO.buscarPorCodigo(codigo);

    if (!pedido) throw new ErrorEstado('No encontramos ese pedido', 404);

    const filas = await adminPedidoDAO.items(pedido.id);

    return {
        ...decorar(pedido),
        direccion_entrega: pedido.direccion,
        costo_envio: pedido.envio,
        items: filas.map(armarItem),
        historial: armarHistorial(pedido, await adminPedidoDAO.historial(pedido.id)),
        pagos: pedido.referencia_pago
            ? [{ metodo: pedido.metodo_pago, referencia: pedido.referencia_pago }]
            : [],
    };
}


async function cambiar(usuario, codigo, nuevo, comentario) {
    const pedido = await adminPedidoDAO.buscarPorCodigo(codigo);

    if (!pedido) throw new ErrorEstado('No encontramos ese pedido', 404);

    const destino = buscarEstado(nuevo);

    if (!destino) throw new ErrorEstado('Ese estado no existe');

    if (pedido.estado === nuevo) {
        throw new ErrorEstado(`El pedido ya está en "${destino.nombre}"`);
    }

    // Aqui manda la maquina de estados, no el que apreto el boton
    const permitidos = SIGUIENTES[pedido.estado] || [];

    if (!permitidos.includes(nuevo)) {
        const actual = buscarEstado(pedido.estado);

        if (permitidos.length === 0) {
            throw new ErrorEstado(`Un pedido en "${actual.nombre}" ya no se puede mover`);
        }

        const nombres = permitidos.map((c) => buscarEstado(c).nombre).join(' o ');

        throw new ErrorEstado(
            `Desde "${actual.nombre}" solo puedes pasar a ${nombres}`
        );
    }

    const texto = (comentario || '').trim().slice(0, 300) || null;
    const lineas = nuevo === 'cancelado' ? await adminPedidoDAO.items(pedido.id) : [];

    await adminPedidoDAO.transaccion(async (cx) => {
        const cambiadas = await adminPedidoDAO.cambiarEstado(
            cx, pedido.id, pedido.estado, nuevo, destino.fecha
        );

        if (cambiadas === 0) {
            throw new ErrorEstado('Otra persona movió este pedido. Vuelve a cargarlo', 409);
        }

        await adminPedidoDAO.agregarHistorial(cx, pedido.id, nuevo, texto, usuario.id);

        // Si se cancela algo que ya estaba pagado, el stock que se bajo
        // al cobrar tiene que volver
        if (nuevo === 'cancelado' && pedido.estado_pago === 'pagado') {
            for (const linea of lineas) {
                if (linea.producto_id) {
                    await adminPedidoDAO.devolverStock(cx, linea.producto_id, linea.cantidad);
                }
            }
        }
    });

    return uno(codigo);
}


module.exports = {
    ErrorEstado,
    ESTADOS,
    SIGUIENTES,
    catalogo,
    decorar,
    listar,
    uno,
    cambiar,
};
