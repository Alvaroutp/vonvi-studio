const seguimientoDAO = require('../dao/seguimientoDAO');
const estadoServicio = require('./estadoServicio');


// Lo que ve el cliente de su pedido: la linea de tiempo, sus productos
// y el boton de cancelar. Sin req, sin res y sin SQL.


// El mismo estado se le explica distinto al cliente que al taller. En
// el panel dice "control"; aqui dice que estamos revisando su pedido
const EXPLICACION = {
    recibido: 'Recibimos tu pedido y entró a la cola de producción',
    diseno_enviado: 'Te enviamos la prueba de tu diseño para que la revises',
    por_aprobar: 'Esperamos tu visto bueno para empezar a fabricar',
    en_produccion: 'Estamos fabricando tu pedido',
    control: 'Revisamos que todo haya salido perfecto',
    listo: 'Tu pedido está listo para recoger o para salir',
    entregado: 'Tu pedido ya está contigo',
};


// Hasta que paso puede cancelar el cliente. Cuatro es "en produccion":
// de ahi para adelante ya se gasto material
const HASTA_PARA_CANCELAR = 4;


class ErrorSeguimiento extends Error {
    constructor(mensaje, codigo = 400) {
        super(mensaje);
        this.codigo = codigo;
    }
}


function estadoDe(codigo) {
    return estadoServicio.ESTADOS.find((e) => e.codigo === codigo) || estadoServicio.ESTADOS[0];
}


// Las opciones se guardaron como "Talla: M, Color: Blanco" para que el
// pinta como pastillas, asi que aqui se vuelven a separar

function opcionesEnLista(texto) {
    if (!texto) return [];


    return texto.split(', ').map((parte) => {
        const corte = parte.indexOf(': ');
        if (corte < 0) return { atributo: '', valor: parte };
        return { atributo: parte.slice(0, corte), valor: parte.slice(corte + 2) };
    });
}


function armarLinea(fila) {
    return {
        ...fila,
        opciones: opcionesEnLista(fila.opciones),
        estampa_url: fila.archivo ? 'img/disenos/' + fila.archivo : null,
        estampa_nombre: fila.archivo ? 'Tu diseño' : null,
    };
}


// La linea de tiempo. Se recorre el catalogo entero y no solo los pasos
function construirLinea(pedido, pasos) {
    const actual = estadoDe(pedido.estado);


    // El primer paso no lo escribe nadie: el pedido nace ya recibido
    const porEstado = { recibido: { creado_en: pedido.fecha_recibido || pedido.creado_en } };
    for (const p of pasos) porEstado[p.estado] = p;


    return estadoServicio.ESTADOS
        .filter((e) => e.codigo !== 'cancelado')
        .map((e) => {
            const paso = porEstado[e.codigo];


            return {
                codigo: e.codigo,
                nombre: e.nombre,
                color_hex: e.color_hex,
                descripcion: EXPLICACION[e.codigo] || '',
                alcanzado: e.orden <= actual.orden,
                actual: e.orden === actual.orden,
                fecha: paso ? paso.creado_en : null,
                comentario: paso ? paso.comentario || null : null,
            };
        });
}


// Lo poco que necesita una tarjeta de la lista. No pide nada mas a la
function decorarFila(pedido) {
    const e = estadoDe(pedido.estado);

    return {
        ...pedido,
        estado_nombre: e.nombre,
        estado_color: e.color_hex,
        estado_orden: e.orden,
        cancelado: pedido.estado === 'cancelado',
    };
}


// El pedido completo tal como lo pinta la pantalla del cliente
async function decorar(pedido) {
    const [lineas, pasos] = await Promise.all([
        seguimientoDAO.lineas(pedido.id),
        seguimientoDAO.pasos(pedido.id),
    ]);


    const e = estadoDe(pedido.estado);
    const cancelado = pedido.estado === 'cancelado';


    return {
        ...decorarFila(pedido),
        // La base las llama asi, pero la pantalla espera estos nombres
        direccion_entrega: pedido.direccion,
        costo_envio: pedido.envio,
        items: lineas.map(armarLinea),
        seguimiento: cancelado ? [] : construirLinea(pedido, pasos),
        puede_cancelar: !cancelado && e.orden < HASTA_PARA_CANCELAR,
        pagos: pedido.referencia_pago
            ? [{
                metodo: pedido.metodo_pago,
                referencia: pedido.referencia_pago,
                ultimos4: pedido.ultimos4,
            }]
            : [],
    };
}


async function suyo(usuario, codigo) {
    const pedido = await seguimientoDAO.buscarDeCliente(codigo, usuario.id);

    if (!pedido) throw new ErrorSeguimiento('No encontramos ese pedido', 404);

    return pedido;
}


async function detalle(usuario, codigo) {
    return decorar(await suyo(usuario, codigo));
}


// Cancelar es un cambio de estado mas, asi que no se reescriben las
// reglas: se comprueba que el pedido sea de quien pregunta y despues
// manda la misma maquina de estados que usa el panel. Si manana se
// cambia hasta donde se puede cancelar, se cambia en un solo sitio
async function cancelar(usuario, codigo) {
    const pedido = await suyo(usuario, codigo);

    if (pedido.estado === 'cancelado') {
        throw new ErrorSeguimiento('Ese pedido ya estaba cancelado');
    }

    if (estadoDe(pedido.estado).orden >= HASTA_PARA_CANCELAR) {
        throw new ErrorSeguimiento(
            'Tu pedido ya entró a producción. Escríbenos por WhatsApp y lo vemos', 409
        );
    }


    await estadoServicio.cambiar(usuario, codigo, 'cancelado', 'Cancelado por el cliente');

    return detalle(usuario, codigo);
}


module.exports = {
ErrorSeguimiento,
    opcionesEnLista,
    decorar,
    decorarFila,
    detalle,
    cancelar,
    suyo,
};