const cotizacionDAO = require('../dao/cotizacionDAO');

const PREFERENCIAS = ['correo', 'whatsapp', 'llamada'];
const ESTADOS = ['nueva', 'en_proceso', 'respondida', 'cerrada'];
const TOPE_POR_HORA = 5;

class ErrorCotizacion extends Error {
  constructor(mensaje, codigo = 400) {
    super(mensaje);
    this.codigo = codigo;
  }
}

function correoValido(texto) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto);
}

function revisar(datos) {
  const nombre = (datos.nombre || '').trim();
  const email = (datos.email || '').trim().toLowerCase();
  const telefono = (datos.telefono || '').trim();

  if (nombre.length < 3) throw new ErrorCotizacion('Escribe tu nombre completo');
  if (!correoValido(email)) throw new ErrorCotizacion('Ese correo no parece válido');
  if (telefono.replace(/\D/g, '').length < 6) {
    throw new ErrorCotizacion('Déjanos un número para poder contactarte');
  }

  const preferencia = (datos.preferenciaContacto || '').trim();

  return {
    nombre: nombre.slice(0, 160),
    email: email.slice(0, 120),
    telefono: telefono.slice(0, 20),
    producto_interes: (datos.productoInteres || '').trim().slice(0, 120) || null,
    mensaje: (datos.mensaje || '').trim().slice(0, 2000) || null,
    preferencia_contacto: PREFERENCIAS.includes(preferencia) ? preferencia : 'whatsapp',
    acepta_promociones: datos.aceptaPromociones ? 1 : 0,
  };
}

async function registrar(usuario, datos) {
  const limpios = revisar(datos);
  const recientes = await cotizacionDAO.recientesDe(limpios.email);

  if (recientes >= TOPE_POR_HORA) {
    throw new ErrorCotizacion(
      'Ya recibimos varias solicitudes tuyas. Te escribimos pronto', 429
    );
  }

  const id = await cotizacionDAO.crear({
    ...limpios,
    usuario_id: usuario ? usuario.id : null,
  });

  return { id };
}

async function listar() {
  const cotizaciones = await cotizacionDAO.listar();
  return {
    cotizaciones,
    total: cotizaciones.length,
    nuevas: cotizaciones.filter((c) => c.estado === 'nueva').length,
  };
}

async function cambiarEstado(id, estado) {
  if (!ESTADOS.includes(estado)) throw new ErrorCotizacion('Ese estado no existe');
  
  const cotizacion = await cotizacionDAO.buscarPorId(id);
  if (!cotizacion) throw new ErrorCotizacion('No encontramos esa solicitud', 404);

  await cotizacionDAO.cambiarEstado(id, estado);
  return { ...cotizacion, estado };
}

module.exports = {
  ESTADOS,
  registrar,
  listar,
  cambiarEstado,
};
