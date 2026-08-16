/* =====================================================================
   checkout.js  ·  checkout.html
   =====================================================================
   Los datos de contacto se AUTORRELLENAN desde la cuenta del usuario.
   ===================================================================== */

const Checkout = {

    carrito: null,
    pedido: null,

    async iniciar() {
        const zona = document.getElementById('contenidoCheckout');
        if (!zona) return;

        // Sin cuenta no se puede cerrar la compra: el pedido necesita dueño
        // para que después aparezca en el historial y el seguimiento.
        if (!API.haySesion()) {
            location.href = `login.html?volver=${encodeURIComponent('checkout.html')}`;
            return;
        }

        try {
            const r = await API.get('/carrito');
            this.carrito = r.carrito;
        } catch (e) {
            U.vacio(zona, 'fa-solid fa-plug-circle-xmark', 'No pudimos cargar tu carrito', e.message);
            return;
        }

        if (!this.carrito.items.length) {
            U.vacio(zona, 'fa-solid fa-cart-shopping', 'Tu carrito está vacío',
                'Agrega productos antes de confirmar el pedido.',
                { href: 'productos.html', texto: 'Ver productos' });
            return;
        }

        this.pintarFormulario();
    },

    pintarFormulario() {
        const u = API.usuario;
        const { items, resumen } = this.carrito;
        const envio = resumen.subtotal >= 250 ? 0 : 12;

        document.getElementById('contenidoCheckout').innerHTML = `

            <div class="checkout-form">

                <!-- Paso 1: datos, ya rellenos -->
                <section class="bloque-checkout">
                    <h2><span class="paso">1</span> Tus datos</h2>

                    <div class="datos-cuenta">
                        <p><i class="fa-regular fa-user"></i> <strong>${U.esc(u.nombreCompleto)}</strong></p>
                        <p><i class="fa-regular fa-envelope"></i> ${U.esc(u.email)}</p>
                        <div class="campo">
                            <label for="telefono">Celular de contacto</label>
                            <input type="tel" id="telefono" value="${U.esc(u.telefono || '')}"
                                   placeholder="907 100 820" required>
                            <small class="ayuda">
                                Tomado de tu cuenta. Puedes cambiarlo solo para este pedido.
                            </small>
                        </div>
                    </div>
                </section>

                <!-- Paso 2: entrega -->
                <section class="bloque-checkout">
                    <h2><span class="paso">2</span> Entrega</h2>

                    <div class="opciones-entrega">
                        <label class="tarjeta-radio">
                            <input type="radio" name="entrega" value="delivery" checked>
                            <div>
                                <strong><i class="fa-solid fa-truck-fast"></i> Delivery</strong>
                                <small>Lima Metropolitana y envíos a provincia</small>
                            </div>
                        </label>
                        <label class="tarjeta-radio">
                            <input type="radio" name="entrega" value="recojo">
                            <div>
                                <strong><i class="fa-solid fa-store"></i> Recojo en tienda</strong>
                                <small>Chorrillos, ref. Parque Belén · sin costo</small>
                            </div>
                        </label>
                    </div>

                    <div id="camposDelivery">
                        <div class="fila-campos">
                            <div class="campo">
                                <label for="departamento">Departamento</label>
                                <input type="text" id="departamento" value="Lima">
                            </div>
                            <div class="campo">
                                <label for="provincia">Provincia</label>
                                <input type="text" id="provincia" value="Lima">
                            </div>
                        </div>
                        <div class="campo">
                            <label for="distrito">Distrito</label>
                            <input type="text" id="distrito" placeholder="Chorrillos" required>
                        </div>
                        <div class="campo">
                            <label for="direccion">Dirección</label>
                            <input type="text" id="direccion" placeholder="Av. Defensores del Morro 123" required>
                        </div>
                        <div class="campo">
                            <label for="referencia">Referencia (opcional)</label>
                            <input type="text" id="referencia" placeholder="Frente al parque, casa blanca">
                        </div>
                    </div>

                    <div class="campo">
                        <label for="notasPedido">Indicaciones para el pedido (opcional)</label>
                        <textarea id="notasPedido" rows="2" maxlength="500"
                            placeholder="Ej.: entregar por la tarde, coordinar antes por WhatsApp"></textarea>
                    </div>
                </section>

                <!-- Paso 3: pago -->
                <section class="bloque-checkout">
                    <h2><span class="paso">3</span> Pago</h2>

                    <p class="aviso-simulado">
                        <i class="fa-solid fa-flask"></i>
                        <strong>Pago simulado.</strong> Este es un proyecto académico: no se procesa
                        dinero real y no se guardan datos de tarjetas (solo los últimos 4 dígitos).
                    </p>

                    <div class="opciones-pago">
                        <label class="tarjeta-radio">
                            <input type="radio" name="pago" value="tarjeta" checked>
                            <div><strong><i class="fa-regular fa-credit-card"></i> Tarjeta</strong></div>
                        </label>
                        <label class="tarjeta-radio">
                            <input type="radio" name="pago" value="yape">
                            <div><strong><i class="fa-solid fa-mobile-screen"></i> Yape / Plin</strong></div>
                        </label>
                        <label class="tarjeta-radio">
                            <input type="radio" name="pago" value="transferencia">
                            <div><strong><i class="fa-solid fa-building-columns"></i> Transferencia</strong></div>
                        </label>
                    </div>

                    <div id="camposTarjeta">
                        <div class="campo">
                            <label for="titular">Nombre del titular</label>
                            <input type="text" id="titular" value="${U.esc(u.nombreCompleto.toUpperCase())}"
                                   placeholder="COMO APARECE EN LA TARJETA">
                        </div>
                        <div class="campo">
                            <label for="numeroTarjeta">Número de tarjeta</label>
                            <input type="text" id="numeroTarjeta" inputmode="numeric"
                                   placeholder="4111 1111 1111 1111" maxlength="23">
                            <small class="ayuda">Prueba con 4111 1111 1111 1111</small>
                        </div>
                    </div>

                    <div id="datosTransferencia" hidden>
                        <div class="caja-datos-pago">
                            <p><strong>Yape / Plin:</strong> 907 100 820 — Vonvi Studio Perú</p>
                            <p><strong>BCP Soles:</strong> 191-0000000-0-00</p>
                            <p class="mini">Al confirmar registramos tu pedido y coordinamos el pago por WhatsApp.</p>
                        </div>
                    </div>
                </section>

            </div>

            <!-- Resumen -->
            <aside class="checkout-resumen">
                <h2>Tu pedido</h2>

                <div class="lista-resumen">
                    ${items.map((i) => `
                        <div class="fila-resumen">
                            <img src="${U.esc(i.producto_imagen || 'img/logo.png')}" alt="">
                            <div>
                                <strong>${U.esc(i.producto_nombre)}</strong>
                                <small>${(i.opciones || []).map((o) => U.esc(o.valor)).join(' · ')}</small>
                                <small>${i.cantidad} × ${U.soles(i.precio_unitario)}</small>
                            </div>
                            <span>${U.soles(i.subtotal)}</span>
                        </div>`).join('')}
                </div>

                <div class="linea"><span>Subtotal</span><span>${U.soles(resumen.subtotal)}</span></div>
                <div class="linea">
                    <span>Envío</span>
                    <span id="lineaEnvio">${envio === 0 ? '<em class="gratis">Gratis</em>' : U.soles(envio)}</span>
                </div>
                <div class="linea total">
                    <span>Total</span>
                    <strong id="totalFinal">${U.soles(resumen.subtotal + envio)}</strong>
                </div>

                <p class="nota-produccion">
                    <i class="fa-regular fa-clock"></i>
                    Producción estimada: ${resumen.dias_produccion_estimados} día(s) hábiles
                </p>

                <p id="errorCheckout" class="error-general" hidden></p>

                <button type="button" class="btn-principal ancho-total" id="btnConfirmar">
                    <i class="fa-solid fa-lock"></i> Confirmar pedido
                </button>

                <a href="carrito.html" class="btn-texto centrado">Volver al carrito</a>
            </aside>`;

        this.conectarEventos();
    },

    conectarEventos() {
        // Mostrar u ocultar los campos de dirección
        document.querySelectorAll('input[name="entrega"]').forEach((r) => {
            r.addEventListener('change', () => {
                const esDelivery = r.value === 'delivery' && r.checked;
                document.getElementById('camposDelivery').hidden = !esDelivery;

                const envio = (esDelivery && this.carrito.resumen.subtotal < 250) ? 12 : 0;
                document.getElementById('lineaEnvio').innerHTML =
                    envio === 0 ? '<em class="gratis">Gratis</em>' : U.soles(envio);
                document.getElementById('totalFinal').textContent =
                    U.soles(this.carrito.resumen.subtotal + envio);
            });
        });

        // Mostrar u ocultar los campos de tarjeta
        document.querySelectorAll('input[name="pago"]').forEach((r) => {
            r.addEventListener('change', () => {
                const esTarjeta = r.value === 'tarjeta' && r.checked;
                document.getElementById('camposTarjeta').hidden = !esTarjeta;
                document.getElementById('datosTransferencia').hidden = esTarjeta;
            });
        });

        // Formato del número de tarjeta: 4111 1111 1111 1111
        const tarjeta = document.getElementById('numeroTarjeta');
        tarjeta.addEventListener('input', () => {
            const digitos = tarjeta.value.replace(/\D/g, '').slice(0, 19);
            tarjeta.value = digitos.replace(/(.{4})/g, '$1 ').trim();
        });

        document.getElementById('btnConfirmar')
            .addEventListener('click', () => this.confirmar());
    },

    async confirmar() {
        const boton = document.getElementById('btnConfirmar');
        const error = document.getElementById('errorCheckout');
        error.hidden = true;

        const tipoEntrega = document.querySelector('input[name="entrega"]:checked').value;
        const metodo = document.querySelector('input[name="pago"]:checked').value;
        const telefono = document.getElementById('telefono').value.trim();

        if (!telefono) {
            error.textContent = 'Necesitamos un celular para coordinar la entrega.';
            error.hidden = false;
            return;
        }
        if (tipoEntrega === 'delivery') {
            if (!document.getElementById('distrito').value.trim() ||
                !document.getElementById('direccion').value.trim()) {
                error.textContent = 'Completa el distrito y la dirección de entrega.';
                error.hidden = false;
                return;
            }
        }

        boton.disabled = true;
        boton.innerHTML = '<span class="spinner"></span> Registrando pedido...';

        try {
            // 1) Crear el pedido
            const r = await API.post('/pedidos', {
                tipoEntrega,
                telefonoContacto: telefono,
                departamento: document.getElementById('departamento').value.trim(),
                provincia: document.getElementById('provincia').value.trim(),
                distrito: document.getElementById('distrito').value.trim(),
                direccion: document.getElementById('direccion').value.trim(),
                referencia: document.getElementById('referencia').value.trim(),
                notas: document.getElementById('notasPedido').value.trim(),
            });

            this.pedido = r.pedido;

            // 2) Pago simulado
            boton.innerHTML = '<span class="spinner"></span> Procesando pago...';
            let pago = null;
            try {
                pago = await API.post(`/pedidos/${this.pedido.codigo}/pagar`, {
                    metodo,
                    titular: document.getElementById('titular').value.trim(),
                    numeroTarjeta: document.getElementById('numeroTarjeta').value.replace(/\s/g, ''),
                });
            } catch (e) {
                // El pedido YA está registrado: si el pago falla no se pierde,
                // simplemente queda pendiente de cobro.
                U.aviso('El pedido se registró, pero el pago quedó pendiente', 'aviso');
            }

            await Header.actualizarCarrito();
            this.mostrarExito(pago);

        } catch (e) {
            error.textContent = e.message;
            error.hidden = false;
            boton.disabled = false;
            boton.innerHTML = '<i class="fa-solid fa-lock"></i> Confirmar pedido';
        }
    },

    mostrarExito(pago) {
        const p = this.pedido;
        document.getElementById('contenidoCheckout').innerHTML = `
            <div class="pedido-exito">
                <i class="fa-solid fa-circle-check"></i>
                <h2>¡Pedido registrado!</h2>
                <p class="codigo-pedido">${U.esc(p.codigo)}</p>

                <div class="detalle-exito">
                    <div><span>Total</span><strong>${U.soles(p.total)}</strong></div>
                    <div><span>Pago</span><strong>${pago ? 'Aprobado' : 'Pendiente'}</strong></div>
                    <div><span>Entrega estimada</span><strong>${U.fecha(p.fecha_entrega_estimada)}</strong></div>
                    ${pago ? `<div><span>Referencia</span><strong>${U.esc(pago.pago.referencia)}</strong></div>` : ''}
                </div>

                <p class="texto-exito">
                    Ya puedes seguir la fabricación de tu pedido paso a paso desde tu cuenta.
                    Te avisaremos por WhatsApp cuando avance.
                </p>

                <div class="acciones-exito">
                    <a href="cuenta.html?pedido=${encodeURIComponent(p.codigo)}" class="btn-principal">
                        Ver seguimiento
                    </a>
                    <a href="productos.html" class="btn-secundario">Seguir comprando</a>
                </div>
            </div>`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
};

document.addEventListener('DOMContentLoaded', () => Checkout.iniciar());
