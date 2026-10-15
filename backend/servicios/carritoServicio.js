const crypto = require('crypto');

const carritoDAO = require('../dao/carritoDAO');
const productoDAO = require('../dao/productoDAO');
const atributoDAO = require('../dao/atributoDAO');

class ErrorCarrito extends Error {
    constructor(mensaje, codigo = 400) {
        super(mensaje);
        this.codigo = codigo;
    }
}


function nuevoToken() {
    return crypto.randomBytes(16).toString('hex');
}


async function suCarrito(usuarioId, token) {
    const existente = await carritoDAO.obtener(usuarioId, token);
    if (existente) return existente;

    const tokenNuevo = usuarioId ? null : nuevoToken();
    const id = await carritoDAO.crear(usuarioId, tokenNuevo);

    return { id, usuario_id: usuarioId || null, token: tokenNuevo };
}


async function armar(carrito) {
    const items = await carritoDAO.items(carrito.id);

    const subtotal = items.reduce((suma, i) => suma + i.subtotal, 0);
    const articulos = items.reduce((suma, i) => suma + i.cantidad, 0);
    const dias = items.reduce((mayor, i) => Math.max(mayor, i.dias_produccion), 0);

    return {
        token: carrito.token || null,
        items,
        resumen: {
            total_articulos: articulos,
            subtotal: Number(subtotal.toFixed(2)),
            dias_produccion_estimados: dias,
        },
    };
}

async function calcularPrecio(producto, seleccion) {
    const atributos = await atributoDAO.listarPorProducto(producto.id);
    const valores = await atributoDAO.listarValoresDeProducto(producto.id);

    const elegidos = Object.values(seleccion || {}).map(Number);

    let recargos = 0;
    const valoresElegidos = [];

    for (const atributo of atributos) {
        const suyos = valores.filter((v) => v.atributo_id === atributo.id);
        const elegido = suyos.find((v) => elegidos.includes(v.id));

        if (!elegido) throw new ErrorCarrito(`Te falta elegir: ${atributo.nombre}`);

        recargos += Number(elegido.recargo);
        valoresElegidos.push(elegido.id);
    }

    return {
        precio_unitario: Number((Number(producto.precio_base) + recargos).toFixed(2)),
        valores: valoresElegidos,
    };
}

async function lineaIgual(carritoId, productoId, valores, estampa, notas) {
    const lineas = await carritoDAO.itemsSimples(carritoId);
    const opciones = await carritoDAO.opcionesPorItem(carritoId);

    const buscadas = [...valores].sort().join(',');

    for (const linea of lineas) {
        if (linea.producto_id !== productoId) continue;
        if ((linea.estampa_archivo || null) !== estampa) continue;
        if ((linea.notas || null) !== notas) continue;

        const suyas = opciones
            .filter((o) => o.item_id === linea.id)
            .map((o) => o.valor_id)
            .sort()
            .join(',');

        if (suyas === buscadas) return linea;
    }

    return null;
}

async function ver(usuarioId, token) {
    return armar(await suCarrito(usuarioId, token));
}


async function agregar(usuarioId, token, datos) {
    const slug = (datos.producto || '').trim();
    const cantidad = Number(datos.cantidad);
    const notas = (datos.notas || '').trim() || null;
    const estampa = (datos.archivoDisenoId || '').trim() || null;

    const estampaNombre = estampa
        ? ((datos.archivoDisenoNombre || '').trim() || 'Diseño adjunto')
        : null;

    const producto = await productoDAO.buscarPorSlugActivo(slug);

    if (!producto) throw new ErrorCarrito('Ese producto no existe', 404);

    if (isNaN(cantidad) || cantidad < 1) throw new ErrorCarrito('Cantidad inválida');

    if (cantidad < producto.cantidad_minima) {
        throw new ErrorCarrito(
            `El pedido mínimo de este producto es ${producto.cantidad_minima} unidad(es)`
        );
    }

    const precio = await calcularPrecio(producto, datos.seleccion);

    const carrito = await suCarrito(usuarioId, token);

    const repetida = await lineaIgual(
        carrito.id, producto.id, precio.valores, estampa, notas
    );

    if (repetida) {
        await carritoDAO.sumarCantidad(repetida.id, cantidad);

    } else {
        const itemId = await carritoDAO.agregarItem(carrito.id, {
            producto_id: producto.id,
            cantidad,
            precio_unitario: precio.precio_unitario,
            estampa_archivo: estampa,
            estampa_nombre: estampaNombre,
            notas,
        });

        for (const valorId of precio.valores) {
            await carritoDAO.agregarOpcion(itemId, valorId);
        }
    }

    await carritoDAO.tocar(carrito.id);

    return armar(carrito);
}


async function cambiarCantidad(usuarioId, token, itemId, cantidad) {
    if (isNaN(cantidad) || cantidad < 1) throw new ErrorCarrito('Cantidad inválida');

    const carrito = await suCarrito(usuarioId, token);

    const linea = (await carritoDAO.items(carrito.id)).find((i) => i.id === itemId);

    if (!linea) throw new ErrorCarrito('Esa línea no está en tu carrito', 404);

    if (cantidad < linea.cantidad_minima) {
        throw new ErrorCarrito(
            `El pedido mínimo de ${linea.producto_nombre} es ${linea.cantidad_minima} unidad(es)`
        );
    }

    const cambiadas = await carritoDAO.cambiarCantidad(itemId, carrito.id, cantidad);

    if (cambiadas === 0) {
        throw new ErrorCarrito('Esa línea no está en tu carrito', 404);
    }

    await carritoDAO.tocar(carrito.id);

    return armar(carrito);
}


async function quitar(usuarioId, token, itemId) {
    const carrito = await suCarrito(usuarioId, token);
    const borradas = await carritoDAO.borrarItem(itemId, carrito.id);

    if (borradas === 0) {
        throw new ErrorCarrito('Esa línea no está en tu carrito', 404);
    }

    await carritoDAO.tocar(carrito.id);

    return armar(carrito);
}


async function vaciar(usuarioId, token) {
    const carrito = await suCarrito(usuarioId, token);

    await carritoDAO.vaciar(carrito.id);

    return armar(carrito);
}

async function fusionar(usuarioId, token) {
    if (!usuarioId) throw new ErrorCarrito('Necesitas iniciar sesión', 401);

    const invitado = token ? await carritoDAO.obtener(null, token) : null;
    const suyo = await suCarrito(usuarioId, null);

    if (invitado && invitado.id !== suyo.id) {
        await carritoDAO.moverItems(invitado.id, suyo.id);
        await carritoDAO.borrar(invitado.id);
    }

    await carritoDAO.tocar(suyo.id);

    return armar(suyo);
}

async function lineasDe(carritoId) {
    return carritoDAO.items(carritoId);
}


module.exports = {
    ErrorCarrito,
    ver,
    agregar,
    cambiarCantidad,
    quitar,
    vaciar,
    fusionar,
    suCarrito,
    lineasDe,
};
