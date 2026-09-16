/* =====================================================================
   comun.js  ·  Lo que se ejecuta en TODAS las páginas
   =====================================================================
   - Rellena el año del footer          (bug 5 del análisis)
   - Hace funcionar el botón "subir"    (bug 4)
   - Menú móvil
   - Contadores animados, solo si existen  (bugs 1 y 3)
   - Header dinámico: carrito + sesión
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    anioFooter();
    botonSubir();
    animacionTarjetas();
    contadores();
    acordeon();
    avisoPendiente();
    Header.iniciar();
    PanelCarrito.enganchar();
});

/** Muestra un aviso dejado por otra página antes de redirigir. */
function avisoPendiente() {
    const mensaje = sessionStorage.getItem('vonvi_aviso');
    if (!mensaje) return;
    sessionStorage.removeItem('vonvi_aviso');
    setTimeout(() => U.aviso(mensaje, 'aviso'), 300);
}

/* ---------------------------------------------------------------
   Año del copyright
   Antes el <span id="anio"> quedaba vacío en las 6 páginas.
   --------------------------------------------------------------- */
function anioFooter() {
    document.querySelectorAll('#anio').forEach((el) => {
        el.textContent = new Date().getFullYear();
    });
}

/* ---------------------------------------------------------------
   Botón "volver arriba"
   El HTML y el CSS existían, pero no había JavaScript: no hacía nada.
   --------------------------------------------------------------- */
function botonSubir() {
    const btn = document.getElementById('btnTop');
    if (!btn) return;

    const alternar = () => btn.classList.toggle('visible', window.scrollY > 400);
    window.addEventListener('scroll', alternar, { passive: true });
    alternar();

    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ---------------------------------------------------------------
   Menú hamburguesa
   --------------------------------------------------------------- */
function abrirMenu() {
    const menu = document.getElementById('menu');
    if (menu) menu.classList.toggle('activo');
}

/* ---------------------------------------------------------------
   Aparición de las tarjetas al hacer scroll.
   Se usa IntersectionObserver en vez de escuchar el scroll:
   el navegador avisa cuando el elemento entra en pantalla, en vez
   de recalcular posiciones en cada píxel.
   --------------------------------------------------------------- */
function animacionTarjetas() {
    const tarjetas = document.querySelectorAll('.card-producto, .card-categoria');
    if (!tarjetas.length) return;

    if (!('IntersectionObserver' in window)) {
        tarjetas.forEach((t) => t.classList.add('mostrar'));
        return;
    }

    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((e) => {
            if (e.isIntersecting) {
                e.target.classList.add('mostrar');
                observador.unobserve(e.target);
            }
        });
    }, { threshold: 0.1 });

    tarjetas.forEach((t) => observador.observe(t));
}

/* ---------------------------------------------------------------
   Contadores animados.

   Antes esta función buscaba .estadisticas, que solo existe en
   index.html, y lanzaba un TypeError en las otras 5 páginas.
   Ahora: si no hay contadores, no hace nada.

   Además acepta data-numero Y data-valor: nosotros.html usaba
   data-valor y mostraba "NaN" en bucle infinito.
   --------------------------------------------------------------- */
function contadores() {
    const elementos = document.querySelectorAll('.contador');
    if (!elementos.length) return;

    const animar = (el) => {
        const objetivo = parseInt(el.dataset.numero || el.dataset.valor, 10);
        if (!Number.isFinite(objetivo)) return;   // sin esto se veía "NaN"

        const inicio = performance.now();
        const duracion = 1400;

        const paso = (ahora) => {
            const avance = Math.min((ahora - inicio) / duracion, 1);
            // easing: arranca rápido y frena al final
            const suave = 1 - Math.pow(1 - avance, 3);
            el.textContent = Math.floor(objetivo * suave).toLocaleString('es-PE');
            if (avance < 1) requestAnimationFrame(paso);
            else el.textContent = objetivo.toLocaleString('es-PE');
        };
        requestAnimationFrame(paso);
    };

    if (!('IntersectionObserver' in window)) {
        elementos.forEach(animar);
        return;
    }

    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((e) => {
            if (e.isIntersecting) {
                animar(e.target);
                observador.unobserve(e.target);
            }
        });
    }, { threshold: 0.4 });

    elementos.forEach((el) => observador.observe(el));
}

/* ---------------------------------------------------------------
   Acordeón de preguntas frecuentes
   --------------------------------------------------------------- */
