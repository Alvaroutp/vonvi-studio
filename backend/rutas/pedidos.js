
const express = require('express');
const { requiereSesion, requiereRol } = require('../sesion');
const estadoServicio = require('../servicios/estadoServicio');
const router = express.Router();
// Esta capa solo habla HTTP. Las reglas estan en estadoServicio y el
// SQL en adminPedidoDAO.
// Los permisos van ruta por ruta, nunca con router.use. Este archivo lo
// carga admin/index.js sin prefijo, asi que un router.use aqui le
// pediria sesion a TODA la api, hasta para ver el catalogo
const SOLO_PANEL = [requiereSesion, requiereRol('admin', 'empleado')];
function fallo(res, error, mensaje) {
if (error.codigo) {
return res.status(error.codigo).json({ ok: false, mensaje: error.message });
}
console.error(mensaje + ':', error.message);
res.status(500).json({ ok: false, mensaje });
}
// El catalogo de estados. La pantalla lo pide al entrar al panel para
// pintar los colores y armar el selector
router.get('/admin/estados', SOLO_PANEL, (req, res) => {
res.json({ ok: true, estados: estadoServicio.catalogo() });
});


router.get('/admin/pedidos', SOLO_PANEL, async (req, res) => {
try {
const resultado = await estadoServicio.listar({
pagina: req.query.pagina,
desde: req.query.desde,
hasta: req.query.hasta,
estado: req.query.estado,
pago: req.query.pago,
buscar: req.query.buscar,
});
res.json({ ok: true, ...resultado });
} catch (error) {
fallo(res, error, 'No se pudieron cargar los pedidos');
}
});
router.get('/admin/pedidos/:codigo', SOLO_PANEL, async (req, res) => {
try {
res.json({ ok: true, pedido: await estadoServicio.uno(req.params.codigo) });
} catch (error) {
fallo(res, error, 'No se pudo cargar el pedido');
}
});
router.patch('/admin/pedidos/:codigo/estado', SOLO_PANEL, async (req, res) => {
try {
const pedido = await estadoServicio.cambiar(
req.usuario, req.params.codigo, req.body.estado, req.body.comentario
);
res.json({ ok: true, pedido });
} catch (error) {
fallo(res, error, 'No se pudo cambiar el estado');
}
});

module.exports = router;
