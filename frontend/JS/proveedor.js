const Proveedor = {

    // Se ejecuta al abrir la pagina
    async iniciar() {
        if (!API.haySesion()) {
            location.href = 'login.html';
            return;
        }

        const u = API.usuario;
        if (!u || u.rol !== 'proveedor') {
            location.href = 'index.html';
            return;
        }

        this.pintar();
    },

    // Pide las solicitudes y las dibuja
    async pintar() {
        const zona = document.getElementById('listaSolicitudes');
        U.cargando(zona, 'Cargando tus solicitudes...');

        let r;
        try {
            r = await API.get('/proveedor/solicitudes');
        } catch (e) {
            U.vacio(zona, 'fa-solid fa-plug-circle-xmark', 'No se pudo cargar', e.message);
            return;
        }

        if (r.solicitudes.length === 0) {
            U.vacio(zona, 'fa-regular fa-envelope-open', 'No tienes solicitudes',
                    'Cuando Vonvi Studio te mande una, va a aparecer aqui.');
            return;
        }

        zona.innerHTML = r.solicitudes.map((s) => this.fila(s)).join('');
        this.conectar();
    },

    // El HTML de una solicitud
    fila(s) {
        const puedeResponder = s.estado === 'enviada';

        return `
            <article class="tarjeta-solicitud">
                <h3>${U.esc(s.descripcion)}</h3>
                <p class="sub">Cantidad: ${s.cantidad}  ·  ${U.fecha(s.creado_en)}</p>
                ${puedeResponder ? `
                    <div class="acciones">
                        <button type="button" class="btn-principal" data-si="${s.id}">Aceptar</button>
                        <button type="button" class="btn-secundario" data-no="${s.id}">Rechazar</button>
                    </div>` : `
                    <span class="marca-estado ${s.estado}">${s.estado}</span>
                    ${s.respuesta ? `<p class="motivo">"${U.esc(s.respuesta)}"</p>` : ''}`}
            </article>`;
    },

    // Enchufa los clics de los botones que acaban de pintarse
    conectar() {
        document.querySelectorAll('[data-si]').forEach((b) => {
            b.addEventListener('click', () => this.responder(b.dataset.si, 'aceptada'));
        });

        document.querySelectorAll('[data-no]').forEach((b) => {
            b.addEventListener('click', () => {
                const motivo = prompt('Por que la rechazas?');
                if (!motivo) return;
                this.responder(b.dataset.no, 'rechazada', motivo);
            });
        });
    },

    // Manda la respuesta al servidor
    async responder(id, estado, respuesta = '') {
        try {
            await API.put('/proveedor/solicitudes/' + id + '/responder', { estado, respuesta });
            U.aviso(estado === 'aceptada' ? 'Solicitud aceptada' : 'Solicitud rechazada');
            this.pintar();
        } catch (e) {
            U.aviso(e.message, 'error');
        }
    },
};

document.addEventListener('DOMContentLoaded', () => Proveedor.iniciar());