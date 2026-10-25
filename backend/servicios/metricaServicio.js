const metricaDAO = require('../dao/metricaDAO');
const estadoServicio = require('./estadoServicio');

const CUANTOS_TOP = 5;

function barras(filas) {
  const cuenta = {};
  for (const f of filas) cuenta[f.estado] = Number(f.total);
  
  return estadoServicio.ESTADOS.map((e) => ({
    codigo: e.codigo,
    nombre: e.nombre,
    color_hex: e.color_hex,
    total: cuenta[e.codigo] || 0,
  }));
}

function enNumero(fila) {
  return {
    pedidos_total: Number(fila.pedidos_total),
    ventas_cobradas: Number(fila.ventas_cobradas),
    por_cobrar: Number(fila.por_cobrar),
    pedidos_hoy: Number(fila.pedidos_hoy),
  };
}

function fecha(valor) {
  const texto = (valor || '').trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

async function tablero(rango = {}) {
  const desde = fecha(rango.desde);
  const hasta = fecha(rango.hasta);

  const [resumen, clientes, nuevas, estados, top] = await Promise.all([
    metricaDAO.resumen(desde, hasta),
    metricaDAO.contarClientes(desde, hasta),
    metricaDAO.cotizacionesNuevas(desde, hasta),
    metricaDAO.porEstado(desde, hasta),
    metricaDAO.topProductos(CUANTOS_TOP, desde, hasta),
  ]);

  return {
    rango: { desde, hasta },
    resumen: enNumero(resumen),
    clientes,
    cotizaciones: { nuevas },
    porEstado: barras(estados),
    topProductos: top.map((t) => ({
      ...t,
      unidades: Number(t.unidades),
      ingresos: Number(t.ingresos),
    })),
  };
}

module.exports = { tablero };
