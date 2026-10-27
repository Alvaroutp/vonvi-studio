const crypto = require('crypto');

const pedidoDAO = require('../dao/pedidoDAO');
const carritoServicio = require('./carritoServicio');
const seguimientoServicio = require('./seguimientoServicio');


const ENTREGAS = ['recojo', 'delivery'];
const PAGOS = ['tarjeta', 'transferencia', 'yape', 'plin'];

const COSTO_ENVIO = 12;
const ENVIO_GRATIS_DESDE = 250;

const SEGUNDOS_DOBLE_CLIC = 60;


class ErrorPedido extends Error {
    constructor(mensaje, codigo = 400) {
        super(mensaje);
        this.codigo = codigo;
    }
}


function envioDe(tipoEntrega, subtotal) {
    if (tipoEntrega === 'recojo') return 0;
    return subtotal >= ENVIO_GRATIS_DESDE ? 0 : COSTO_ENVIO;
}


function fechaEstimada(dias) {
    const fecha = new Date();
    let faltan = dias;

    while (faltan > 0) {
        fecha.setDate(fecha.getDate() + 1);
        const dia = fecha.getDay();
        if (dia !== 0 && dia !== 6) faltan--;
    }

    return fecha.toISOString().slice(0, 10);
}


function opcionesEnTexto(linea) {
    if (!linea.opciones || linea.opciones.length === 0) return null;
    return linea.opciones.map((o) => o.atributo + ': ' + o.valor).join(', ');
}


function revisarDatos(datos) {
    const tipoEntrega = (datos.tipoEntrega || '').trim();
    const telefono = (datos.telefonoContacto || '').trim();

    if (!ENTREGAS.includes(tipoEntrega)) {
        throw new ErrorPedido('Elige si lo recoges o te lo enviamos');
    }

    if (telefono.length < 6) {
        throw new ErrorPedido('Necesitamos un celular para coordinar la entrega');
    }

    const distrito = (datos.distrito || '').trim();
    const direccion = (datos.direccion || '').trim();

    if (tipoEntrega === 'delivery' && (!distrito || !direccion)) {
        throw new ErrorPedido('Completa el distrito y la dirección de entrega');
    }

    return {
        tipoEntrega,
        telefono,
        distrito: distrito || null,
        direccion: direccion || null,
        departamento: (datos.departamento || '').trim() || null,
        provincia: (datos.provincia || '').trim() || null,
        referencia: (datos.referencia || '').trim() || null,
        notas: (datos.notas || '').trim() || null,
    };
}


async function armar(pedido) {
    return seguimientoServicio.decorar(pedido);
}


async function crear(usuario, datos) {
    const limpios = revisarDatos(datos);

    const tarjeta = revisarPago(datos);

    const carrito = await carritoServicio.suCarrito(usuario.id, null);

    const recien = await pedidoDAO.recienteDeCarrito(
        carrito.id, usuario.id, SEGUNDOS_DOBLE_CLIC
    );

    if (recien) return armar(recien);

    const lineas = await carritoServicio.lineasDe(carrito.id);

    if (lineas.length === 0) throw new ErrorPedido('Tu carrito está vacío');

    for (const linea of lineas) {
        const stock = await pedidoDAO.stockDe(linea.producto_id);

        if (stock < linea.cantidad) {
            throw new ErrorPedido(
                `De ${linea.producto_nombre} solo quedan ${stock} unidad(es)`
            );
        }
    }

    const subtotal = Number(lineas.reduce((suma, l) => suma + l.subtotal, 0).toFixed(2));
    const envio = envioDe(limpios.tipoEntrega, subtotal);
    const dias = lineas.reduce((mayor, l) => Math.max(mayor, l.dias_produccion), 0);

    const referencia = 'PAG-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    let codigo;

    try {
        codigo = await hacerPedido(usuario, limpios, carrito, lineas, {
            subtotal, envio, dias, tarjeta, referencia,
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            const gemelo = await pedidoDAO.recienteDeCarrito(
                carrito.id, usuario.id, SEGUNDOS_DOBLE_CLIC
            );

            if (gemelo) return armar(gemelo);
        }

        throw error;
    }

    await carritoServicio.cerrar(usuario.id);

    return armar(await pedidoDAO.buscarPorCodigo(codigo, usuario.id));
}


async function hacerPedido(usuario, limpios, carrito, lineas, montos) {
    const { subtotal, envio, dias, tarjeta, referencia } = montos;

    return pedidoDAO.transaccion(async (cx) => {
        const suCodigo = await pedidoDAO.siguienteCodigo(cx);

        const id = await pedidoDAO.crear(cx, {
            codigo: suCodigo,
            usuario_id: usuario.id,
            carrito_id: carrito.id,
            nombre_contacto: usuario.nombres + ' ' + usuario.apellidos,
            email_contacto: usuario.email,
            telefono_contacto: limpios.telefono,
            tipo_entrega: limpios.tipoEntrega,
            departamento: limpios.departamento,
            provincia: limpios.provincia,
            distrito: limpios.distrito,
            direccion: limpios.direccion,
            referencia: limpios.referencia,
            subtotal,
            envio,
            total: Number((subtotal + envio).toFixed(2)),
            notas: limpios.notas,
            fecha_entrega_estimada: fechaEstimada(dias),
        });

        for (const linea of lineas) {
            await pedidoDAO.agregarItem(cx, id, {
                producto_id: linea.producto_id,
                nombre_producto: linea.producto_nombre,
                nombre_categoria: linea.categoria_nombre,
                cantidad: linea.cantidad,
                precio_unitario: linea.precio_unitario,
                subtotal: linea.subtotal,
                opciones: opcionesEnTexto(linea),
                archivo: linea.estampa_archivo,
                notas: linea.notas,
            });
        }

        await pedidoDAO.marcarPagado(cx, id, {
            metodo_pago: tarjeta.metodo,
            referencia_pago: referencia,
            ultimos4: tarjeta.ultimos4,
        });

        for (const linea of lineas) {
            if (!linea.producto_id) continue;

            const bajadas = await pedidoDAO.bajarStock(cx, linea.producto_id, linea.cantidad);

            if (bajadas === 0) {
                throw new ErrorPedido(
                    `Nos quedamos sin stock de ${linea.producto_nombre}. No te cobramos nada`,
                    409
                );
            }
        }

        return suCodigo;
    });
}


function revisarPago(datos) {
    const metodo = (datos.metodo || '').trim();

    if (!PAGOS.includes(metodo)) throw new ErrorPedido('Elige cómo vas a pagar');

    if (metodo !== 'tarjeta') return { metodo, ultimos4: null };

    const titular = (datos.titular || '').trim();
    const numero = (datos.numeroTarjeta || '').replace(/\D/g, '');

    if (titular.length < 5) throw new ErrorPedido('Escribe el nombre del titular');

    if (numero.length < 13 || numero.length > 19) {
        throw new ErrorPedido('El número de la tarjeta no es válido');
    }

    return { metodo, ultimos4: numero.slice(-4) };
}


async function mios(usuario) {
    const filas = await pedidoDAO.listarDe(usuario.id);
    return filas.map(seguimientoServicio.decorarFila);
}


async function uno(usuario, codigo) {
    const pedido = await pedidoDAO.buscarPorCodigo(codigo, usuario.id);

    if (!pedido) throw new ErrorPedido('No encontramos ese pedido', 404);

    return armar(pedido);
}


module.exports = {
    crear,
    mios,
    uno,
};
