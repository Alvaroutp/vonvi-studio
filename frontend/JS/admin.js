const Admin = {

    estados: [],

    async iniciar(pagina) {
        if (!API.haySesion()) {
            location.href = '../login.html?volver=' + encodeURIComponent('admin/index.html');
            return;
        }

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
        if (pagina === 'empleados') this.empleados();
    },

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


    catCategoria: null,  
    catProducto: null,    

    async productos() {
        this.verCategorias();
    },

    zona() {
        return document.getElementById('contenidoAdmin');
    },
    
    async empleados() {
        const zona = this.zona();
        U.cargando(zona, 'Cargando empleados...');

        let r;
        try {
            r = await API.get('/admin/empleados');
        } catch (e) {
            U.vacio(zona, 'fa-solid fa-plug-circle-xmark', 'No se pudo cargar', e.message);
            return;
        }

        const reciente = this.claveNueva;
        this.claveNueva = null;

        zona.innerHTML = `
            <div class="cabecera-seccion">
                <div>
                    <h2>Empleados</h2>
                    <p class="sub">${r.empleados.length} cuenta(s) con acceso a los pedidos.</p>
                </div>
                <button type="button" class="btn-principal" data-nuevo>
                    <i class="fa-solid fa-user-plus"></i> Nuevo empleado
                </button>
            </div>

            ${reciente ? `
                <div class="clave-nueva">
                    <p>Cuenta creada para <strong>${U.esc(reciente.email)}</strong></p>
                    <p class="clave">${U.esc(reciente.clave)}</p>
                    <small>Anota esta contraseña ahora. No se vuelve a mostrar.</small>
                </div>` : ''}

            ${r.empleados.length === 0 ? `
                <div class="estado-vacio">
                    <i class="fa-solid fa-users"></i>
                    <h3>Todavía no hay empleados</h3>
                    <p>Crea la primera cuenta para que alguien pueda atender los pedidos.</p>
                </div>` : `
                <table class="tabla-admin">
                    <thead>
                        <tr><th>Empleado</th><th>Correo</th><th>Teléfono</th><th>Desde</th><th></th></tr>
                    </thead>
                    <tbody>
                        ${r.empleados.map((e) => `
                            <tr>
                                <td><strong>${U.esc(e.nombres)} ${U.esc(e.apellidos)}</strong></td>
                                <td>${U.esc(e.email)}</td>
                                <td>${U.esc(e.telefono || '—')}</td>
                                <td>${U.fecha(e.creado_en)}</td>
                                <td class="acciones-fila">
                                    <button type="button" title="Borrar cuenta" data-borrar-emp="${e.id}">
                                        <i class="fa-regular fa-trash-can"></i>
                                    </button>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>`}`;

        zona.querySelector('[data-nuevo]').addEventListener('click', () => this.formEmpleado());

        zona.querySelectorAll('[data-borrar-emp]').forEach((b) => {
            b.addEventListener('click', async () => {
                const e = r.empleados.find((x) => String(x.id) === b.dataset.borrarEmp);
                if (!confirm(`¿Borrar la cuenta de ${e.nombres} ${e.apellidos}?`)) return;
                try {
                    await API.borrar(`/admin/empleados/${e.id}`);
                    U.aviso('Cuenta eliminada');
                    this.empleados();
                } catch (err) { U.aviso(err.message, 'error'); }
            });
        });
    },

    formEmpleado() {
        this.modal({
            titulo: 'Nuevo empleado',
            campos: [
                { id: 'nombres', etiqueta: 'Nombres', valor: '', requerido: true },
                { id: 'apellidos', etiqueta: 'Apellidos', valor: '', requerido: true },
                { id: 'email', etiqueta: 'Correo', valor: '', requerido: true, placeholder: 'kelvin@vonvi.pe' },
                { id: 'telefono', etiqueta: 'Teléfono', valor: '', placeholder: '999 888 777' },
            ],
            guardar: async (datos) => {
                const r = await API.post('/admin/empleados', datos);
                this.claveNueva = { email: datos.email, clave: r.clave_temporal };
                U.aviso('Empleado creado');
                this.empleados();
            },
        });
    },



    migas(nivel) {
        const partes = [];

        if (nivel === 'categorias') {
            partes.push('<span class="actual">Categorías</span>');
        } else {
            partes.push('<button type="button" data-ir="categorias">Categorías</button>');
        }

        if (this.catCategoria && nivel !== 'categorias') {
            partes.push('<i class="fa-solid fa-chevron-right" style="font-size:.7rem"></i>');
            if (nivel === 'productos') {
                partes.push(`<span class="actual">${U.esc(this.catCategoria.nombre)}</span>`);
            } else {
                partes.push(`<button type="button" data-ir="productos">${U.esc(this.catCategoria.nombre)}</button>`);
            }
        }

        if (this.catProducto && nivel === 'producto') {
            partes.push('<i class="fa-solid fa-chevron-right" style="font-size:.7rem"></i>');
            partes.push(`<span class="actual">${U.esc(this.catProducto.nombre)}</span>`);
        }

        return `<div class="migas">${partes.join('')}</div>`;
    },

    conectarMigas() {
        this.zona().querySelectorAll('[data-ir]').forEach((b) => {
            b.addEventListener('click', () => {
                if (b.dataset.ir === 'categorias') this.verCategorias();
                if (b.dataset.ir === 'productos') this.verProductos(this.catCategoria);
            });
        });
    },


    async verCategorias() {
        this.catCategoria = null;
        this.catProducto = null;

        const zona = this.zona();
        U.cargando(zona, 'Cargando categorías...');

        let r;
        try {
            r = await API.get('/admin/categorias');
        } catch (e) {
            U.vacio(zona, 'fa-solid fa-plug-circle-xmark', 'No se pudo cargar', e.message);
            return;
        }

        zona.innerHTML = `
            ${this.migas('categorias')}

            <div class="cabecera-seccion">
                <div>
                    <h2>Categorías</h2>
                    <p class="sub">${r.total} categoría(s). Entra a una para ver sus productos.</p>
                </div>
                <button type="button" class="btn-principal" data-nueva>
                    <i class="fa-solid fa-plus"></i> Nueva categoría
                </button>
            </div>

            ${r.total === 0 ? `
                <div class="estado-vacio">
                    <i class="fa-solid fa-folder-open"></i>
                    <h3>Todavía no hay categorías</h3>
                    <p>Crea la primera para empezar a cargar productos.</p>
                </div>` : `
                <table class="tabla-admin">
                    <thead>
                        <tr><th>Categoría</th><th>Productos</th><th>Estado</th><th></th></tr>
                    </thead>
                    <tbody>
                        ${r.categorias.map((c) => `
                            <tr class="fila-clic ${c.activo ? '' : 'inactiva'}" data-entrar="${c.id}">
                                <td>
                                    <strong>${U.esc(c.nombre)}</strong>
                                    <small>${U.esc(c.slug)}</small>
                                </td>
                                <td>${c.total_productos}</td>
                                <td>
                                    <span class="pastilla-estado ${c.activo ? 'si' : 'no'}">
                                        ${c.activo ? 'Activa' : 'Inactiva'}
                                    </span>
                                </td>
                                <td class="acciones-fila">
                                    <button type="button" title="Editar" data-editar="${c.id}">
                                        <i class="fa-solid fa-pen"></i>
                                    </button>
                                    <button type="button" title="Borrar" data-borrar-cat="${c.id}">
                                        <i class="fa-regular fa-trash-can"></i>
                                    </button>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>`}`;

        this.conectarMigas();

        zona.querySelector('[data-nueva]').addEventListener('click', () => this.formCategoria(null));

        zona.querySelectorAll('[data-entrar]').forEach((fila) => {
            fila.addEventListener('click', (ev) => {
                if (ev.target.closest('button')) return;   // los botones no navegan
                const c = r.categorias.find((x) => String(x.id) === fila.dataset.entrar);
                this.verProductos(c);
            });
        });

        zona.querySelectorAll('[data-editar]').forEach((b) => {
            b.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.formCategoria(r.categorias.find((x) => String(x.id) === b.dataset.editar));
            });
        });

        zona.querySelectorAll('[data-borrar-cat]').forEach((b) => {
            b.addEventListener('click', async (ev) => {
                ev.stopPropagation();
                const c = r.categorias.find((x) => String(x.id) === b.dataset.borrarCat);
                if (!confirm(`¿Borrar la categoría "${c.nombre}"?`)) return;
                try {
                    await API.borrar(`/admin/categorias/${c.id}`);
                    U.aviso('Categoría eliminada');
                    this.verCategorias();
                } catch (e) { U.aviso(e.message, 'error'); }
            });
        });
    },


    formCategoria(categoria) {
        const nueva = !categoria;

        this.modal({
            titulo: nueva ? 'Nueva categoría' : 'Editar categoría',
            campos: [
                { id: 'nombre', etiqueta: 'Nombre', valor: categoria ? categoria.nombre : '', requerido: true },
                { id: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', valor: categoria ? (categoria.descripcion || '') : '' },
                { id: 'imagen', etiqueta: 'Imagen', tipo: 'imagen',valor: categoria ? (categoria.imagen || '') : '' },
            ],
            guardar: async (datos) => {
                if (nueva) await API.post('/admin/categorias', datos);
                else await API.put(`/admin/categorias/${categoria.id}`, datos);
                U.aviso(nueva ? 'Categoría creada' : 'Categoría actualizada');
                this.verCategorias();
            },
        });
    },

    async verProductos(categoria) {
        this.catCategoria = categoria;
        this.catProducto = null;

        const zona = this.zona();
        U.cargando(zona, 'Cargando productos...');

        let r;
        try {
            r = await API.get(`/admin/productos?categoria=${categoria.id}`);
        } catch (e) {
            U.vacio(zona, 'fa-solid fa-plug-circle-xmark', 'No se pudo cargar', e.message);
            return;
        }

        zona.innerHTML = `
            ${this.migas('productos')}

            <div class="cabecera-seccion">
                <div>
                    <h2>${U.esc(categoria.nombre)}</h2>
                    <p class="sub">${r.total} producto(s). Entra a uno para armar sus opciones.</p>
                </div>
                <button type="button" class="btn-principal" data-nuevo>
                    <i class="fa-solid fa-plus"></i> Nuevo producto
                </button>
            </div>

            ${r.total === 0 ? `
                <div class="estado-vacio">
                    <i class="fa-solid fa-box-open"></i>
                    <h3>Esta categoría todavía no tiene productos</h3>
                    <p>Crea el primero con su nombre y su precio base.</p>
                </div>` : `
                <table class="tabla-admin">
                    <thead>
                        <tr><th>Producto</th><th>Precio base</th><th>Atributos</th>
                            <th>Mínimo</th><th>Estado</th><th></th></tr>
                    </thead>
                    <tbody>
                        ${r.productos.map((p) => `
                            <tr class="fila-clic ${p.activo ? '' : 'inactiva'}" data-entrar="${p.id}">
                                <td><strong>${U.esc(p.nombre)}</strong><small>${U.esc(p.slug)}</small></td>
                                <td>${U.soles(p.precio_base)}</td>
                                <td>${p.total_atributos}</td>
                                <td>${p.cantidad_minima} u.</td>
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
                                    <button type="button" title="Borrar" data-borrar-prod="${p.id}">
                                        <i class="fa-regular fa-trash-can"></i>
                                    </button>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>`}`;

        this.conectarMigas();

        zona.querySelector('[data-nuevo]').addEventListener('click', () => this.formProducto(null));

        zona.querySelectorAll('[data-entrar]').forEach((fila) => {
            fila.addEventListener('click', (ev) => {
                if (ev.target.closest('button')) return;
                this.verProducto(Number(fila.dataset.entrar));
            });
        });

        zona.querySelectorAll('[data-editar]').forEach((b) => {
            b.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.formProducto(r.productos.find((x) => String(x.id) === b.dataset.editar));
            });
        });

        zona.querySelectorAll('[data-alternar]').forEach((b) => {
            b.addEventListener('click', async (ev) => {
                ev.stopPropagation();
                try {
                    const accion = b.dataset.activo === '1' ? 'desactivar' : 'activar';
                    await API.put(`/admin/productos/${b.dataset.alternar}/${accion}`);
                    U.aviso(accion === 'activar' ? 'Producto activado' : 'Producto desactivado');
                    this.verProductos(this.catCategoria);
                } catch (e) { U.aviso(e.message, 'error'); }
            });
        });

        zona.querySelectorAll('[data-borrar-prod]').forEach((b) => {
            b.addEventListener('click', async (ev) => {
                ev.stopPropagation();
                const p = r.productos.find((x) => String(x.id) === b.dataset.borrarProd);
                if (!confirm(`¿Borrar "${p.nombre}" con todos sus atributos y detalles?`)) return;
                try {
                    await API.borrar(`/admin/productos/${p.id}`);
                    U.aviso('Producto eliminado');
                    this.verProductos(this.catCategoria);
                } catch (e) { U.aviso(e.message, 'error'); }
            });
        });
    },


    formProducto(producto) {
        const nuevo = !producto;

        this.modal({
            titulo: nuevo ? 'Nuevo producto' : 'Editar producto',
            campos: [
                { id: 'nombre', etiqueta: 'Nombre', valor: producto ? producto.nombre : '', requerido: true },
                { id: 'precioBase', etiqueta: 'Precio base (S/)', tipo: 'number', paso: '0.01',
                  valor: producto ? producto.precio_base : '', requerido: true },
                { id: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea',
                  valor: producto ? (producto.descripcion || '') : '' },
                { id: 'cantidadMinima', etiqueta: 'Cantidad mínima', tipo: 'number',
                  valor: producto ? producto.cantidad_minima : 1 },
                { id: 'diasProduccion', etiqueta: 'Días de producción', tipo: 'number',
                  valor: producto ? producto.dias_produccion : 3 },
                { id: 'imagen', etiqueta: 'Imagen', tipo: 'imagen',
                  valor: producto ? (producto.imagen || '') : '' },
            ],
            guardar: async (datos) => {
                datos.categoriaId = this.catCategoria.id;
                if (nuevo) await API.post('/admin/productos', datos);
                else await API.put(`/admin/productos/${producto.id}`, datos);
                U.aviso(nuevo ? 'Producto creado' : 'Producto actualizado');
                this.verProductos(this.catCategoria);
            },
        });
    },


    async verProducto(productoId) {
        const zona = this.zona();
        U.cargando(zona, 'Cargando el producto...');

        let r;
        try {
            r = await API.get(`/admin/productos/${productoId}/arbol`);
        } catch (e) {
            U.vacio(zona, 'fa-solid fa-plug-circle-xmark', 'No se pudo cargar', e.message);
            return;
        }

        this.catProducto = r.producto;

        zona.innerHTML = `
            ${this.migas('producto')}

            <div class="cab-producto">
                <div>
                    <h2>${U.esc(r.producto.nombre)}</h2>
                    <p class="sub">Precio base del producto, antes de los recargos</p>
                </div>
                <div class="precio">${U.soles(r.producto.precio_base)}</div>
            </div>

            <div class="cabecera-seccion">
                <div>
                    <h2>Atributos</h2>
                    <p class="sub">Cada atributo es una pregunta. Dentro van sus detalles con el recargo.</p>
                </div>
                <button type="button" class="btn-principal" data-nuevo-atributo>
                    <i class="fa-solid fa-plus"></i> Nuevo atributo
                </button>
            </div>

            ${r.atributos.length === 0 ? `
                <div class="estado-vacio">
                    <i class="fa-solid fa-sliders"></i>
                    <h3>Este producto todavía no tiene atributos</h3>
                    <p>Crea uno, por ejemplo Talla o Color.</p>
                </div>` :
                r.atributos.map((a) => this.pintarAtributo(a)).join('')}`;

        this.conectarMigas();

        zona.querySelector('[data-nuevo-atributo]')
            .addEventListener('click', () => this.formAtributo());

        zona.querySelectorAll('[data-editar-atributo]').forEach((b) => {
            b.addEventListener('click', () => {
                this.formAtributo(r.atributos.find((x) => String(x.id) === b.dataset.editarAtributo));
            });
        });

        zona.querySelectorAll('[data-borrar-atributo]').forEach((b) => {
            b.addEventListener('click', async () => {
                if (!confirm('¿Borrar este atributo y todos sus detalles?')) return;
                try {
                    await API.borrar(`/admin/atributos/${b.dataset.borrarAtributo}`);
                    U.aviso('Atributo eliminado');
                    this.verProducto(productoId);
                } catch (e) { U.aviso(e.message, 'error'); }
            });
        });

        zona.querySelectorAll('[data-nuevo-detalle]').forEach((b) => {
            b.addEventListener('click', () => {
                const a = r.atributos.find((x) => String(x.id) === b.dataset.nuevoDetalle);
                this.formDetalle(a, null);
            });
        });

        zona.querySelectorAll('[data-editar-detalle]').forEach((b) => {
            b.addEventListener('click', () => {
                const a = r.atributos.find((x) => String(x.id) === b.dataset.atributo);
                const d = a.detalles.find((x) => String(x.id) === b.dataset.editarDetalle);
                this.formDetalle(a, d);
            });
        });

        zona.querySelectorAll('[data-borrar-detalle]').forEach((b) => {
            b.addEventListener('click', async () => {
                if (!confirm('¿Borrar este detalle?')) return;
                try {
                    await API.borrar(`/admin/detalles/${b.dataset.borrarDetalle}`);
                    U.aviso('Detalle eliminado');
                    this.verProducto(productoId);
                } catch (e) { U.aviso(e.message, 'error'); }
            });
        });
    },


    pintarAtributo(a) {
        const NOMBRE_TIPO = { select: 'lista', color: 'color', radio: 'botones' };

        return `
            <div class="atributo">

                <div class="atributo-cab">
                    <div>
                        <h3>${U.esc(a.nombre)}</h3>
                        <span class="tipo">${NOMBRE_TIPO[a.tipo] || a.tipo}</span>
                    </div>
                    <div class="atributo-acciones">
                        <button type="button" title="Editar atributo"
                                data-editar-atributo="${a.id}">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button type="button" class="borrar" title="Borrar atributo"
                                data-borrar-atributo="${a.id}">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </div>

                ${a.detalles.length === 0
                    ? '<p class="sin-detalles">Sin detalles todavía.</p>'
                    : a.detalles.map((d) => `
                        <div class="detalle">
                            ${d.color_hex
                                ? `<span class="muestra" style="background:${U.esc(d.color_hex)}"></span>`
                                : ''}
                            <span class="valor">${U.esc(d.valor)}</span>
                            <span class="recargo ${Number(d.recargo) === 0 ? 'cero' : ''}">
                                ${Number(d.recargo) === 0 ? 'sin recargo' : '+ ' + U.soles(d.recargo)}
                            </span>
                            <span class="acciones">
                                <button type="button" title="Editar"
                                        data-editar-detalle="${d.id}" data-atributo="${a.id}">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button type="button" class="borrar" title="Borrar"
                                        data-borrar-detalle="${d.id}">
                                    <i class="fa-regular fa-trash-can"></i>
                                </button>
                            </span>
                        </div>`).join('')}

                <div class="pie-atributo">
                    <button type="button" class="btn-texto" data-nuevo-detalle="${a.id}">
                        <i class="fa-solid fa-plus"></i> Nuevo detalle
                    </button>
                </div>

            </div>`;
    },


    formAtributo(atributo) {
        const nuevo = !atributo;

        this.modal({
            titulo: nuevo ? 'Nuevo atributo' : 'Editar atributo',
            campos: [
                { id: 'nombre', etiqueta: 'Nombre', placeholder: 'Talla, Color, Capacidad...',
                  valor: atributo ? atributo.nombre : '', requerido: true },
                { id: 'tipo', etiqueta: 'Cómo se muestra al cliente', tipo: 'select',
                  valor: atributo ? atributo.tipo : 'select',
                  opciones: [
                      { valor: 'select', texto: 'Lista desplegable' },
                      { valor: 'color', texto: 'Círculos de color' },
                      { valor: 'radio', texto: 'Botones' },
                  ] },
            ],
            guardar: async (datos) => {
                if (nuevo) {
                    datos.productoId = this.catProducto.id;
                    await API.post('/admin/atributos', datos);
                } else {
                    await API.put(`/admin/atributos/${atributo.id}`, datos);
                }
                U.aviso(nuevo ? 'Atributo creado' : 'Atributo actualizado');
                this.verProducto(this.catProducto.id);
            },
        });
    },


    formDetalle(atributo, detalle) {
        const nuevo = !detalle;

        const campos = [
            { id: 'valor', etiqueta: 'Valor', placeholder: 'M, Rojo, 500 ml...',
              valor: detalle ? detalle.valor : '', requerido: true },
            { id: 'recargo', etiqueta: 'Recargo (S/)', tipo: 'number', paso: '0.01',
              valor: detalle ? detalle.recargo : 0 },
        ];

        // El color solo se pregunta si el atributo es de tipo color
        if (atributo.tipo === 'color') {
            campos.push({ id: 'colorHex', etiqueta: 'Color', tipo: 'color',
                          valor: detalle ? (detalle.color_hex || '#000000') : '#000000' });
        }

        this.modal({
            titulo: nuevo ? `Nuevo detalle de ${atributo.nombre}` : 'Editar detalle',
            campos,
            guardar: async (datos) => {
                if (nuevo) {
                    datos.atributoId = atributo.id;
                    await API.post('/admin/detalles', datos);
                } else {
                    await API.put(`/admin/detalles/${detalle.id}`, datos);
                }
                U.aviso(nuevo ? 'Detalle creado' : 'Detalle actualizado');
                this.verProducto(this.catProducto.id);
            },
        });
    },


    modal({ titulo, campos, guardar }) {
        const capa = document.createElement('div');
        capa.className = 'capa-modal';

        capa.innerHTML = `
            <div class="modal">

                <div class="modal-cabecera">
                    <h2>${U.esc(titulo)}</h2>
                    <button type="button" class="cerrar-modal">&times;</button>
                </div>

                <form id="formCatalogo">
                    ${campos.map((c) => `
                        <div class="campo">
                            <label for="c_${c.id}">${U.esc(c.etiqueta)}</label>
                            ${this.campo(c)}
                        </div>`).join('')}

                    <p id="errorCatalogo" class="error-general" hidden></p>

                    <div class="modal-acciones">
                        <button type="button" class="btn-secundario cerrar-modal">Cancelar</button>
                        <button type="submit" class="btn-principal">Guardar</button>
                    </div>
                </form>

            </div>`;

        document.body.appendChild(capa);
        requestAnimationFrame(() => capa.classList.add('visible'));

        const cerrar = () => {
            capa.classList.remove('visible');
            setTimeout(() => capa.remove(), 220);
        };

        capa.querySelectorAll('.cerrar-modal').forEach((b) => b.addEventListener('click', cerrar));
        capa.addEventListener('click', (ev) => { if (ev.target === capa) cerrar(); });

        const primero = capa.querySelector('input, select, textarea');
        if (primero) primero.focus();

        capa.querySelector('#formCatalogo').addEventListener('submit', async (ev) => {
            ev.preventDefault();

            const error = capa.querySelector('#errorCatalogo');
            error.hidden = true;

            // Primero se suben las imagenes, y se guarda la ruta que devuelve el servidor
            for (const c of campos.filter((x) => x.tipo === 'imagen')) {
                const entrada = capa.querySelector('#c_' + c.id);
                if (entrada.files.length === 0) continue;

                const cuerpo = new FormData();
                cuerpo.append('imagen', entrada.files[0]);
                try {
                    const r = await API.pedir('/admin/imagenes', { method: 'POST', body: cuerpo });
                    capa.querySelector('#c_' + c.id + '_ruta').value = r.ruta;
                } catch (err) {
                    error.textContent = err.message;
                    error.hidden = false;
                    return;
                }
            }

            const datos = {};
            campos.forEach((c) => {
                if (c.tipo === 'imagen') {
                    datos[c.id] = capa.querySelector('#c_' + c.id + '_ruta').value;
                    return;
                }
                const el = capa.querySelector('#c_' + c.id);
                datos[c.id] = c.tipo === 'number' ? Number(el.value) : el.value.trim();
            });

            try {
                await guardar(datos);
                cerrar();
            } catch (err) {
                error.textContent = err.message;
                error.hidden = false;
            }
        });
    },


    campo(c) {
        const id = 'c_' + c.id;
        const req = c.requerido ? 'required' : '';

        if (c.tipo === 'textarea') {
            return `<textarea id="${id}" rows="3" ${req}>${U.esc(c.valor)}</textarea>`;
        }

        if (c.tipo === 'select') {
            return `<select id="${id}">
                ${c.opciones.map((o) => `
                    <option value="${o.valor}" ${o.valor === c.valor ? 'selected' : ''}>
                        ${U.esc(o.texto)}
                    </option>`).join('')}
            </select>`;
        }

        if (c.tipo === 'number') {
            return `<input type="number" id="${id}" min="0" step="${c.paso || '1'}"
                           value="${U.esc(c.valor)}" ${req}>`;
        }

                if (c.tipo === 'imagen') {
            return `<input type="file" id="${id}" accept="image/jpeg,image/png,image/webp">
                    <input type="hidden" id="${id}_ruta" value="${U.esc(c.valor || '')}">
                    <small>${c.valor ? 'Actual: ' + U.esc(c.valor)
                                     : 'Si no eliges nada, se queda como esta.'}</small>`;
        }

        if (c.tipo === 'color') {
            return `<input type="color" id="${id}" value="${U.esc(c.valor)}"
                           style="height:44px;padding:4px">`;
        }

        return `<input type="text" id="${id}" value="${U.esc(c.valor)}"
                       placeholder="${U.esc(c.placeholder || '')}" ${req}>`;
    },



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