/* =====================================================================
   contacto.js  ·  contacto.html
   =====================================================================
   AUTORRELLENO: si el usuario tiene la sesión iniciada, el nombre, el
   correo y el celular se completan solos desde su cuenta y quedan
   bloqueados (el backend los toma de la cuenta de todos modos).
   ===================================================================== */

const Contacto = {

    async iniciar() {
        const form = document.getElementById('formulario');
        if (!form) return;

        await this.autorrellenar();
        this.preseleccionarProducto();

        form.addEventListener('submit', (e) => { e.preventDefault(); this.enviar(); });
    },

    async autorrellenar() {
        const aviso = document.getElementById('avisoSesion');

        if (!API.haySesion()) {
            if (aviso) {
                aviso.innerHTML = `
                    <i class="fa-solid fa-circle-info"></i>
                    <a href="login.html?volver=contacto.html">Inicia sesión</a>
                    y completamos tus datos automáticamente.`;
                aviso.hidden = false;
            }
            return;
        }

        // Se piden los datos frescos al servidor: los guardados en el
        // navegador pueden estar desactualizados si el usuario cambió
        // su teléfono desde otro dispositivo.
        let u = API.usuario;
        try {
            const r = await API.get('/auth/perfil');
            u = r.usuario;
            API.usuario = u;
        } catch (e) { /* si falla, se usan los datos locales */ }

        const nombre = document.getElementById('nombre');
        const correo = document.getElementById('correo');
        const telefono = document.getElementById('telefono');

        nombre.value = u.nombreCompleto;
        correo.value = u.email;
        telefono.value = u.telefono || '';

        // El nombre y el correo salen de la cuenta y no se editan aquí
        nombre.readOnly = true;
        correo.readOnly = true;
        nombre.classList.add('autorrelleno');
        correo.classList.add('autorrelleno');

        if (aviso) {
            aviso.innerHTML = `
                <i class="fa-solid fa-circle-check"></i>
                Completamos tus datos desde tu cuenta.
                Puedes cambiarlos en <a href="cuenta.html#perfil">Mi perfil</a>.`;
            aviso.hidden = false;
            aviso.classList.add('exito');
        }
    },

    /** Permite llegar desde un producto: contacto.html?producto=Polos */
    preseleccionarProducto() {
        const nombre = U.parametro('producto');
        if (!nombre) return;
        const select = document.getElementById('producto');
        const opcion = [...select.options].find(
            (o) => o.value.toLowerCase() === nombre.toLowerCase());
        if (opcion) select.value = opcion.value;
    },

    async enviar() {
        const boton = document.getElementById('btnEnviar');
        const exito = document.getElementById('mensajeExito');
        const error = document.getElementById('mensajeError');
        const form = document.getElementById('formulario');

        exito.hidden = true;
        error.hidden = true;

        if (!form.checkValidity()) { form.reportValidity(); return; }

        const preferencia = document.querySelector('input[name="contacto"]:checked');
        const producto = document.getElementById('producto').value;

        boton.disabled = true;
        boton.innerHTML = '<span class="spinner"></span> Enviando...';

        try {
            await API.post('/cotizaciones', {
                nombre: document.getElementById('nombre').value.trim(),
                email: document.getElementById('correo').value.trim(),
                telefono: document.getElementById('telefono').value.trim(),
                productoInteres: producto.startsWith('Seleccione') ? null : producto,
                mensaje: document.getElementById('mensaje').value.trim(),
                preferenciaContacto: preferencia ? preferencia.value : 'whatsapp',
                aceptaPromociones: document.getElementById('promociones').checked,
            });

            exito.hidden = false;
            // Con sesión no se borran los datos personales autorrellenados
            document.getElementById('mensaje').value = '';
            document.getElementById('producto').selectedIndex = 0;
            if (!API.haySesion()) form.reset();

            exito.scrollIntoView({ behavior: 'smooth', block: 'center' });

        } catch (e) {
            error.textContent = e.message;
            error.hidden = false;
        } finally {
            boton.disabled = false;
            boton.textContent = 'Enviar Solicitud';
        }
    },
};

document.addEventListener('DOMContentLoaded', () => Contacto.iniciar());
