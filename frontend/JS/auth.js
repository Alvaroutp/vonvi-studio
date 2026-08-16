/* =====================================================================
   auth.js  ·  login.html y registro.html
   ===================================================================== */

/** Pinta los errores campo por campo que devuelve la API. */
function pintarErrores(detalles) {
    document.querySelectorAll('.error[data-error]').forEach((e) => { e.textContent = ''; });
    (detalles || []).forEach((d) => {
        const caja = document.querySelector(`.error[data-error="${d.campo}"]`);
        if (caja) caja.textContent = d.mensaje;
    });
}

/** Botón del ojito para ver la contraseña. */
function verPassword() {
    document.querySelectorAll('.ver-password').forEach((btn) => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            const oculto = input.type === 'password';
            input.type = oculto ? 'text' : 'password';
            btn.innerHTML = oculto
                ? '<i class="fa-regular fa-eye-slash"></i>'
                : '<i class="fa-regular fa-eye"></i>';
        });
    });
}

/* ---------------------------------------------------------------
   LOGIN
   --------------------------------------------------------------- */
const Login = {
    iniciar() {
        const form = document.getElementById('formLogin');
        if (!form) return;

        // Si ya hay sesión, no tiene sentido mostrar el login
        if (API.haySesion()) { location.href = this.destino(); return; }

        verPassword();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const boton = document.getElementById('btnEntrar');
            const general = document.getElementById('errorGeneral');
            general.hidden = true;
            pintarErrores([]);

            boton.disabled = true;
            boton.innerHTML = '<span class="spinner"></span> Entrando...';

            try {
                await API.login(
                    document.getElementById('email').value.trim(),
                    document.getElementById('password').value
                );
                U.aviso('¡Bienvenido de nuevo!');
                setTimeout(() => { location.href = this.destino(); }, 500);

            } catch (err) {
                pintarErrores(err.detalles);
                if (!err.detalles || !err.detalles.length) {
                    general.textContent = err.message;
                    general.hidden = false;
                }
                boton.disabled = false;
                boton.textContent = 'Entrar';
            }
        });
    },

    /**
     * A dónde ir después de entrar.
     *
     * Se valida que sea una ruta interna: sin esto, un enlace como
     * login.html?volver=https://sitio-malo.com llevaría al usuario fuera del
     * sitio creyendo que sigue en él.
     *
     * Y si un cliente traía ?volver=admin/... se ignora: mandarlo al panel
     * haría que el panel lo devuelva al login, y el login otra vez al panel.
     */
    destino() {
        const volver = U.parametro('volver');
        const interna = volver
            && /^[a-zA-Z0-9_\-./?=&]+$/.test(volver)
            && !volver.startsWith('//')
            && !volver.includes('..');

        if (interna && !(volver.includes('admin/') && !API.esAdmin())) {
            return volver;
        }
        return API.esAdmin() ? 'admin/index.html' : 'cuenta.html';
    },
};

/* ---------------------------------------------------------------
   REGISTRO
   --------------------------------------------------------------- */
const Registro = {
    iniciar() {
        const form = document.getElementById('formRegistro');
        if (!form) return;

        if (API.haySesion()) { location.href = 'cuenta.html'; return; }

        verPassword();
        this.medidorFuerza();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const boton = document.getElementById('btnCrear');
            const general = document.getElementById('errorGeneral');
            general.hidden = true;
            pintarErrores([]);

            if (!document.getElementById('terminos').checked) {
                general.textContent = 'Debes aceptar los términos y condiciones.';
                general.hidden = false;
                return;
            }

            boton.disabled = true;
            boton.innerHTML = '<span class="spinner"></span> Creando cuenta...';

            try {
                await API.registro({
                    nombres: document.getElementById('nombres').value.trim(),
                    apellidos: document.getElementById('apellidos').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    telefono: document.getElementById('telefono').value.trim() || undefined,
                    password: document.getElementById('password').value,
                });

                U.aviso('¡Cuenta creada! Bienvenido a Vonvi Studio.');
                setTimeout(() => {
                    const volver = U.parametro('volver');
                    location.href = (volver && /^[a-zA-Z0-9_\-./?=&]+$/.test(volver))
                        ? volver : 'cuenta.html';
                }, 700);

            } catch (err) {
                pintarErrores(err.detalles);
                if (!err.detalles || !err.detalles.length) {
                    general.textContent = err.message;
                    general.hidden = false;
                }
                boton.disabled = false;
                boton.textContent = 'Crear cuenta';
            }
        });
    },

    /** Barra visual de fuerza de la contraseña. */
    medidorFuerza() {
        const input = document.getElementById('password');
        const barra = document.getElementById('barraFuerza');
        if (!input || !barra) return;

        input.addEventListener('input', () => {
            const v = input.value;
            let puntos = 0;
            if (v.length >= 8) puntos++;
            if (/[a-z]/.test(v) && /[A-Z]/.test(v)) puntos++;
            if (/[0-9]/.test(v)) puntos++;
            if (/[^a-zA-Z0-9]/.test(v)) puntos++;
            if (v.length >= 12) puntos++;

            const nivel = Math.min(puntos, 4);
            barra.className = `nivel-${nivel}`;
            barra.style.width = `${nivel * 25}%`;
        });
    },
};

document.addEventListener('DOMContentLoaded', () => {
    Login.iniciar();
    Registro.iniciar();
});
