/* =====================================================================
   api.js  ·  Punto único de comunicación con el backend
   =====================================================================
   Todas las páginas hablan con la API a través de este archivo.
   Centralizarlo evita repetir el manejo del token y de los errores
   en cada pantalla.
   ===================================================================== */

const API = {

    /** Cambia esto si subes el backend a un servidor. */
    base: 'http://localhost:3000/api',

    /* ---------------- Sesión ---------------- */

    get token() { return localStorage.getItem('vonvi_token'); },
    set token(v) {
        if (v) localStorage.setItem('vonvi_token', v);
        else localStorage.removeItem('vonvi_token');
    },

    get usuario() {
        try { return JSON.parse(localStorage.getItem('vonvi_usuario')); }
        catch (e) { return null; }
    },
    set usuario(u) {
        if (u) localStorage.setItem('vonvi_usuario', JSON.stringify(u));
        else localStorage.removeItem('vonvi_usuario');
    },

    haySesion() { return !!this.token; },
    esAdmin() { const u = this.usuario; return !!u && u.rol === 'admin'; },

    /**
     * Token del carrito de invitado.
     * Permite armar el carrito sin tener cuenta; al iniciar sesión
     * el backend fusiona ese carrito con el del usuario.
     */
    get tokenCarrito() { return localStorage.getItem('vonvi_carrito'); },
    set tokenCarrito(v) {
        if (v) localStorage.setItem('vonvi_carrito', v);
        else localStorage.removeItem('vonvi_carrito');
    },

    cerrarSesion() {
        this.token = null;
        this.usuario = null;
        this.tokenCarrito = null;
    },

    /* ---------------- Peticiones ---------------- */

    async pedir(ruta, opciones = {}) {
        const cabeceras = { ...(opciones.headers || {}) };

        // FormData necesita que el navegador ponga su propio Content-Type
        const esFormData = opciones.body instanceof FormData;
        if (!esFormData && opciones.body) cabeceras['Content-Type'] = 'application/json';

        if (this.token) cabeceras['Authorization'] = `Bearer ${this.token}`;
        if (this.tokenCarrito) cabeceras['X-Carrito-Token'] = this.tokenCarrito;

        let respuesta;
        try {
            respuesta = await fetch(`${this.base}${ruta}`, {
                ...opciones,
                headers: cabeceras,
                body: esFormData ? opciones.body
                    : (opciones.body ? JSON.stringify(opciones.body) : undefined),
            });
        } catch (e) {
            throw new ErrorAPI(
                'No se pudo conectar con el servidor. ¿Está encendido el backend?',
                0
            );
        }

        let datos = null;
        try { datos = await respuesta.json(); } catch (e) { /* respuesta sin cuerpo */ }

        if (!respuesta.ok) {
            // La sesión venció: se limpia y se manda al login
            if (respuesta.status === 401 && this.token) {
                this.cerrarSesion();
                if (!location.pathname.includes('login')) {
                    location.href = `login.html?volver=${encodeURIComponent(location.pathname + location.search)}`;
                }
            }
            throw new ErrorAPI(
                (datos && datos.mensaje) || 'Ocurrió un error inesperado',
                respuesta.status,
                datos && datos.detalles
            );
        }

        return datos;
    },

    get(ruta) { return this.pedir(ruta); },
    post(ruta, body) { return this.pedir(ruta, { method: 'POST', body }); },
    put(ruta, body) { return this.pedir(ruta, { method: 'PUT', body }); },
    patch(ruta, body) { return this.pedir(ruta, { method: 'PATCH', body }); },
    borrar(ruta) { return this.pedir(ruta, { method: 'DELETE' }); },

    /* ---------------- Atajos ---------------- */

    async login(email, password) {
        const r = await this.post('/auth/login', { email, password });
        this.token = r.token;
        this.usuario = r.usuario;
        await this.sincronizarCarrito();
        return r;
    },

    async registro(datos) {
        const r = await this.post('/auth/registro', datos);
        this.token = r.token;
        this.usuario = r.usuario;
        await this.sincronizarCarrito();
        return r;
    },

    /** Traspasa el carrito de invitado a la cuenta recién iniciada. */
    async sincronizarCarrito() {
        if (!this.tokenCarrito) return;
        try {
            await this.post('/carrito/fusionar', {});
            this.tokenCarrito = null;
        } catch (e) { /* si falla, el carrito del usuario sigue intacto */ }
    },
};

/** Error con el código HTTP y el detalle por campo que devuelve la API. */
class ErrorAPI extends Error {
    constructor(mensaje, status, detalles) {
        super(mensaje);
        this.status = status;
        this.detalles = detalles || [];
    }
}

/* =====================================================================
   Utilidades compartidas
   ===================================================================== */

const U = {

    soles(n) {
        return 'S/ ' + Number(n || 0).toLocaleString('es-PE', {
            minimumFractionDigits: 2, maximumFractionDigits: 2,
        });
    },

    fecha(f) {
        if (!f) return '';
        const d = new Date(String(f).replace(' ', 'T'));
        return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    fechaHora(f) {
        if (!f) return '';
        const d = new Date(String(f).replace(' ', 'T'));
        return d.toLocaleString('es-PE', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        });
    },

    /**
     * Escapa el texto antes de meterlo en innerHTML.
     * Sin esto, un producto llamado <script>... se ejecutaría en la página.
     */
    esc(texto) {
        const div = document.createElement('div');
        div.textContent = texto == null ? '' : String(texto);
        return div.innerHTML;
    },

    parametro(nombre) {
        return new URLSearchParams(location.search).get(nombre);
    },

    /** Aviso flotante en la esquina. */
    aviso(mensaje, tipo = 'exito') {
        let caja = document.getElementById('avisoFlotante');
        if (!caja) {
            caja = document.createElement('div');
            caja.id = 'avisoFlotante';
            document.body.appendChild(caja);
        }
        caja.className = `aviso-flotante ${tipo} mostrar`;
        caja.textContent = mensaje;
        clearTimeout(this._t);
        this._t = setTimeout(() => caja.classList.remove('mostrar'), 3200);
    },

    /** Estado vacío o de error dentro de un contenedor. */
    vacio(contenedor, icono, titulo, texto, boton) {
        contenedor.innerHTML = `
            <div class="estado-vacio">
                <i class="${icono}"></i>
                <h3>${this.esc(titulo)}</h3>
                <p>${this.esc(texto || '')}</p>
                ${boton ? `<a href="${boton.href}" class="btn-principal">${this.esc(boton.texto)}</a>` : ''}
            </div>`;
    },

    cargando(contenedor, texto = 'Cargando...') {
        contenedor.innerHTML = `<div class="cargando"><span class="spinner"></span> ${this.esc(texto)}</div>`;
    },
};
