/* =====================================================================
   cuenta.js  ·  cuenta.html
   =====================================================================
   Historial de compras + línea de tiempo de fabricación.
   ===================================================================== */

const Cuenta = {

    async iniciar() {
        if (!document.getElementById('listaPedidos')) return;

        if (!API.haySesion()) {
            location.href = `login.html?volver=${encodeURIComponent('cuenta.html')}`;
            return;
        }

        const u = API.usuario;
        document.getElementById('saludo').textContent = `Hola, ${u.nombres}`;

        this.pestanas();
        this.perfil();
        this.filtros();

        // Si venimos del checkout, se abre directo el seguimiento
        const codigo = U.parametro('pedido');
        if (codigo) { await this.verPedido(codigo); return; }

        await this.cargarPedidos();

        if (location.hash === '#perfil') this.abrirPanel('perfil');
    },

    /* ---------------- Pestañas ---------------- */

    pestanas() {
        document.querySelectorAll('.pestana').forEach((btn) => {
            btn.addEventListener('click', () => this.abrirPanel(btn.dataset.panel));
        });
    },

    abrirPanel(nombre) {
        document.querySelectorAll('.pestana').forEach((b) =>
            b.classList.toggle('activa', b.dataset.panel === nombre));
        document.getElementById('panelPedidos').classList.toggle('activo', nombre === 'pedidos');
        document.getElementById('panelPerfil').classList.toggle('activo', nombre === 'perfil');
    },

    /* ---------------- Historial ---------------- */

    filtros() {
        document.getElementById('btnFiltrar')
            .addEventListener('click', () => this.cargarPedidos());

        document.getElementById('btnLimpiar').addEventListener('click', () => {
            document.getElementById('filtroDesde').value = '';
            document.getElementById('filtroHasta').value = '';
            this.cargarPedidos();
        });
    },

    async cargarPedidos() {
        const lista = document.getElementById('listaPedidos');
        document.getElementById('detallePedido').hidden = true;
        lista.hidden = false;
        U.cargando(lista, 'Cargando tus pedidos...');

        const desde = document.getElementById('filtroDesde').value;
        const hasta = document.getElementById('filtroHasta').value;
        const params = new URLSearchParams();
        if (desde) params.set('desde', desde);
        if (hasta) params.set('hasta', hasta);

        try {
            const r = await API.get(`/pedidos${params.toString() ? '?' + params : ''}`);

            if (!r.pedidos.length) {
                U.vacio(lista, 'fa-solid fa-box-open', 'Todavía no tienes pedidos',
                    'Cuando hagas tu primera compra la verás aquí, con su seguimiento.',
                    { href: 'productos.html', texto: 'Ver productos' });
                return;
            }

            lista.innerHTML = r.pedidos.map((p) => `
                <article class="tarjeta-pedido" data-codigo="${U.esc(p.codigo)}">
                    <div class="pedido-cabecera">
                        <div>
                            <strong>${U.esc(p.codigo)}</strong>
                            <small>${U.fecha(p.creado_en)}</small>
                        </div>
                        <span class="insignia-estado" style="background:${U.esc(p.estado_color)}">
                            ${U.esc(p.estado_nombre)}
                        </span>
                    </div>

                    <div class="pedido-cuerpo">
                        <span><i class="fa-solid fa-box"></i> ${p.total_articulos} artículo(s)</span>
                        <span><i class="fa-solid fa-${p.tipo_entrega === 'recojo' ? 'store' : 'truck-fast'}"></i>
                              ${p.tipo_entrega === 'recojo' ? 'Recojo en tienda' : 'Delivery'}</span>
                        <span class="pago ${U.esc(p.estado_pago)}">
                            <i class="fa-solid fa-${p.estado_pago === 'pagado' ? 'circle-check' : 'clock'}"></i>
                            ${p.estado_pago === 'pagado' ? 'Pagado' : 'Pago pendiente'}
                        </span>
                    </div>

                    <div class="pedido-pie">
                        <strong>${U.soles(p.total)}</strong>
                        <button type="button" class="btn-secundario chico">
                            Ver seguimiento <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </article>`).join('');

            lista.querySelectorAll('.tarjeta-pedido').forEach((t) => {
                t.addEventListener('click', () => this.verPedido(t.dataset.codigo));
            });

        } catch (e) {
            U.vacio(lista, 'fa-solid fa-plug-circle-xmark', 'No pudimos cargar tus pedidos', e.message);
        }
    },

    /* ---------------- Detalle + seguimiento ---------------- */

    async verPedido(codigo) {
        const zona = document.getElementById('detallePedido');
        document.getElementById('listaPedidos').hidden = true;
        zona.hidden = false;
        U.cargando(zona, 'Cargando el pedido...');

        let p;
        try {
            const r = await API.get(`/pedidos/${encodeURIComponent(codigo)}`);
            p = r.pedido;
        } catch (e) {
            U.vacio(zona, 'fa-solid fa-circle-question', 'No encontramos ese pedido', e.message);
            return;
        }

        zona.innerHTML = `
            <button type="button" class="btn-texto" id="volverLista">
                <i class="fa-solid fa-arrow-left"></i> Volver a mis pedidos
            </button>

            <div class="detalle-cabecera">
                <div>
                    <h2>${U.esc(p.codigo)}</h2>
                    <small>Realizado el ${U.fechaHora(p.creado_en)}</small>
                </div>
                <span class="insignia-estado grande" style="background:${U.esc(p.estado_color)}">
                    ${U.esc(p.estado_nombre)}
                </span>
            </div>

            ${p.cancelado ? `
                <div class="banner-cancelado">
                    <i class="fa-solid fa-ban"></i> Este pedido fue cancelado.
                </div>` : `

                <!-- ===== LÍNEA DE TIEMPO DE FABRICACIÓN ===== -->
                <section class="bloque-detalle">
                    <h3>Seguimiento de fabricación</h3>
                    <ol class="linea-tiempo">
                        ${p.seguimiento.map((s) => `
                            <li class="${s.alcanzado ? 'alcanzado' : ''} ${s.actual ? 'actual' : ''}">
                                <span class="punto" style="${s.alcanzado ? `background:${U.esc(s.color_hex)};border-color:${U.esc(s.color_hex)}` : ''}">
                                    ${s.alcanzado ? '<i class="fa-solid fa-check"></i>' : ''}
                                </span>
                                <div class="paso-datos">
                                    <strong>${U.esc(s.nombre)}</strong>
                                    <small>${U.esc(s.descripcion || '')}</small>
                                    ${s.fecha ? `<time>${U.fechaHora(s.fecha)}</time>` : ''}
                                    ${s.comentario && s.comentario !== 'Cambio de estado automático'
                                        && s.comentario !== 'Pedido registrado'
                                        ? `<p class="comentario-admin">"${U.esc(s.comentario)}"</p>` : ''}
                                </div>
                            </li>`).join('')}
                    </ol>
                    <p class="nota-entrega">
                        <i class="fa-regular fa-calendar-check"></i>
                        Entrega estimada: <strong>${U.fecha(p.fecha_entrega_estimada)}</strong>
                    </p>
                </section>`}

            <!-- ===== PRODUCTOS ===== -->
            <section class="bloque-detalle">
                <h3>Productos</h3>
                ${p.items.map((i) => `
                    <div class="item-pedido">
                        <img src="${U.esc(i.producto_imagen || 'img/logo.png')}" alt="">
                        <div>
                            <span class="item-categoria">${U.esc(i.nombre_categoria)}</span>
                            <strong>${U.esc(i.nombre_producto)}</strong>
                            <div class="item-opciones">
                                ${(i.opciones || []).map((o) =>
                                    `<span class="pastilla">${U.esc(o.atributo)}: <b>${U.esc(o.valor)}</b></span>`).join('')}
                            </div>
                            ${i.estampa_nombre ? `
                                <p class="item-estampa">
                                    <i class="fa-regular fa-image"></i>
                                    <a href="${API.base.replace('/api', '')}${U.esc(i.estampa_url)}" target="_blank" rel="noopener">
                                        ${U.esc(i.estampa_nombre)}
                                    </a>
                                </p>` : ''}
                            ${i.notas ? `<p class="item-notas">${U.esc(i.notas)}</p>` : ''}
                        </div>
                        <div class="item-precio">
                            <strong>${U.soles(i.subtotal)}</strong>
                            <small>${i.cantidad} × ${U.soles(i.precio_unitario)}</small>
                        </div>
                    </div>`).join('')}
            </section>

            <!-- ===== ENTREGA Y PAGO ===== -->
            <div class="detalle-columnas">

                <section class="bloque-detalle">
                    <h3>Entrega</h3>
                    ${p.tipo_entrega === 'recojo'
                        ? '<p><i class="fa-solid fa-store"></i> Recojo en tienda — Chorrillos, ref. Parque Belén</p>'
                        : `<p><i class="fa-solid fa-location-dot"></i> ${U.esc(p.direccion_entrega || '')}</p>
                           <p>${U.esc(p.distrito || '')}, ${U.esc(p.provincia || '')} — ${U.esc(p.departamento || '')}</p>
                           ${p.referencia ? `<p class="mini">Ref.: ${U.esc(p.referencia)}</p>` : ''}`}
                    <p><i class="fa-solid fa-phone"></i> ${U.esc(p.telefono_contacto)}</p>
                    ${p.notas ? `<p class="mini"><i class="fa-regular fa-note-sticky"></i> ${U.esc(p.notas)}</p>` : ''}
                </section>

                <section class="bloque-detalle">
                    <h3>Pago</h3>
                    <div class="linea"><span>Subtotal</span><span>${U.soles(p.subtotal)}</span></div>
                    <div class="linea"><span>Envío</span><span>${Number(p.costo_envio) === 0 ? 'Gratis' : U.soles(p.costo_envio)}</span></div>
                    <div class="linea total"><span>Total</span><strong>${U.soles(p.total)}</strong></div>
                    <p class="estado-pago ${U.esc(p.estado_pago)}">
                        <i class="fa-solid fa-${p.estado_pago === 'pagado' ? 'circle-check' : 'clock'}"></i>
                        ${p.estado_pago === 'pagado' ? 'Pagado' : 'Pago pendiente'}
                    </p>
                    ${p.pagos.length ? `
                        <p class="mini">
                            ${U.esc(p.pagos[0].metodo)}${p.pagos[0].ultimos4 ? ` ****${U.esc(p.pagos[0].ultimos4)}` : ''}
                            · ref. ${U.esc(p.pagos[0].referencia)}
                        </p>` : ''}
                    ${p.estado_pago !== 'pagado' ? `
                        <button type="button" class="btn-principal ancho-total" id="btnPagarAhora">
                            Pagar ahora
                        </button>` : ''}
                </section>

            </div>

            <div class="acciones-detalle">
                <a href="https://wa.me/51907100820?text=${encodeURIComponent('Hola, consulto por mi pedido ' + p.codigo)}"
                   class="btn-secundario" target="_blank" rel="noopener">
                    <i class="fab fa-whatsapp"></i> Consultar por WhatsApp
                </a>
                ${(!p.cancelado && p.estado_orden < 4) ? `
                    <button type="button" class="btn-texto peligro" id="btnCancelar">
                        Cancelar pedido
                    </button>` : ''}
            </div>`;

        window.scrollTo({ top: 0, behavior: 'smooth' });

        zona.querySelector('#volverLista').addEventListener('click', () => {
            history.replaceState(null, '', 'cuenta.html');
            this.cargarPedidos();
        });

        const btnCancelar = zona.querySelector('#btnCancelar');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', async () => {
                if (!confirm('¿Seguro que quieres cancelar este pedido?')) return;
                try {
                    await API.post(`/pedidos/${p.codigo}/cancelar`, {});
                    U.aviso('Pedido cancelado');
                    this.verPedido(p.codigo);
                } catch (e) { U.aviso(e.message, 'error'); }
            });
        }

        const btnPagar = zona.querySelector('#btnPagarAhora');
        if (btnPagar) {
            btnPagar.addEventListener('click', async () => {
                btnPagar.disabled = true;
                btnPagar.innerHTML = '<span class="spinner"></span> Procesando...';
                try {
                    await API.post(`/pedidos/${p.codigo}/pagar`, { metodo: 'yape' });
                    U.aviso('Pago registrado');
                    this.verPedido(p.codigo);
                } catch (e) {
                    U.aviso(e.message, 'error');
                    btnPagar.disabled = false;
                    btnPagar.textContent = 'Pagar ahora';
                }
            });
        }
    },

    /* ---------------- Perfil ---------------- */

    perfil() {
        const u = API.usuario;
        document.getElementById('pNombres').value = u.nombres || '';
        document.getElementById('pApellidos').value = u.apellidos || '';
        document.getElementById('pEmail').value = u.email || '';
        document.getElementById('pTelefono').value = u.telefono || '';

        document.getElementById('formPerfil').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const r = await API.put('/auth/perfil', {
                    nombres: document.getElementById('pNombres').value.trim(),
                    apellidos: document.getElementById('pApellidos').value.trim(),
                    telefono: document.getElementById('pTelefono').value.trim(),
                });
                API.usuario = r.usuario;
                Header.pintarSesion();
                document.getElementById('saludo').textContent = `Hola, ${r.usuario.nombres}`;
                U.aviso('Datos actualizados');
            } catch (err) { U.aviso(err.message, 'error'); }
        });

        document.getElementById('formPassword').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await API.put('/auth/password', {
                    passwordActual: document.getElementById('passActual').value,
                    passwordNueva: document.getElementById('passNueva').value,
                });
                document.getElementById('formPassword').reset();
                U.aviso('Contraseña actualizada');
            } catch (err) { U.aviso(err.message, 'error'); }
        });
    },
};

document.addEventListener('DOMContentLoaded', () => Cuenta.iniciar());
