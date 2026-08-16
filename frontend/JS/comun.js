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
