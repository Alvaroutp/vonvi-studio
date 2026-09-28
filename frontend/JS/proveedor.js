/* =====================================================================
   proveedor.js  ·  proveedor.html
   =====================================================================
   El portal del proveedor. Solo ve las ordenes de compra de SU empresa
   y puede aceptarlas o rechazarlas.

   Nunca manda el id de su empresa: el servidor lo saca de la sesion.
   ===================================================================== */

const Proveedor = {

    // Se ejecuta al abrir la pagina
    async iniciar() {
        if (!API.haySesion()) {
            location.href = 'login.html';
            return;
        }

        const u = API.usuario;

        // Esta pagina es solo para proveedores
        if (!u || u.rol !== 'proveedor') {
            location.href = 'index.html';
            return;
        }

        this.pintar();
    },


    // Pide las ordenes y las dibuja
    async pintar() {
        const zona = document.getElementById('listaOrdenes');
        U.cargando(zona, 'Cargando tus órdenes...');

        let r;
        try {
            r = await API.get('/proveedor/ordenes');
        } catch (e) {
            U.vacio(zona, 'fa-solid fa-plug-circle-xmark', 'No se pudo cargar', e.message);
            return;
        }

        if (r.ordenes.length === 0) {
            U.vacio(zona, 'fa-regular fa-envelope-open', 'No tienes órdenes',
                    'Cuando Vonvi Studio te mande una, va a aparecer aquí.');
            return;
        }

        // Las que esperan respuesta van primero; las ya respondidas, abajo
        const ordenadas = r.ordenes.slice().sort((a, b) => {
            if (a.estado === b.estado) return 0;
            return a.estado === 'enviada' ? -1 : 1;
        });

        zona.innerHTML = ordenadas.map((o) => this.tarjeta(o)).join('');
        this.conectar();
    },


    // El HTML de una orden de compra
    tarjeta(o) {
        // Solo las que no han sido respondidas llevan botones
        const puedeResponder = o.estado === 'enviada';

        return `
            <article class="orden">

                <div class="orden-cab">
                    <span class="codigo">${U.esc(o.codigo)}</span>
                    <span class="marca-estado ${o.estado}">${o.estado}</span>
                </div>

                <p class="fechas">
                    Recibida el ${U.fecha(o.creado_en)}
                    ${o.fecha_entrega ? ' · Entrega esperada: ' + U.fecha(o.fecha_entrega) : ''}
                    ${o.respondido_en ? ' · Respondida el ' + U.fecha(o.respondido_en) : ''}
                </p>

                <table class="detalle">
                    <thead>
                        <tr>
                            <th>Descripción</th>
                            <th>Cant.</th>
                            <th>P. unitario</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(o.items || []).map((i) => `
                            <tr>
                                <td>${U.esc(i.descripcion)}</td>
                                <td>${i.cantidad}</td>
                                <td>${U.soles(i.precio_unitario)}</td>
                                <td>${U.soles(i.subtotal)}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>

                <div class="totales">
                    <div class="fila"><span>Subtotal</span><span>${U.soles(o.subtotal)}</span></div>
                    <div class="fila"><span>IGV (18%)</span><span>${U.soles(o.igv)}</span></div>
                    <div class="fila total"><span>Total</span><span>${U.soles(o.total)}</span></div>
                </div>

                ${puedeResponder ? `
                    <div class="acciones">
                        <button type="button" class="btn-principal" data-si="${o.id}">
                            Aceptar
                        </button>
                        <button type="button" class="btn-secundario" data-no="${o.id}">
                            Rechazar
                        </button>
                    </div>` : ''}

                ${o.respuesta ? `
                    <p class="motivo">Motivo del rechazo: "${U.esc(o.respuesta)}"</p>` : ''}

            </article>`;
    },


    // Enchufa los clics de los botones que acaban de pintarse
    conectar() {
        document.querySelectorAll('[data-si]').forEach((b) => {
            b.addEventListener('click', () => {
                if (!confirm('¿Aceptar esta orden de compra?')) return;
                this.responder(b.dataset.si, 'aceptar');
            });
        });

        document.querySelectorAll('[data-no]').forEach((b) => {
            b.addEventListener('click', () => {
                const motivo = prompt('¿Por qué la rechazas?');
                if (!motivo) return;
                this.responder(b.dataset.no, 'rechazar', motivo);
            });
        });
    },


    // Manda la respuesta al servidor
    async responder(id, accion, respuesta = '') {
        try {
            await API.put('/proveedor/ordenes/' + id + '/responder', {
                accion: accion,
                respuesta: respuesta,
            });

            U.aviso(accion === 'aceptar' ? 'Orden aceptada' : 'Orden rechazada');
            this.pintar();

        } catch (e) {
            U.aviso(e.message, 'error');
        }
    },
};

document.addEventListener('DOMContentLoaded', () => Proveedor.iniciar());