/* =====================================================================
   carrito.js  ·  carrito.html
   ===================================================================== */

const Carrito = {

    async iniciar() {
        const zona = document.getElementById('contenidoCarrito');
        if (!zona) return;
        await this.pintar();
    },

    async pintar() {
        const zona = document.getElementById('contenidoCarrito');
        U.cargando(zona, 'Cargando tu carrito...');

        let r;
        try {
            r = await API.get('/carrito');
        } catch (e) {
            U.vacio(zona, 'fa-solid fa-plug-circle-xmark', 'No pudimos cargar tu carrito', e.message);
            return;
        }

        if (r.carrito.token) API.tokenCarrito = r.carrito.token;

        const { items, resumen } = r.carrito;

        if (!items.length) {
            U.vacio(zona, 'fa-solid fa-cart-shopping', 'Tu carrito está vacío',
                'Explora el catálogo y personaliza tu primer producto.',
                { href: 'productos.html', texto: 'Ver productos' });
            Header.actualizarCarrito();
            return;
        }

        const envio = resumen.subtotal >= 250 ? 0 : 12;

        zona.innerHTML = `
            <div class="carrito-grid">

                <div class="carrito-items">
                    ${items.map((i) => this.fila(i)).join('')}
                    <button type="button" id="vaciarCarrito" class="btn-texto peligro">
                        <i class="fa-regular fa-trash-can"></i> Vaciar carrito
                    </button>
                </div>

                <aside class="carrito-resumen">
                    <h2>Resumen</h2>

                    <div class="linea">
                        <span>${resumen.total_articulos} artículo(s)</span>
                        <span>${U.soles(resumen.subtotal)}</span>
                    </div>
                    <div class="linea">
                        <span>Envío estimado</span>
                        <span>${envio === 0 ? '<em class="gratis">Gratis</em>' : U.soles(envio)}</span>
                    </div>
                    ${envio > 0 ? `
                        <p class="nota-envio">
                            <i class="fa-solid fa-truck-fast"></i>
                            Te faltan ${U.soles(250 - resumen.subtotal)} para el envío gratis.
                        </p>` : ''}

                    <div class="linea total">
                        <span>Total</span>
                        <strong>${U.soles(resumen.subtotal + envio)}</strong>
                    </div>

                    <p class="nota-produccion">
                        <i class="fa-regular fa-clock"></i>
                        Producción estimada: ${resumen.dias_produccion_estimados} día(s) hábiles
                    </p>

                    <a href="checkout.html" class="btn-principal ancho-total">
                        Continuar compra <i class="fa-solid fa-arrow-right"></i>
                    </a>

                    <a href="productos.html" class="btn-texto centrado">Seguir comprando</a>

                    ${!API.haySesion() ? `
                        <p class="aviso-sesion">
                            <i class="fa-solid fa-circle-info"></i>
                            Para finalizar la compra necesitas una cuenta.
                            No te preocupes: tu carrito no se pierde al iniciar sesión.
                        </p>` : ''}
                </aside>

            </div>`;

        this.conectarEventos();
        Header.actualizarCarrito();
    },

    fila(i) {
        const opciones = (i.opciones || [])
            .map((o) => `<span class="pastilla">${U.esc(o.atributo)}: <b>${U.esc(o.valor)}</b></span>`)
            .join('');

        return `
            <article class="item-carrito" data-id="${i.id}">

                <a href="producto.html?p=${U.esc(i.producto_slug)}" class="item-imagen">
                    <img src="${U.esc(i.producto_imagen || 'img/logo.png')}" alt="${U.esc(i.producto_nombre)}">
                </a>

                <div class="item-datos">
                    <span class="item-categoria">${U.esc(i.categoria_nombre)}</span>
                    <h3><a href="producto.html?p=${U.esc(i.producto_slug)}">${U.esc(i.producto_nombre)}</a></h3>

                    <div class="item-opciones">${opciones}</div>

                    ${i.estampa_nombre ? `
                        <p class="item-estampa">
                            <i class="fa-regular fa-image"></i>
                            <a href="${API.base.replace('/api', '')}${U.esc(i.estampa_url)}" target="_blank" rel="noopener">
                                ${U.esc(i.estampa_nombre)}
                            </a>
                        </p>` : ''}

                    ${i.notas ? `<p class="item-notas"><i class="fa-regular fa-note-sticky"></i> ${U.esc(i.notas)}</p>` : ''}
                </div>

                <div class="item-acciones">
                    <div class="control-cantidad chico">
                        <button type="button" data-accion="menos" aria-label="Quitar uno">&minus;</button>
                        <input type="number" value="${i.cantidad}" min="1" data-accion="cantidad">
                        <button type="button" data-accion="mas" aria-label="Agregar uno">+</button>
                    </div>

                    <div class="item-precio">
                        <strong>${U.soles(i.subtotal)}</strong>
                        <small>${U.soles(i.precio_unitario)} c/u</small>
                    </div>

                    <button type="button" class="quitar" data-accion="quitar" aria-label="Quitar del carrito">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>

            </article>`;
    },

    conectarEventos() {
        document.querySelectorAll('.item-carrito').forEach((fila) => {
            const id = fila.dataset.id;
            const input = fila.querySelector('[data-accion="cantidad"]');

            fila.querySelector('[data-accion="mas"]').addEventListener('click',
                () => this.cambiar(id, Number(input.value) + 1));

            fila.querySelector('[data-accion="menos"]').addEventListener('click',
                () => { const n = Number(input.value) - 1; if (n >= 1) this.cambiar(id, n); });

            input.addEventListener('change', () => this.cambiar(id, Number(input.value)));

            fila.querySelector('[data-accion="quitar"]').addEventListener('click',
                () => this.quitar(id, fila));
        });

        const vaciar = document.getElementById('vaciarCarrito');
        if (vaciar) {
            vaciar.addEventListener('click', async () => {
                if (!confirm('¿Seguro que quieres vaciar el carrito?')) return;
                try {
                    await API.borrar('/carrito');
                    U.aviso('Carrito vaciado');
                    this.pintar();
                } catch (e) { U.aviso(e.message, 'error'); }
            });
        }
    },

    async cambiar(id, cantidad) {
        if (cantidad < 1) return;
        try {
            await API.put(`/carrito/items/${id}`, { cantidad });
            await this.pintar();
        } catch (e) {
            U.aviso(e.message, 'error');
            this.pintar();
        }
    },

    async quitar(id, fila) {
        fila.classList.add('saliendo');
        try {
            await API.borrar(`/carrito/items/${id}`);
            U.aviso('Producto quitado del carrito');
            setTimeout(() => this.pintar(), 200);
        } catch (e) {
            fila.classList.remove('saliendo');
            U.aviso(e.message, 'error');
        }
    },
};

document.addEventListener('DOMContentLoaded', () => Carrito.iniciar());
