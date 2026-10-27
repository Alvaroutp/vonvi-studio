const seguimientoDAO = require('../dao/seguimientoDAO');
const seguimientoServicio = require('./seguimientoServicio');


const IGV = 0.18;

const EMISOR = {
    nombre: 'Vonvi Studio Perú',
    direccion: 'Chorrillos, ref. Parque Belén - Lima, Perú',
    telefono: '+51 907 100 820',
    email: 'vonvistudioperu@gmail.com',
};


class ErrorRecibo extends Error {
    constructor(mensaje, codigo = 400){
        super(mensaje);
        this.codigo = codigo;
   }
}

function separarIgv(total) {
    const gravado = Number((total / (1 + IGV)).toFixed(2));

    return {
        gravado,
        igv: Number((total - gravado).toFixed(2)),
        total: Number(total.toFixed(2)),
    };
}

async function recibo(usuario, codigo) {
    const pedido = await seguimientoServicio.suyo(usuario, codigo);

    if (pedido.estado_pago !== 'pagado') {
        throw new ErrorRecibo('Este pedido todavía no está pagado', 409);
}

    const lineas = await seguimientoDAO.lineas(pedido.id);

    return {
        numero: pedido.codigo,
        emitido_en: pedido.creado_en,
        emisor: EMISOR,

        cliente: {
            nombre: pedido.nombre_contacto,
            email: pedido.email_contacto,
            telefono: pedido.telefono_contacto,
        },

    entrega: {
        tipo: pedido.tipo_entrega,
        direccion: pedido.direccion,
        distrito: pedido.distrito,
        provincia: pedido.provincia,
        departamento: pedido.departamento,
    },

    lineas: lineas.map((l) => ({
        descripcion: l.nombre_producto,
        detalle: seguimientoServicio.opcionesEnLista(l.opciones),
        cantidad: l.cantidad,
        precio_unitario: Number(l.precio_unitario),
        subtotal: Number(l.subtotal),
    })),

    envio: Number(pedido.envio),
        montos: separarIgv(Number(pedido.total)),

    pago: {
        metodo: pedido.metodo_pago,
        referencia: pedido.referencia_pago,
        ultimos4: pedido.ultimos4,
    },
};
}


module.exports = {
    recibo,
};