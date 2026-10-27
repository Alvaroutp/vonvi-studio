const alertaDAO = require('../dao/alertaDAO');


const PEDIDOS_MINIMOS = 2;


function clasificar(producto) {
    const stock = Number(producto.stock);
    const minimo = Number(producto.cantidad_minima);

    if (stock === 0) {
        return {
            nivel: 'agotado',
            titulo: 'Sin stock',
            detalle: 'No queda ninguna unidad',
        };
    }

    if (stock < minimo) {
        return {
            nivel: 'critico',
            titulo: 'Stock crítico',
            detalle: `Quedan ${stock} u. y el pedido mínimo es de ${minimo} u.`,
        };
    }

    return {
        nivel: 'bajo',
        titulo: 'Stock bajo',
        detalle: `Quedan ${stock} u., alcanza para ${Math.floor(stock / minimo)} pedido(s)`,
    };
}


const ORDEN = { agotado: 0, critico: 1, bajo: 2 };


async function stock() {
    const filas = await alertaDAO.stockBajo(PEDIDOS_MINIMOS);

    const avisos = filas.map((p) => ({
        producto_id: p.id,
        nombre: p.nombre,
        slug: p.slug,
        categoria: p.categoria,
        categoria_id: p.categoria_id,
        stock: Number(p.stock),
        cantidad_minima: Number(p.cantidad_minima),
        ...clasificar(p),
    }));

    avisos.sort((a, b) => ORDEN[a.nivel] - ORDEN[b.nivel] || a.stock - b.stock);

    return {
        avisos,
        total: avisos.length,
        agotados: avisos.filter((a) => a.nivel === 'agotado').length,
        criticos: avisos.filter((a) => a.nivel === 'critico').length,
    };
}


module.exports = {
    stock,
};
