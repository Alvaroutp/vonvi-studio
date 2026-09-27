/* =====================================================================
   configurador.js  ·  producto.html
   =====================================================================
   Dibuja las opciones del producto (talla, color, material...) según lo
   que devuelve la API, permite subir la estampa y muestra el precio en
   vivo.

   IMPORTANTE: el precio NO se calcula aquí. Cada vez que el usuario
   cambia algo se le pregunta al backend. Si el cálculo viviera en el
   navegador, cualquiera podría abrir la consola y agregar un polo a S/ 1.
   ===================================================================== */

const Configurador = {

    producto: null,
    seleccion: {},
    archivoId: null,
    temporizador: null,

    async iniciar() {
        const slug = U.parametro('p');
        if (!slug) { location.href = 'productos.html'; return; }

        try {
            const r = await API.get(`/productos/${encodeURIComponent(slug)}`);
            this.producto = r.producto;
        } catch (e) {
            document.getElementById('cargando').innerHTML =
                `<div class="estado-vacio">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <h3>No pudimos cargar el producto</h3>
                    <p>${U.esc(e.message)}</p>
                    <a href="productos.html" class="btn-principal">Volver al catálogo</a>
                 </div>`;
            return;
        }

        this.pintarCabecera();
        this.pintarAtributos();
        this.prepararEstampa();
        this.prepararCantidad();

        document.getElementById('cargando').hidden = true;
        document.getElementById('configurador').hidden = false;

        document.getElementById('formConfig')
            .addEventListener('submit', (e) => { e.preventDefault(); this.agregarAlCarrito(); });

        this.cotizar();
    },

    pintarCabecera() {
        const p = this.producto;
        document.title = `${p.nombre} | Vonvi Studio Perú`;

        document.getElementById('nombreProducto').textContent = p.nombre;
        document.getElementById('descripcionProducto').textContent = p.descripcion || '';
        document.getElementById('etiquetaCategoria').textContent = p.categoria_nombre;

        const img = document.getElementById('imagenProducto');
        img.src = p.imagen || 'img/logo.png';
        img.alt = p.nombre;

        document.getElementById('migaProducto').textContent = p.nombre;
        const miga = document.getElementById('migaCategoria');
        miga.textContent = p.categoria_nombre;
        miga.href = `categoria.html?cat=${p.categoria_slug}`;

        document.getElementById('datoEntrega').innerHTML =
            `<i class="fa-regular fa-clock"></i> Producción: ${p.dias_produccion} día(s) hábiles`;

        const minimo = document.getElementById('datoMinimo');
        if (p.cantidad_minima > 1) {
            minimo.innerHTML = `<i class="fa-solid fa-layer-group"></i> Pedido mínimo: ${p.cantidad_minima} unidades`;
        } else {
            minimo.hidden = true;
        }

        // Escalas de descuento por volumen
        const aviso = document.getElementById('avisoEscalas');
        if (p.escalas && p.escalas.length) {
            aviso.innerHTML = p.escalas
                .map((e) => `<span>Desde ${e.cantidad_desde} u. → ${U.soles(e.precio_unitario)} c/u</span>`)
                .join('');
        }
    },

    /**
     * Dibuja un control distinto según el tipo de atributo:
     *   color  → círculos de color
     *   radio  → botones seleccionables
     *   numero → campo numérico con su unidad
     *   select → lista desplegable
     */
    pintarAtributos() {
        const zona = document.getElementById('camposAtributos');
        zona.innerHTML = '';

        for (const atributo of this.producto.atributos) {
            const campo = document.createElement('div');
            campo.className = 'campo-config';

            const marca = atributo.obligatorio ? '<span class="obligatorio">*</span>' : '';
            let control = '';

            if (atributo.tipo_input === 'numero') {
                const min = atributo.valor_min ? ` min="${atributo.valor_min}"` : '';
                const max = atributo.valor_max ? ` max="${atributo.valor_max}"` : '';
                const rango = (atributo.valor_min && atributo.valor_max)
                    ? `<small class="ayuda">Entre ${atributo.valor_min} y ${atributo.valor_max} ${atributo.unidad || ''}</small>`
                    : '';
                control = `
                    <div class="campo-numero">
                        <input type="number" data-slug="${atributo.slug}"${min}${max} step="1"
                               placeholder="0" inputmode="numeric">
                        <span class="unidad">${U.esc(atributo.unidad || '')}</span>
                    </div>${rango}`;

            } else if (atributo.tipo_input === 'color') {
                control = `<div class="opciones-color">` + atributo.valores.map((v) => `
                    <button type="button" class="chip-color" data-slug="${atributo.slug}" data-id="${v.id}"
                            title="${U.esc(v.valor)}${Number(v.recargo) > 0 ? ' (+' + U.soles(v.recargo) + ')' : ''}">
                        <span style="background:${v.codigo_hex || '#ccc'}"></span>
                        <small>${U.esc(v.valor)}</small>
                    </button>`).join('') + `</div>`;

            } else if (atributo.tipo_input === 'radio') {
                control = `<div class="opciones-botones">` + atributo.valores.map((v) => `
                    <button type="button" class="chip-opcion" data-slug="${atributo.slug}" data-id="${v.id}">
                        ${U.esc(v.valor)}
                        ${Number(v.recargo) > 0 ? `<em>+${U.soles(v.recargo)}</em>` : ''}
                    </button>`).join('') + `</div>`;

            } else {
                control = `
                    <select data-slug="${atributo.slug}">
                        <option value="">Selecciona ${U.esc(atributo.nombre.toLowerCase())}</option>
                        ${atributo.valores.map((v) => `
                            <option value="${v.id}">
                                ${U.esc(v.valor)}${Number(v.recargo) > 0 ? ` (+${U.soles(v.recargo)})` : ''}
                            </option>`).join('')}
                    </select>`;
            }

            campo.innerHTML = `
                <label class="etiqueta-campo">${U.esc(atributo.nombre)} ${marca}</label>
                ${control}`;
            zona.appendChild(campo);
        }

        // --- Eventos ---
        zona.querySelectorAll('.chip-color, .chip-opcion').forEach((btn) => {
            btn.addEventListener('click', () => {
                const slug = btn.dataset.slug;
                btn.parentElement.querySelectorAll('button')
                    .forEach((b) => b.classList.remove('elegido'));
                btn.classList.add('elegido');
                this.seleccion[slug] = Number(btn.dataset.id);
                this.cotizar();
            });
        });

        zona.querySelectorAll('select').forEach((sel) => {
            sel.addEventListener('change', () => {
                const v = sel.value;
                if (v) this.seleccion[sel.dataset.slug] = Number(v);
                else delete this.seleccion[sel.dataset.slug];
                this.cotizar();
            });
        });

        zona.querySelectorAll('input[type="number"][data-slug]').forEach((inp) => {
            inp.addEventListener('input', () => {
                const v = inp.value;
                if (v) this.seleccion[inp.dataset.slug] = Number(v);
                else delete this.seleccion[inp.dataset.slug];
                this.cotizarConEspera();
            });
        });
    },

    prepararCantidad() {
        const input = document.getElementById('cantidad');
        input.value = this.producto.cantidad_minima;
        input.min = this.producto.cantidad_minima;

        document.getElementById('mas').addEventListener('click', () => {
            input.value = Number(input.value) + 1;
            this.cotizar();
        });
        document.getElementById('menos').addEventListener('click', () => {
            const n = Number(input.value) - 1;
            input.value = Math.max(this.producto.cantidad_minima, n);
            this.cotizar();
        });
        input.addEventListener('input', () => this.cotizarConEspera());
    },

    /* ---------------- Subida de la estampa ---------------- */

    prepararEstampa() {
        const bloque = document.getElementById('bloqueEstampa');
        if (!this.producto.permite_estampa) { bloque.hidden = true; return; }

        if (this.producto.estampa_obligatoria) {
            document.getElementById('marcaEstampa').hidden = false;
        }

        const zona = document.getElementById('zonaSubida');
        const input = document.getElementById('inputEstampa');

        zona.addEventListener('click', () => input.click());
        input.addEventListener('change', () => {
            if (input.files.length) this.subirArchivo(input.files[0]);
        });

        // Arrastrar y soltar
        ['dragenter', 'dragover'].forEach((ev) =>
            zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('arrastrando'); }));
        ['dragleave', 'drop'].forEach((ev) =>
            zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.remove('arrastrando'); }));
        zona.addEventListener('drop', (e) => {
            if (e.dataTransfer.files.length) this.subirArchivo(e.dataTransfer.files[0]);
        });

        document.getElementById('quitarArchivo').addEventListener('click', () => {
            this.archivoId = null;
            document.getElementById('archivoSubido').hidden = true;
            document.getElementById('zonaSubida').hidden = false;
            document.getElementById('previewEstampa').hidden = true;
            input.value = '';
            this.cotizar();
        });
    },

    async subirArchivo(archivo) {
        // Se valida el tamaño antes de subir: así el usuario no espera
        // a que se transfieran 40 MB para recibir el rechazo.
        if (archivo.size > 10 * 1024 * 1024) {
            U.aviso('El archivo supera los 10 MB', 'error');
            return;
        }

        const zona = document.getElementById('zonaSubida');
        zona.classList.add('subiendo');
        zona.querySelector('p').innerHTML = '<strong>Subiendo...</strong>';

        try {
            const datos = new FormData();
            datos.append('archivo', archivo);
            const r = await API.pedir('/archivos/estampa', { method: 'POST', body: datos });

            this.archivoId = r.archivo.id;

            document.getElementById('nombreArchivo').textContent = r.archivo.nombre_original;
            document.getElementById('pesoArchivo').textContent = `${r.archivo.tamano_kb} KB`;
            document.getElementById('archivoSubido').hidden = false;
            zona.hidden = true;

            // Vista previa sobre la foto del producto
            if (archivo.type.startsWith('image/')) {
                const preview = document.getElementById('previewEstampa');
                preview.src = URL.createObjectURL(archivo);
                preview.hidden = false;
            }

            U.aviso('Diseño subido correctamente');
            this.cotizar();

        } catch (e) {
            U.aviso(e.message, 'error');
        } finally {
            zona.classList.remove('subiendo');
            zona.querySelector('p').innerHTML = '<strong>Haz clic o arrastra tu archivo aquí</strong>';
        }
    },

    /* ---------------- Precio en vivo ---------------- */

    /** Espera a que el usuario deje de escribir antes de consultar. */
    cotizarConEspera() {
        clearTimeout(this.temporizador);
        this.temporizador = setTimeout(() => this.cotizar(), 400);
    },

    async cotizar() {
        const cantidad = Number(document.getElementById('cantidad').value) || 1;
        const error = document.getElementById('errorConfig');
        const boton = document.getElementById('btnAgregar');

        try {
            const r = await API.post(
                `/productos/${this.producto.id}/precio`,
                { seleccion: this.seleccion, cantidad }
            );

            const d = r.desglose;
            const filas = [];

            if (d.metros_cuadrados) {
                filas.push(['Medida', `${d.metros_cuadrados} m²`]);
                filas.push([`Precio por m²`, U.soles(d.precio_lista)]);
            } else {
                filas.push(['Precio unitario base', U.soles(d.precio_base_aplicado)]);
            }
            if (d.escala_aplicada) {
                filas.push(['Descuento por volumen',
                    `aplicado desde ${d.escala_aplicada.cantidad_desde} u.`]);
            }
            if (Number(d.recargos) > 0) {
                filas.push(['Personalización', `+ ${U.soles(d.recargos)}`]);
            }
            filas.push([`${r.cantidad} × ${U.soles(r.precio_unitario)}`, U.soles(r.subtotal)]);

            document.getElementById('desglosePrecio').innerHTML = filas
                .map(([a, b]) => `<div><span>${U.esc(a)}</span><span>${U.esc(b)}</span></div>`)
                .join('');

            document.getElementById('precioTotal').textContent = U.soles(r.subtotal);

            error.hidden = true;
            boton.disabled = false;

        } catch (e) {
            document.getElementById('desglosePrecio').innerHTML = '';
            document.getElementById('precioTotal').textContent = '—';
            error.textContent = e.message;
            error.hidden = false;
            boton.disabled = true;
        }
    },

    /* ---------------- Agregar al carrito ---------------- */

    async agregarAlCarrito() {
        const boton = document.getElementById('btnAgregar');

        if (this.producto.estampa_obligatoria && !this.archivoId) {
            U.aviso('Este producto necesita que subas tu diseño', 'error');
            document.getElementById('zonaSubida').classList.add('resaltado');
            setTimeout(() => document.getElementById('zonaSubida').classList.remove('resaltado'), 1800);
            return;
        }

        boton.disabled = true;
        boton.innerHTML = '<span class="spinner"></span> Agregando...';

        try {
            const r = await API.post('/carrito/items', {
                producto: this.producto.slug,
                seleccion: this.seleccion,
                cantidad: Number(document.getElementById('cantidad').value) || 1,
                archivoDisenoId: this.archivoId,
                notas: document.getElementById('notas').value.trim() || null,
            });

            if (r.carrito.token) API.tokenCarrito = r.carrito.token;

            await Header.actualizarCarrito();
            this.mostrarConfirmacion(r.carrito.resumen);

        } catch (e) {
            U.aviso(e.message, 'error');
        } finally {
            boton.disabled = false;
            boton.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Agregar al carrito';
        }
    },

    mostrarConfirmacion(resumen) {
        const capa = document.createElement('div');
        capa.className = 'capa-confirmacion';
        capa.innerHTML = `
            <div class="tarjeta-confirmacion">
                <i class="fa-solid fa-circle-check"></i>
                <h3>Agregado al carrito</h3>
                <p>${U.esc(this.producto.nombre)}</p>
                <div class="mini-resumen">
                    <span>${resumen.total_articulos} artículo(s)</span>
                    <strong>${U.soles(resumen.subtotal)}</strong>
                </div>
                <div class="acciones-confirmacion">
                    <button type="button" class="btn-secundario" id="seguirComprando">Seguir comprando</button>
                    <a href="carrito.html" class="btn-principal">Ver carrito</a>
                </div>
            </div>`;
        document.body.appendChild(capa);
        requestAnimationFrame(() => capa.classList.add('visible'));

        const cerrar = () => { capa.classList.remove('visible'); setTimeout(() => capa.remove(), 250); };
        capa.querySelector('#seguirComprando').addEventListener('click', cerrar);
        capa.addEventListener('click', (e) => { if (e.target === capa) cerrar(); });
    },
};

document.addEventListener('DOMContentLoaded', () => Configurador.iniciar());
