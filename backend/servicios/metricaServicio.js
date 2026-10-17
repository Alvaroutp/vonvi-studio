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

async function tablero() {
  const [resumen, clientes, nuevas, estados, top] = await Promise.all([
    metricaDAO.resumen(),
    metricaDAO.contarClientes(),
    metricaDAO.cotizacionesNuevas(),
    metricaDAO.porEstado(),
    metricaDAO.topProductos(CUANTOS_TOP),
  ]);

  return {
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