function acordeon() {
    const preguntas = document.querySelectorAll('.pregunta');
    if (!preguntas.length) return;

    preguntas.forEach((pregunta) => {
        pregunta.addEventListener('click', function () {
            const item = this.parentElement;
            const respuesta = item.querySelector('.respuesta');

            document.querySelectorAll('.acordeon .item').forEach((otro) => {
                if (otro !== item) {
                    otro.classList.remove('activo');
                    const r = otro.querySelector('.respuesta');
                    if (r) r.style.maxHeight = null;
                }
            });

            const abierto = item.classList.toggle('activo');
            respuesta.style.maxHeight = abierto ? `${respuesta.scrollHeight}px` : null;
        });
    });
}

/* =====================================================================
   HEADER: carrito y sesión
   ===================================================================== */
const Header = {

    async iniciar() {
        this.pintarSesion();
        await this.actualizarCarrito();
    },

    /** Muestra "Iniciar sesión" o el nombre del usuario. */
    pintarSesion() {
        const zona = document.getElementById('zonaSesion');
        if (!zona) return;

        const u = API.usuario;

        if (!u) {
            zona.innerHTML = `
                <a href="login.html" class="btn-sesion">
                    <i class="fa-regular fa-user"></i>
                    <span>Iniciar sesión</span>
                </a>`;
            return;
        }

        zona.innerHTML = `
            <div class="menu-usuario">
                <button class="btn-sesion" type="button" aria-haspopup="true">
                    <i class="fa-solid fa-circle-user"></i>
                    <span>${U.esc(u.nombres)}</span>
                    <i class="fa-solid fa-chevron-down chevron"></i>
                </button>
                <div class="desplegable">
                    <a href="cuenta.html"><i class="fa-solid fa-box"></i> Mis pedidos</a>
                    <a href="cuenta.html#perfil"><i class="fa-solid fa-user-gear"></i> Mi perfil</a>
                    ${u.rol === 'admin'
                        ? '<a href="admin/index.html"><i class="fa-solid fa-gauge"></i> Panel admin</a>'
                        : ''}
                    <button type="button" id="btnSalir"><i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión</button>
                </div>
            </div>`;

        const caja = zona.querySelector('.menu-usuario');
        caja.querySelector('.btn-sesion').addEventListener('click', (e) => {
            e.stopPropagation();
            caja.classList.toggle('abierto');
        });
        document.addEventListener('click', () => caja.classList.remove('abierto'));

        zona.querySelector('#btnSalir').addEventListener('click', () => {
            API.cerrarSesion();
            U.aviso('Sesión cerrada');
            setTimeout(() => { location.href = 'index.html'; }, 600);
        });
    },

    /** Pone el número de artículos en la burbuja del carrito. */
    async actualizarCarrito() {
        const burbuja = document.getElementById('contadorCarrito');
        if (!burbuja) return;

        try {
            const r = await API.get('/carrito');
            if (r.carrito.token) API.tokenCarrito = r.carrito.token;

            const n = r.carrito.resumen.total_articulos;
            burbuja.textContent = n > 99 ? '99+' : n;
            burbuja.classList.toggle('visible', n > 0);
        } catch (e) {
            burbuja.classList.remove('visible');
        }
    },
};

/* =====================================================================
   PANEL DEL CARRITO (sidebar tipo Temu / AliExpress)
   =====================================================================
   En vez de llevar a carrito.html, el ícono del carrito abre este
   panel deslizable. Usa exactamente la misma lógica de Carrito
   (carrito.js) que ya pinta la página completa: solo cambia el
   contenedor donde se dibuja.

   carrito.html sigue existiendo tal cual, por si alguien entra por
   un enlace directo o guardado.
   ===================================================================== */
