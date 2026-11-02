const Taller = {

    estados: [],
    pagina: 1,

    async iniciar() {
        if (!API.haySesion()) {
            location.href = 'login.html?volver=' + encodeURIComponent('empleado.html');
            return;
        }

        const u = API.usuario;

        if (!u || u.rol !== 'empleado') {
            location.href = u && u.rol === 'admin' ? 'admin/index.html' : 'index.html';
            return;
        }

        document.getElementById('quienSoy').textContent = `${u.nombres} ${u.apellidos}`;

        try {
            const r = await API.get('/admin/estados');
            this.estados = r.estados;
        } catch (e) { this.estados = []; }

        this.llenarFiltroEstados();

        document.getElementById('btnFiltrar')
            .addEventListener('click', () => this.cargar(1));

        document.getElementById('fBuscar').addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') this.cargar(1);
        });

        document.getElementById('btnTodo').addEventListener('click', () => {
            document.getElementById('fEstado').value = '';
            document.getElementById('fBuscar').value = '';
            this.cargar(1);
        });

        const codigo = U.parametro('pedido');
        if (codigo) this.verPedido(codigo);
        else this.cargar(1);
    },


    delTaller() {
        return this.estados.filter((e) => e.orden >= 3 && e.codigo !== 'cancelado');
    },


    llenarFiltroEstados() {
        const sel = document.getElementById('fEstado');

        sel.innerHTML = '<option value="">Todos</option>' +
            this.delTaller().map((e) =>
                `<option value="${U.esc(e.codigo)}">${U.esc(e.nombre)}</option>`).join('');
    },


    async cargar(pagina = 1) {
        this.pagina = pagina;

        const lista = document.getElementById('listaTaller');
        document.getElementById('detalleTaller').hidden = true;
        document.getElementById('filtrosTaller').hidden = false;
        lista.hidden = false;
        U.cargando(lista, 'Cargando pedidos...');

        const p = new URLSearchParams({ pagina });
        ['Estado', 'Buscar'].forEach((campo) => {
            const v = document.getElementById(`f${campo}`).value;
            if (v) p.set(campo.toLowerCase(), v);
        });

        let r;
        try {
            r = await API.get('/admin/pedidos?' + p.toString());
        } catch (e) {
            U.vacio(lista, 'fa-solid fa-plug-circle-xmark', 'No se pudo cargar', e.message);
            return;
        }

        if (r.total === 0) {
            U.vacio(lista, 'fa-solid fa-mug-hot', 'Nada en el taller',
                'No hay pedidos que coincidan con lo que buscas.');
            return;
        }

        lista.innerHTML = `
            <p class="sub">${r.total} pedido(s) en el taller.</p>

            <table class="tabla-admin">
                <thead>
                    <tr><th>Código</th><th>Fecha</th><th>Cliente</th>
                        <th>Estado</th><th>Total</th><th></th></tr>
                </thead>
                <tbody>
                    ${r.pedidos.map((x) => `
                        <tr>
                            <td><strong>${U.esc(x.codigo)}</strong></td>
                            <td>${U.fechaHora(x.creado_en)}</td>
                            <td>${U.esc(x.cliente)}<small>${U.esc(x.cliente_email)}</small></td>
                            <td>
                                <span class="insignia-estado" style="background:${U.esc(x.estado_color)}">
                                    ${U.esc(x.estado_nombre)}
                                </span>
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
                <div class="paginas">
                    ${Array.from({ length: r.paginas }, (_, i) => `
                        <button type="button" class="${i + 1 === r.pagina ? 'activa' : ''}"
                                data-pagina="${i + 1}">${i + 1}</button>`).join('')}
                </div>` : ''}`;

        lista.querySelectorAll('[data-codigo]').forEach((b) => {
            b.addEventListener('click', () => this.verPedido(b.dataset.codigo));
        });

        lista.querySelectorAll('[data-pagina]').forEach((b) => {
            b.addEventListener('click', () => this.cargar(Number(b.dataset.pagina)));
        });
    },


    async verPedido(codigo) {
        const zona = document.getElementById('detalleTaller');
        document.getElementById('listaTaller').hidden = true;
        document.getElementById('filtrosTaller').hidden = true;
        zona.hidden = false;
        U.cargando(zona, 'Cargando pedido...');

        let p;
        try {
            const r = await API.get(`/admin/pedidos/${encodeURIComponent(codigo)}`);
            p = r.pedido;
        } catch (e) {
            U.vacio(zona, 'fa-solid fa-circle-question', 'No se pudo abrir', e.message);
            return;
        }

        const permitidos = p.siguientes || [];
        const siguiente = this.estados.find((e) => permitidos.includes(e.codigo));

        zona.innerHTML = `
            <button type="button" class="btn-texto" id="volverTaller">
                <i class="fa-solid fa-arrow-left"></i> Volver a la lista
            </button>

            <div class="taller-detalle">

                <div class="taller-cabecera">
                    <div>
                        <h2>${U.esc(p.codigo)}</h2>
                        <p class="sub">
                            ${U.fechaHora(p.creado_en)} · ${U.esc(p.nombre_contacto)}
                            · ${U.esc(p.email_contacto)}
                        </p>
                    </div>
                    <span class="insignia-estado grande" style="background:${U.esc(p.estado_color)}">
                        ${U.esc(p.estado_nombre)}
                    </span>
                </div>

                <section class="tarjeta-taller">
                    <h3>Avanzar fabricación</h3>

                    <div class="campo">
                        <label for="nuevoEstado">Nuevo estado</label>
                        <select id="nuevoEstado" ${permitidos.length === 0 ? 'disabled' : ''}>
                            ${this.delTaller().map((e) => `
                                <option value="${U.esc(e.codigo)}"
                                    ${siguiente && e.codigo === siguiente.codigo ? 'selected' : ''}
                                    ${permitidos.includes(e.codigo) ? '' : 'disabled'}>
                                    ${e.orden}. ${U.esc(e.nombre)}${e.id === p.estado_id ? ' (actual)' : ''}
                                </option>`).join('')}
                        </select>
                        ${permitidos.length === 0 ? `
                            <small class="ayuda">Este pedido ya no se puede mover.</small>` : ''}
                    </div>

                    <div class="campo">
                        <label for="comentarioEstado">Comentario para el cliente (opcional)</label>
                        <textarea id="comentarioEstado" rows="2" maxlength="300"
                            placeholder="Ej.: Entró a prensa, sale mañana"></textarea>
                    </div>

                    <button type="button" class="btn-principal ancho-total" id="btnCambiarEstado"
                        ${permitidos.length === 0 ? 'disabled' : ''}>
                        <i class="fa-solid fa-arrow-right"></i> Actualizar estado
                    </button>
                </section>

                <section class="tarjeta-taller">
                    <h3>Productos a fabricar</h3>

                    ${p.items.map((i) => `
                        <div class="item-taller">
                            <span class="cuantos">${i.cantidad}&times;</span>
                            <div>
                                <strong>${U.esc(i.nombre_producto)}</strong>
                                <small>${U.esc(i.nombre_categoria)}</small>
                                <div class="pastillas">
                                    ${(i.opciones || []).map((o) =>
                                        `<span class="pastilla">${U.esc(o.atributo)}: <b>${U.esc(o.valor)}</b></span>`).join('')}
                                </div>
                                ${i.notas ? `<p class="nota-fabricar">${U.esc(i.notas)}</p>` : ''}
                            </div>
                            <div class="arte">
                                ${i.estampa_url ? `
                                    <a href="${U.esc(RAIZ + i.estampa_url)}" target="_blank" rel="noopener">
                                        <i class="fa-solid fa-download"></i> Diseño del cliente
                                    </a>` : '<span class="sin-arte">Sin diseño adjunto</span>'}
                            </div>
                        </div>`).join('')}
                </section>

                <section class="tarjeta-taller">
                    <h3>Entrega</h3>
                    <p class="dato">
                        <strong>${p.tipo_entrega === 'recojo' ? 'Recojo en tienda' : 'Delivery'}</strong>
                        ${p.tipo_entrega === 'recojo' ? '' : `
                            <br>${U.esc(p.direccion_entrega || '')}
                            ${p.distrito ? ' · ' + U.esc(p.distrito) : ''}`}
                    </p>
                    <p class="dato">Contacto: ${U.esc(p.telefono_contacto || '')}</p>
                    ${p.notas ? `<p class="dato">Indicaciones: ${U.esc(p.notas)}</p>` : ''}
                </section>

                <section class="tarjeta-taller">
                    <h3>Historial</h3>
                    <ul class="historial-taller">
                        ${(p.historial || []).map((h) => `
                            <li>
                                <strong>${U.esc(h.nombre || h.estado)}</strong>
                                <small>${U.fechaHora(h.creado_en)}</small>
                                ${h.comentario ? `<small>${U.esc(h.comentario)}</small>` : ''}
                            </li>`).join('')}
                    </ul>
                </section>

            </div>`;

        window.scrollTo({ top: 0, behavior: 'smooth' });

        zona.querySelector('#volverTaller')
            .addEventListener('click', () => this.cargar(this.pagina));

        const boton = zona.querySelector('#btnCambiarEstado');

        if (boton && permitidos.length) {
            boton.addEventListener('click', async () => {
                boton.disabled = true;

                try {
                    await API.patch(`/admin/pedidos/${encodeURIComponent(p.codigo)}/estado`, {
                        estado: document.getElementById('nuevoEstado').value,
                        comentario: document.getElementById('comentarioEstado').value.trim(),
                    });

                    U.aviso('Estado actualizado');
                    this.verPedido(p.codigo);

                } catch (e) {
                    U.aviso(e.message, 'error');
                    boton.disabled = false;
                }
            });
        }
    },
};

const RAIZ = API.base.replace(/\/api\/?$/, '') + '/';

document.addEventListener('DOMContentLoaded', () => Taller.iniciar());
