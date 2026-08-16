/* =====================================================================
   admin.js  ·  Panel de administración
   =====================================================================
   El control real de acceso está en el BACKEND. Este guard solo evita
   que un usuario común vea una pantalla rota: aunque alguien lo saltee,
   la API le responderá 403 a cada petición.
   ===================================================================== */

const Admin = {

    estados: [],

    async iniciar(pagina) {
        // Sin sesión: al login, y que vuelva aquí después de entrar.
        if (!API.haySesion()) {
            location.href = '../login.html?volver=' + encodeURIComponent('admin/index.html');
            return;
        }

        // Con sesión pero sin permisos: se va a la tienda.
        //
        // Mandarlo al login sería un bucle: el login vería que YA tiene sesión
        // y lo devolvería al panel, y así indefinidamente.
        if (!API.esAdmin()) {
            sessionStorage.setItem('vonvi_aviso', 'Esta sección es solo para administradores');
            location.href = '../index.html';
            return;
        }

        const u = API.usuario;
        const caja = document.getElementById('adminUsuario');
        if (caja) caja.textContent = `${u.nombres} ${u.apellidos}`;

        const salir = document.getElementById('adminSalir');
        if (salir) {
            salir.addEventListener('click', () => {
                API.cerrarSesion();
                location.href = '../index.html';
            });
        }

        try {
            const r = await API.get('/admin/estados');
            this.estados = r.estados;
        } catch (e) { /* se sigue sin el catálogo de estados */ }

        const menu = document.getElementById('adminMenuMovil');
        if (menu) {
            menu.addEventListener('click', () =>
                document.querySelector('.admin-lateral').classList.toggle('abierto'));
        }

        if (pagina === 'inicio') this.dashboard();
        if (pagina === 'pedidos') this.pedidos();
        if (pagina === 'productos') this.productos();
        if (pagina === 'cotizaciones') this.cotizaciones();
    },

    /* =================================================================
       DASHBOARD
       ================================================================= */

    async dashboard() {
        const zona = document.getElementById('contenidoAdmin');
        U.cargando(zona, 'Cargando métricas...');

        try {
            const r = await API.get('/admin/metricas');
            const m = r.metricas;
            const s = m.resumen;

            zona.innerHTML = `
                <div class="tarjetas-metrica">
                    ${this.tarjeta('fa-receipt', 'Pedidos totales', s.pedidos_total, '#8b5cf6')}
                    ${this.tarjeta('fa-sack-dollar', 'Cobrado', U.soles(s.ventas_cobradas), '#16a34a')}
                    ${this.tarjeta('fa-clock', 'Por cobrar', U.soles(s.por_cobrar), '#f59e0b')}
                    ${this.tarjeta('fa-calendar-day', 'Pedidos hoy', s.pedidos_hoy, '#ec4f95')}
                    ${this.tarjeta('fa-users', 'Clientes', m.clientes, '#06b6d4')}
                    ${this.tarjeta('fa-envelope-open-text', 'Cotizaciones nuevas', m.cotizaciones.nuevas || 0, '#3b82f6')}
                </div>

                <div class="admin-columnas">

                    <section class="tarjeta-admin">
                        <h2>Pedidos por estado</h2>
                        <div class="barras-estado">
                            ${m.porEstado.map((e) => {
                                const total = Math.max(...m.porEstado.map((x) => x.total), 1);
                                return `
                                <div class="fila-barra">
                                    <span class="nombre-estado">${U.esc(e.nombre)}</span>
                                    <div class="barra">
                                        <span style="width:${(e.total / total) * 100}%;background:${U.esc(e.color_hex)}"></span>
                                    </div>
                                    <strong>${e.total}</strong>
                                </div>`;
                            }).join('')}
                        </div>
                    </section>

                    <section class="tarjeta-admin">
                        <h2>Productos más vendidos</h2>
                        ${m.topProductos.length ? `
                            <table class="tabla-admin compacta">
                                <thead>
                                    <tr><th>Producto</th><th>Unidades</th><th>Ingresos</th></tr>
                                </thead>
                                <tbody>
                                    ${m.topProductos.map((t) => `
                                        <tr>
                                            <td>
                                                <strong>${U.esc(t.nombre_producto)}</strong>
                                                <small>${U.esc(t.nombre_categoria)}</small>
                                            </td>
                                            <td>${t.unidades}</td>
                                            <td>${U.soles(t.ingresos)}</td>
                                        </tr>`).join('')}
                                </tbody>
                            </table>`
                            : '<p class="sin-datos">Todavía no hay ventas registradas.</p>'}
                    </section>

                </div>`;

        } catch (e) {
            U.vacio(zona, 'fa-solid fa-triangle-exclamation', 'No pudimos cargar las métricas', e.message);
        }
    },

    tarjeta(icono, titulo, valor, color) {
        return `
            <div class="tarjeta-metrica">
                <span class="icono" style="background:${color}1a;color:${color}">
                    <i class="fa-solid ${icono}"></i>
                </span>
                <div>
                    <small>${U.esc(titulo)}</small>
                    <strong>${U.esc(String(valor))}</strong>
                </div>
            </div>`;
    },

    /* =================================================================
       PEDIDOS
       ================================================================= */

    async pedidos() {
        const zona = document.getElementById('contenidoAdmin');

        // Por defecto se muestran los últimos 30 días: sin estado
        // "Entregado", el filtro por fecha es lo que mantiene la lista
        // manejable con el tiempo.
        const hoy = new Date();
        const hace30 = new Date(hoy.getTime() - 30 * 86400000);
        const iso = (d) => d.toISOString().slice(0, 10);

        zona.innerHTML = `
            <div class="filtros-admin">
                <label>Desde <input type="date" id="fDesde" value="${iso(hace30)}"></label>
                <label>Hasta <input type="date" id="fHasta" value="${iso(hoy)}"></label>
                <label>Estado
                    <select id="fEstado">
                        <option value="">Todos</option>
                        ${this.estados.map((e) =>
                            `<option value="${U.esc(e.codigo)}">${U.esc(e.nombre)}</option>`).join('')}
                    </select>
                </label>
                <label>Pago
                    <select id="fPago">
                        <option value="">Todos</option>
                        <option value="pagado">Pagado</option>
                        <option value="pendiente">Pendiente</option>
                    </select>
                </label>
                <label class="crece">Buscar
                    <input type="search" id="fBuscar" placeholder="Código, cliente o correo">
                </label>
                <button type="button" class="btn-principal chico" id="btnBuscar">Filtrar</button>
                <button type="button" class="btn-texto" id="btnTodo">Ver todo</button>
            </div>

            <div id="listaAdminPedidos"></div>
            <div id="detalleAdminPedido" hidden></div>`;

        document.getElementById('btnBuscar').addEventListener('click', () => this.cargarPedidos());
        document.getElementById('fBuscar').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.cargarPedidos();
        });
        document.getElementById('btnTodo').addEventListener('click', () => {
            document.getElementById('fDesde').value = '';
            document.getElementById('fHasta').value = '';
            document.getElementById('fEstado').value = '';
            document.getElementById('fPago').value = '';
            document.getElementById('fBuscar').value = '';
            this.cargarPedidos();
        });

        const codigo = U.parametro('pedido');
        if (codigo) this.verPedido(codigo);
        else this.cargarPedidos();
    },

    async cargarPedidos(pagina = 1) {
        const lista = document.getElementById('listaAdminPedidos');
        document.getElementById('detalleAdminPedido').hidden = true;
        lista.hidden = false;
        U.cargando(lista, 'Cargando pedidos...');

        const p = new URLSearchParams({ pagina });
        ['Desde', 'Hasta', 'Estado', 'Pago', 'Buscar'].forEach((campo) => {
            const v = document.getElementById(`f${campo}`).value;
            if (v) p.set(campo.toLowerCase(), v);
        });

        try {
            const r = await API.get(`/admin/pedidos?${p}`);

            if (!r.pedidos.length) {
                U.vacio(lista, 'fa-solid fa-inbox', 'Sin pedidos',
                    'No hay pedidos que coincidan con estos filtros.');
                return;
            }

            lista.innerHTML = `
                <p class="conteo-resultados">${r.total} pedido(s) encontrados</p>
                <table class="tabla-admin">
                    <thead>
                        <tr>
                            <th>Código</th><th>Fecha</th><th>Cliente</th>
                            <th>Estado</th><th>Pago</th><th>Total</th><th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${r.pedidos.map((x) => `
                            <tr>
                                <td><strong>${U.esc(x.codigo)}</strong></td>
                                <td>${U.fecha(x.creado_en)}</td>
                                <td>
                                    ${U.esc(x.cliente)}
                                    <small>${U.esc(x.cliente_email)}</small>
                                </td>
                                <td>
                                    <span class="insignia-estado" style="background:${U.esc(x.estado_color)}">
                                        ${U.esc(x.estado_nombre)}
                                    </span>
                                </td>
                                <td>
                                    <span class="punto-pago ${U.esc(x.estado_pago)}"></span>
                                    ${x.estado_pago === 'pagado' ? 'Pagado' : 'Pendiente'}
                                </td>
                                <td><strong>${U.soles(x.total)}</strong></td>
                                <td>
                                    <button type="button" class="btn-secundario chico"
                                            data-codigo="${U.esc(x.codigo)}">Ver</button>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>
                ${r.paginas > 1 ? `
                    <div class="paginacion">
                        ${Array.from({ length: r.paginas }, (_, i) => `
                            <button type="button" class="${i + 1 === r.pagina ? 'activa' : ''}"
                                    data-pagina="${i + 1}">${i + 1}</button>`).join('')}
                    </div>` : ''}`;

            lista.querySelectorAll('[data-codigo]').forEach((b) =>
                b.addEventListener('click', () => this.verPedido(b.dataset.codigo)));

            lista.querySelectorAll('[data-pagina]').forEach((b) =>
                b.addEventListener('click', () => this.cargarPedidos(Number(b.dataset.pagina))));

        } catch (e) {
            U.vacio(lista, 'fa-solid fa-triangle-exclamation', 'Error', e.message);
        }
    },

    async verPedido(codigo) {
        const zona = document.getElementById('detalleAdminPedido');
        document.getElementById('listaAdminPedidos').hidden = true;
        zona.hidden = false;
        U.cargando(zona, 'Cargando pedido...');

        let p;
        try {
            const r = await API.get(`/admin/pedidos/${encodeURIComponent(codigo)}`);
            p = r.pedido;
        } catch (e) {
            U.vacio(zona, 'fa-solid fa-circle-question', 'Pedido no encontrado', e.message);
            return;
        }

        const raiz = API.base.replace('/api', '');
        const siguiente = this.estados.find((e) => e.orden === p.estado_orden + 1 && e.codigo !== 'cancelado');

        zona.innerHTML = `
            <button type="button" class="btn-texto" id="volverAdmin">
                <i class="fa-solid fa-arrow-left"></i> Volver a la lista
            </button>

            <div class="admin-detalle-cabecera">
                <div>
                    <h2>${U.esc(p.codigo)}</h2>
                    <small>${U.fechaHora(p.creado_en)} · ${U.esc(p.nombre_contacto)} · ${U.esc(p.email_contacto)}</small>
                </div>
                <span class="insignia-estado grande" style="background:${U.esc(p.estado_color)}">
                    ${U.esc(p.estado_nombre)}
                </span>
            </div>

            <div class="admin-columnas">

                <!-- Cambio de estado -->
                <section class="tarjeta-admin">
                    <h2>Avanzar fabricación</h2>
                    <p class="sub">Cada cambio se registra en el historial y el cliente lo ve al instante.</p>

                    <div class="campo">
                        <label for="nuevoEstado">Nuevo estado</label>
                        <select id="nuevoEstado">
                            ${this.estados.map((e) => `
                                <option value="${U.esc(e.codigo)}"
                                    ${siguiente && e.codigo === siguiente.codigo ? 'selected' : ''}
                                    ${e.id === p.estado_id ? 'disabled' : ''}>
                                    ${e.orden}. ${U.esc(e.nombre)}${e.id === p.estado_id ? ' (actual)' : ''}
                                </option>`).join('')}
                        </select>
                    </div>

                    <div class="campo">
                        <label for="comentarioEstado">Comentario para el cliente (opcional)</label>
                        <textarea id="comentarioEstado" rows="2" maxlength="300"
                            placeholder="Ej.: Te enviamos la propuesta por WhatsApp"></textarea>
                    </div>

                    <button type="button" class="btn-principal ancho-total" id="btnCambiarEstado">
                        <i class="fa-solid fa-arrow-right"></i> Actualizar estado
                    </button>

                    <h3 class="titulo-mini">Historial</h3>
                    <ul class="historial-admin">
                        ${p.historial.slice().reverse().map((h) => `
                            <li>
                                <span class="punto-hist" style="background:${U.esc(h.color_hex)}"></span>
                                <div>
                                    <strong>${U.esc(h.nombre)}</strong>
                                    <time>${U.fechaHora(h.creado_en)}</time>
                                    ${h.comentario ? `<p>${U.esc(h.comentario)}</p>` : ''}
                                </div>
                            </li>`).join('')}
                    </ul>
                </section>

                <!-- Datos -->
                <section class="tarjeta-admin">
                    <h2>Entrega y pago</h2>
                    <dl class="datos-admin">
                        <dt>Contacto</dt>
                        <dd>
                            ${U.esc(p.telefono_contacto)}
                            <a href="https://wa.me/51${U.esc(String(p.telefono_contacto).replace(/\D/g, '').slice(-9))}"
                               target="_blank" rel="noopener" class="mini-whatsapp">
                                <i class="fab fa-whatsapp"></i> Escribir
                            </a>
                        </dd>
                        <dt>Entrega</dt>
                        <dd>${p.tipo_entrega === 'recojo' ? 'Recojo en tienda'
                            : `${U.esc(p.direccion_entrega || '')}<br>${U.esc(p.distrito || '')}, ${U.esc(p.provincia || '')}
                               ${p.referencia ? `<br><small>Ref.: ${U.esc(p.referencia)}</small>` : ''}`}</dd>
                        <dt>Entrega estimada</dt>
                        <dd>${U.fecha(p.fecha_entrega_estimada)}</dd>
                        <dt>Subtotal</dt><dd>${U.soles(p.subtotal)}</dd>
                        <dt>Envío</dt><dd>${Number(p.costo_envio) === 0 ? 'Gratis' : U.soles(p.costo_envio)}</dd>
                        <dt>Total</dt><dd><strong class="total-admin">${U.soles(p.total)}</strong></dd>
                        <dt>Pago</dt>
                        <dd>
                            <span class="punto-pago ${U.esc(p.estado_pago)}"></span>
                            ${p.estado_pago === 'pagado' ? 'Pagado' : 'Pendiente'}
                            ${p.pagos.length ? `<small>${U.esc(p.pagos[0].metodo)} · ref. ${U.esc(p.pagos[0].referencia)}</small>` : ''}
                        </dd>
                        ${p.notas ? `<dt>Notas</dt><dd>${U.esc(p.notas)}</dd>` : ''}
                    </dl>
                </section>

            </div>

            <!-- Productos a fabricar -->
            <section class="tarjeta-admin">
                <h2>Productos a fabricar</h2>
                ${p.items.map((i) => `
                    <div class="item-fabricar">
                        <div class="item-info">
                            <span class="cantidad-fabricar">${i.cantidad}×</span>
                            <div>
                                <strong>${U.esc(i.nombre_producto)}</strong>
                                <small>${U.esc(i.nombre_categoria)}</small>
                                <div class="item-opciones">
                                    ${(i.opciones || []).map((o) =>
                                        `<span class="pastilla">${U.esc(o.atributo)}: <b>${U.esc(o.valor)}</b></span>`).join('')}
                                </div>
                                ${i.notas ? `<p class="nota-fabricar"><i class="fa-regular fa-note-sticky"></i> ${U.esc(i.notas)}</p>` : ''}
                            </div>
                        </div>
                        <div class="item-arte">
                            ${i.estampa_url ? `
                                <a href="${raiz}${U.esc(i.estampa_url)}" target="_blank" rel="noopener" class="descarga-arte">
                                    <img src="${raiz}${U.esc(i.estampa_url)}" alt="Diseño del cliente"
                                         onerror="this.replaceWith(Object.assign(document.createElement('i'),{className:'fa-regular fa-file-lines'}))">
                                    <span><i class="fa-solid fa-download"></i> ${U.esc(i.estampa_nombre)}</span>
                                </a>`
                                : '<span class="sin-arte">Sin diseño adjunto</span>'}
                        </div>
                        <div class="item-precio">
                            <strong>${U.soles(i.subtotal)}</strong>
                            <small>${U.soles(i.precio_unitario)} c/u</small>
                        </div>
                    </div>`).join('')}
            </section>`;

        window.scrollTo({ top: 0, behavior: 'smooth' });

        zona.querySelector('#volverAdmin').addEventListener('click', () => this.cargarPedidos());

        zona.querySelector('#btnCambiarEstado').addEventListener('click', async (ev) => {
            const boton = ev.currentTarget;
            boton.disabled = true;
            boton.innerHTML = '<span class="spinner"></span> Actualizando...';
            try {
                await API.patch(`/admin/pedidos/${p.codigo}/estado`, {
                    estado: document.getElementById('nuevoEstado').value,
                    comentario: document.getElementById('comentarioEstado').value.trim() || null,
                });
                U.aviso('Estado actualizado. El cliente ya lo puede ver.');
                this.verPedido(p.codigo);
            } catch (e) {
                U.aviso(e.message, 'error');
                boton.disabled = false;
                boton.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Actualizar estado';
            }
        });
    },

    /* =================================================================
       PRODUCTOS
       ================================================================= */

    async productos() {
        const zona = document.getElementById('contenidoAdmin');
        U.cargando(zona, 'Cargando productos...');

        try {
            const [rp, rc] = await Promise.all([
                API.get('/admin/productos'),
                API.get('/admin/categorias'),
            ]);

            zona.innerHTML = `
                <div class="cabecera-seccion">
                    <div>
                        <h2>Productos</h2>
                        <p class="sub">${rp.total} productos en ${rc.categorias.length} categorías</p>
                    </div>
                    <button type="button" class="btn-principal" id="btnNuevoProducto">
                        <i class="fa-solid fa-plus"></i> Nuevo producto
                    </button>
                </div>

                <table class="tabla-admin">
                    <thead>
                        <tr>
                            <th>Producto</th><th>Categoría</th><th>Precio</th>
                            <th>Mínimo</th><th>Opciones</th><th>Estado</th><th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rp.productos.map((p) => `
                            <tr class="${p.activo ? '' : 'inactiva'}">
                                <td>
                                    <strong>${U.esc(p.nombre)}</strong>
                                    <small>${U.esc(p.slug)}</small>
                                </td>
                                <td>${U.esc(p.categoria)}</td>
                                <td>
                                    ${U.soles(p.precio_base)}
                                    ${p.unidad_medida === 'm2' ? '<small>por m²</small>' : ''}
                                </td>
                                <td>${p.cantidad_minima} u.</td>
                                <td>${p.total_atributos}</td>
                                <td>
                                    <span class="pastilla-estado ${p.activo ? 'si' : 'no'}">
                                        ${p.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td class="acciones-fila">
                                    <button type="button" title="Editar" data-editar="${p.id}">
                                        <i class="fa-solid fa-pen"></i>
                                    </button>
                                    <button type="button" title="${p.activo ? 'Desactivar' : 'Activar'}"
                                            data-alternar="${p.id}" data-activo="${p.activo}">
                                        <i class="fa-solid fa-power-off"></i>
                                    </button>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>

                <h2 class="titulo-seccion-admin">Categorías</h2>
                <table class="tabla-admin">
                    <thead><tr><th>Categoría</th><th>Productos</th><th>Orden</th><th>Estado</th></tr></thead>
                    <tbody>
                        ${rc.categorias.map((c) => `
                            <tr class="${c.activo ? '' : 'inactiva'}">
                                <td><strong>${U.esc(c.nombre)}</strong><small>${U.esc(c.slug)}</small></td>
                                <td>${c.total_productos}</td>
                                <td>${c.orden}</td>
                                <td>
                                    <span class="pastilla-estado ${c.activo ? 'si' : 'no'}">
                                        ${c.activo ? 'Activa' : 'Inactiva'}
                                    </span>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>`;

            zona.querySelectorAll('[data-alternar]').forEach((b) => {
                b.addEventListener('click', async () => {
                    try {
                        await API.put(`/admin/productos/${b.dataset.alternar}`,
                            { activo: b.dataset.activo !== '1' });
                        U.aviso('Producto actualizado');
                        this.productos();
                    } catch (e) { U.aviso(e.message, 'error'); }
                });
            });

            zona.querySelectorAll('[data-editar]').forEach((b) => {
                b.addEventListener('click', () => {
                    const p = rp.productos.find((x) => String(x.id) === b.dataset.editar);
                    this.formProducto(p, rc.categorias);
                });
            });

            document.getElementById('btnNuevoProducto')
                .addEventListener('click', () => this.formProducto(null, rc.categorias));

        } catch (e) {
            U.vacio(zona, 'fa-solid fa-triangle-exclamation', 'Error', e.message);
        }
    },

    formProducto(producto, categorias) {
        const nuevo = !producto;
        const capa = document.createElement('div');
        capa.className = 'capa-modal';
        capa.innerHTML = `
            <div class="modal">
                <div class="modal-cabecera">
                    <h2>${nuevo ? 'Nuevo producto' : 'Editar producto'}</h2>
                    <button type="button" class="cerrar-modal">&times;</button>
                </div>
                <form id="formProducto">
                    <div class="campo">
                        <label for="mNombre">Nombre</label>
                        <input type="text" id="mNombre" value="${U.esc(producto ? producto.nombre : '')}" required>
                    </div>
                    <div class="campo">
                        <label for="mCategoria">Categoría</label>
                        <select id="mCategoria" required>
                            ${categorias.map((c) => `
                                <option value="${c.id}" ${producto && producto.categoria_id === c.id ? 'selected' : ''}>
                                    ${U.esc(c.nombre)}
                                </option>`).join('')}
                        </select>
                    </div>
                    <div class="campo">
                        <label for="mDescripcion">Descripción</label>
                        <textarea id="mDescripcion" rows="2">${U.esc(producto ? (producto.descripcion || '') : '')}</textarea>
                    </div>
                    <div class="fila-campos">
                        <div class="campo">
                            <label for="mPrecio">Precio base (S/)</label>
                            <input type="number" id="mPrecio" step="0.01" min="0"
                                   value="${producto ? producto.precio_base : ''}" required>
                        </div>
                        <div class="campo">
                            <label for="mUnidad">Se cobra por</label>
                            <select id="mUnidad">
                                <option value="unidad" ${producto && producto.unidad_medida === 'unidad' ? 'selected' : ''}>Unidad</option>
                                <option value="m2" ${producto && producto.unidad_medida === 'm2' ? 'selected' : ''}>Metro cuadrado</option>
                            </select>
                        </div>
                    </div>
                    <div class="fila-campos">
                        <div class="campo">
                            <label for="mMinimo">Cantidad mínima</label>
                            <input type="number" id="mMinimo" min="1" value="${producto ? producto.cantidad_minima : 1}">
                        </div>
                        <div class="campo">
                            <label for="mDias">Días de producción</label>
                            <input type="number" id="mDias" min="1" value="${producto ? producto.dias_produccion : 3}">
                        </div>
                    </div>
                    <div class="campo">
                        <label for="mImagen">Ruta de la imagen</label>
                        <input type="text" id="mImagen" placeholder="img/polos.jpg"
                               value="${U.esc(producto ? (producto.imagen || '') : '')}">
                    </div>
                    <label class="check">
                        <input type="checkbox" id="mEstampa" ${!producto || producto.estampa_obligatoria ? 'checked' : ''}>
                        <span>El cliente debe subir su diseño obligatoriamente</span>
                    </label>
                    <label class="check">
                        <input type="checkbox" id="mDestacado" ${producto && producto.destacado ? 'checked' : ''}>
                        <span>Mostrar como destacado en la portada</span>
                    </label>
                    <p id="errorModal" class="error-general" hidden></p>
                    <div class="modal-acciones">
                        <button type="button" class="btn-secundario cerrar-modal">Cancelar</button>
                        <button type="submit" class="btn-principal">${nuevo ? 'Crear' : 'Guardar'}</button>
                    </div>
                    ${nuevo ? `
                        <p class="nota-modal">
                            <i class="fa-solid fa-circle-info"></i>
                            Las opciones (talla, color...) se asignan después desde la base de datos
                            o duplicando un producto parecido.
                        </p>` : ''}
                </form>
            </div>`;

        document.body.appendChild(capa);
        requestAnimationFrame(() => capa.classList.add('visible'));

        const cerrar = () => { capa.classList.remove('visible'); setTimeout(() => capa.remove(), 220); };
        capa.querySelectorAll('.cerrar-modal').forEach((b) => b.addEventListener('click', cerrar));
        capa.addEventListener('click', (e) => { if (e.target === capa) cerrar(); });

        capa.querySelector('#formProducto').addEventListener('submit', async (e) => {
            e.preventDefault();
            const error = capa.querySelector('#errorModal');
            error.hidden = true;

            const datos = {
                nombre: capa.querySelector('#mNombre').value.trim(),
                categoriaId: Number(capa.querySelector('#mCategoria').value),
                descripcion: capa.querySelector('#mDescripcion').value.trim(),
                precioBase: Number(capa.querySelector('#mPrecio').value),
                unidadMedida: capa.querySelector('#mUnidad').value,
                cantidadMinima: Number(capa.querySelector('#mMinimo').value),
                diasProduccion: Number(capa.querySelector('#mDias').value),
                imagen: capa.querySelector('#mImagen').value.trim() || null,
                estampaObligatoria: capa.querySelector('#mEstampa').checked,
                destacado: capa.querySelector('#mDestacado').checked,
            };

            try {
                if (nuevo) await API.post('/admin/productos', datos);
                else await API.put(`/admin/productos/${producto.id}`, datos);
                U.aviso(nuevo ? 'Producto creado' : 'Producto actualizado');
                cerrar();
                this.productos();
            } catch (err) {
                error.textContent = err.message;
                error.hidden = false;
            }
        });
    },

    /* =================================================================
       COTIZACIONES
       ================================================================= */

    async cotizaciones() {
        const zona = document.getElementById('contenidoAdmin');
        U.cargando(zona, 'Cargando cotizaciones...');

        try {
            const r = await API.get('/admin/cotizaciones');

            if (!r.cotizaciones.length) {
                U.vacio(zona, 'fa-solid fa-envelope-open', 'Sin cotizaciones',
                    'Cuando alguien complete el formulario de contacto aparecerá aquí.');
                return;
            }

            zona.innerHTML = `
                <div class="cabecera-seccion">
                    <div>
                        <h2>Cotizaciones</h2>
                        <p class="sub">${r.total} solicitudes recibidas</p>
                    </div>
                </div>

                <div class="lista-cotizaciones">
                    ${r.cotizaciones.map((c) => `
                        <article class="tarjeta-cotizacion ${U.esc(c.estado)}">
                            <div class="cot-cabecera">
                                <div>
                                    <strong>${U.esc(c.nombre)}</strong>
                                    <small>${U.fechaHora(c.creado_en)}</small>
                                </div>
                                <select data-cot="${c.id}" class="select-estado">
                                    ${['nueva', 'en_proceso', 'respondida', 'cerrada'].map((e) => `
                                        <option value="${e}" ${c.estado === e ? 'selected' : ''}>
                                            ${e.replace('_', ' ')}
                                        </option>`).join('')}
                                </select>
                            </div>

                            <div class="cot-datos">
                                <span><i class="fa-regular fa-envelope"></i> ${U.esc(c.email)}</span>
                                <span><i class="fa-solid fa-phone"></i> ${U.esc(c.telefono)}</span>
                                ${c.producto_interes ? `<span><i class="fa-solid fa-tag"></i> ${U.esc(c.producto_interes)}</span>` : ''}
                                <span><i class="fa-solid fa-comment-dots"></i> Prefiere ${U.esc(c.preferencia_contacto)}</span>
                                ${c.usuario_id ? '<span class="registrado"><i class="fa-solid fa-user-check"></i> Cliente registrado</span>' : ''}
                            </div>

                            ${c.mensaje ? `<p class="cot-mensaje">${U.esc(c.mensaje)}</p>` : ''}

                            <div class="cot-acciones">
                                <a href="https://wa.me/51${U.esc(String(c.telefono).replace(/\D/g, '').slice(-9))}"
                                   target="_blank" rel="noopener" class="btn-secundario chico">
                                    <i class="fab fa-whatsapp"></i> WhatsApp
                                </a>
                                <a href="mailto:${U.esc(c.email)}" class="btn-secundario chico">
                                    <i class="fa-regular fa-envelope"></i> Correo
                                </a>
                            </div>
                        </article>`).join('')}
                </div>`;

            zona.querySelectorAll('.select-estado').forEach((s) => {
                s.addEventListener('change', async () => {
                    try {
                        await API.patch(`/admin/cotizaciones/${s.dataset.cot}`, { estado: s.value });
                        U.aviso('Cotización actualizada');
                        s.closest('.tarjeta-cotizacion').className = `tarjeta-cotizacion ${s.value}`;
                    } catch (e) { U.aviso(e.message, 'error'); }
                });
            });

        } catch (e) {
            U.vacio(zona, 'fa-solid fa-triangle-exclamation', 'Error', e.message);
        }
    },
};