const PanelCarrito = {

    creado: false,

    /** Conecta el clic del ícono "Carrito" del header con el panel. */
    enganchar() {
        const enPaginaCarrito = /(^|\/)carrito\.html$/.test(location.pathname);

        document.querySelectorAll('.btn-carrito').forEach((enlace) => {
            enlace.addEventListener('click', (e) => {
                // En la propia página del carrito, el enlace se deja normal.
                if (enPaginaCarrito) return;
                e.preventDefault();
                this.abrir();
            });
        });
    },

    /** Crea el HTML y el CSS del panel la primera vez que se necesita. */
    crear() {
        if (this.creado) return;
        this.creado = true;

        const estilo = document.createElement('style');
        estilo.textContent = `
            .overlay-panel-carrito {
                position: fixed; inset: 0;
                background: rgba(31, 36, 48, .55);
                opacity: 0; visibility: hidden;
                transition: opacity .25s ease;
                z-index: 1500;
            }
            .overlay-panel-carrito.visible { opacity: 1; visibility: visible; }

            .panel-carrito {
                position: fixed; top: 0; right: 0;
                height: 100%; width: min(430px, 100%);
                background: var(--panel, #fff);
                box-shadow: var(--sombra-fuerte, -8px 0 24px rgba(0,0,0,.15));
                display: flex; flex-direction: column;
                transform: translateX(100%);
                transition: transform .3s ease;
                z-index: 1501;
            }
            .panel-carrito.abierto { transform: translateX(0); }

            .panel-carrito-cabecera {
                display: flex; align-items: center; justify-content: space-between;
                padding: 20px 24px;
                border-bottom: 1px solid var(--linea, #e5e7eb);
                flex-shrink: 0;
            }
            .panel-carrito-cabecera h2 {
                font-size: 1.05rem; margin: 0;
                color: var(--tinta, #1f2430);
                display: flex; align-items: center; gap: 9px;
            }
            .panel-carrito-cabecera h2 i { color: var(--rosa, #ec4f95); }
            .panel-carrito-cabecera button {
                background: none; border: none; cursor: pointer;
                font-size: 1.2rem; color: var(--gris, #6b7280); line-height: 1;
                padding: 6px; transition: .2s;
            }
            .panel-carrito-cabecera button:hover { color: var(--rosa, #ec4f95); }

            .panel-carrito-cuerpo {
                flex: 1; overflow-y: auto;
                padding: 20px 24px 28px;
            }

            body.bloqueo-scroll { overflow: hidden; }

            /* Layout de una sola columna dentro del panel angosto */
            .carrito-grid-panel {
                display: flex; flex-direction: column; gap: 22px;
            }
            .carrito-grid-panel .item-carrito-panel {
                display: grid;
                grid-template-columns: 68px 1fr;
                gap: 12px;
                align-items: start;
                background: none;
                box-shadow: none;
                border-bottom: 1px solid var(--linea, #e5e7eb);
                border-radius: 0;
                padding: 0 0 18px;
                margin-bottom: 0;
            }
            .carrito-grid-panel .item-carrito-panel .item-imagen img {
                width: 68px; height: 68px; object-fit: cover; border-radius: 10px;
            }
            .carrito-grid-panel .item-carrito-panel h3 { font-size: .95rem; margin-bottom: 6px; }
            .carrito-grid-panel .item-carrito-panel .item-acciones {
                grid-column: 1 / -1;
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
                margin-top: 8px;
            }
            .carrito-grid-panel .item-carrito-panel .item-precio { text-align: right; }
            .carrito-grid-panel .item-carrito-panel .item-precio strong { font-size: 16px; }

            .carrito-grid-panel .carrito-resumen {
                position: static;
                box-shadow: none;
                border-top: 1px solid var(--linea, #e5e7eb);
                border-radius: 0;
                padding: 18px 0 0;
            }

            @media (max-width: 480px) {
                .panel-carrito { width: 100%; }
            }
        `;
        document.head.appendChild(estilo);

        const overlay = document.createElement('div');
        overlay.id = 'overlayCarrito';
        overlay.className = 'overlay-panel-carrito';

        const panel = document.createElement('aside');
        panel.id = 'panelCarrito';
        panel.className = 'panel-carrito';
        panel.setAttribute('aria-label', 'Carrito de compras');
        panel.innerHTML = `
            <div class="panel-carrito-cabecera">
                <h2><i class="fa-solid fa-cart-shopping"></i> Mi carrito</h2>
                <button type="button" id="cerrarPanelCarrito" aria-label="Cerrar carrito">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div id="panelCarritoContenido" class="panel-carrito-cuerpo"></div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(panel);

        overlay.addEventListener('click', () => this.cerrar());
        panel.querySelector('#cerrarPanelCarrito').addEventListener('click', () => this.cerrar());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.cerrar();
        });
    },

    abrir() {
        this.crear();
        document.getElementById('overlayCarrito').classList.add('visible');
        document.getElementById('panelCarrito').classList.add('abierto');
        document.body.classList.add('bloqueo-scroll');

        if (typeof Carrito !== 'undefined') Carrito.pintarEn('panelCarritoContenido');
    },

    cerrar() {
        const overlay = document.getElementById('overlayCarrito');
        const panel = document.getElementById('panelCarrito');
        if (overlay) overlay.classList.remove('visible');
        if (panel) panel.classList.remove('abierto');
        document.body.classList.remove('bloqueo-scroll');
    },
};
