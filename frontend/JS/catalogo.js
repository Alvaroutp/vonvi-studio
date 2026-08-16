/* =====================================================================
   catalogo.js  ·  productos.html y categoria.html
   ===================================================================== */

/* ---------------------------------------------------------------
   productos.html  →  las 11 categorías + buscador
   --------------------------------------------------------------- */
const Catalogo = {

    async iniciar() {
        const grid = document.getElementById('gridCategorias');
        if (!grid) return;

        U.cargando(grid, 'Cargando categorías...');

        try {
            const r = await API.get('/categorias');
            if (!r.categorias.length) {
                U.vacio(grid, 'fa-solid fa-box-open', 'Todavía no hay categorías',
                    'Vuelve pronto, estamos preparando el catálogo.');
                return;
            }

            grid.innerHTML = r.categorias.map((c) => `
                <a href="categoria.html?cat=${encodeURIComponent(c.slug)}" class="card-categoria mostrar">
                    <div class="imagen-categoria">
                        <img src="${U.esc(c.imagen || 'img/logo.png')}" alt="${U.esc(c.nombre)}" loading="lazy">
                        <span class="icono-categoria"><i class="${U.esc(c.icono || 'fa-solid fa-tag')}"></i></span>
                    </div>
                    <div class="contenido-categoria">
                        <h3>${U.esc(c.nombre)}</h3>
                        <p>${U.esc(c.descripcion || '')}</p>
                        <div class="pie-categoria">
                            <span class="cantidad">${c.total_productos} modelo(s)</span>
                            ${c.precio_desde ? `<span class="desde">desde ${U.soles(c.precio_desde)}</span>` : ''}
                        </div>
                    </div>
                </a>`).join('');

        } catch (e) {
            U.vacio(grid, 'fa-solid fa-plug-circle-xmark', 'No pudimos cargar el catálogo', e.message);
        }

        this.prepararBuscador();
    },

    prepararBuscador() {
        const input = document.getElementById('buscador');
        if (!input) return;

        const grid = document.getElementById('gridCategorias');
        const resultados = document.getElementById('resultadosBusqueda');
        let temporizador;

        input.addEventListener('input', () => {
            clearTimeout(temporizador);
            const texto = input.value.trim();

            if (texto.length < 2) {
                resultados.hidden = true;
                grid.hidden = false;
                return;
            }

            // Se espera a que deje de escribir: sin esto se dispara
            // una petición por cada tecla presionada.
            temporizador = setTimeout(async () => {
                try {
                    const r = await API.get(`/productos?buscar=${encodeURIComponent(texto)}`);
                    grid.hidden = true;
                    resultados.hidden = false;

                    if (!r.productos.length) {
                        U.vacio(resultados, 'fa-solid fa-magnifying-glass', 'Sin resultados',
                            `No encontramos productos para "${texto}". Escríbenos y lo cotizamos a medida.`,
                            { href: 'contacto.html', texto: 'Solicitar cotización' });
                        return;
                    }

                    resultados.innerHTML = r.productos
                        .map((p) => Catalogo.tarjetaProducto(p)).join('');

                } catch (e) { /* búsqueda fallida: se ignora en silencio */ }
            }, 350);
        });
    },

    tarjetaProducto(p) {
        return `
            <article class="card-producto mostrar">
                <div class="imagen-producto">
                    <img src="${U.esc(p.imagen || 'img/logo.png')}" alt="${U.esc(p.nombre)}" loading="lazy">
                    ${p.categoria ? `<span class="etiqueta-cat">${U.esc(p.categoria)}</span>` : ''}
                </div>
                <div class="contenido-producto">
                    <h3>${U.esc(p.nombre)}</h3>
                    <p>${U.esc(p.descripcion || '')}</p>
                    <div class="precio-producto">
                        <span class="desde">desde</span>
                        <strong>${U.soles(p.precio_base)}</strong>
                        ${p.unidad_medida === 'm2' ? '<small>por m²</small>' : ''}
                    </div>
                    ${p.cantidad_minima > 1
                        ? `<small class="minimo">Pedido mínimo: ${p.cantidad_minima} u.</small>` : ''}
                </div>
                <div class="botones-card">
                    <a href="producto.html?p=${encodeURIComponent(p.slug)}" class="btn-card">
                        <i class="fa-solid fa-sliders"></i> Personalizar
                    </a>
                </div>
            </article>`;
    },
};

/* ---------------------------------------------------------------
   categoria.html  →  los productos de una categoría
   --------------------------------------------------------------- */
const Categoria = {

    async iniciar() {
        const grid = document.getElementById('gridProductos');
        if (!grid) return;

        const slug = U.parametro('cat');
        if (!slug) { location.href = 'productos.html'; return; }

        U.cargando(grid, 'Cargando productos...');

        try {
            const r = await API.get(`/categorias/${encodeURIComponent(slug)}`);

            document.title = `${r.categoria.nombre} | Vonvi Studio Perú`;
            document.getElementById('tituloCategoria').textContent = r.categoria.nombre;
            document.getElementById('descCategoria').textContent = r.categoria.descripcion || '';
            document.getElementById('migaCategoria').textContent = r.categoria.nombre;

            if (!r.productos.length) {
                U.vacio(grid, 'fa-solid fa-box-open', 'Sin productos por ahora',
                    'Escríbenos y lo cotizamos a medida.',
                    { href: 'contacto.html', texto: 'Solicitar cotización' });
                return;
            }

            grid.innerHTML = r.productos.map((p) => Catalogo.tarjetaProducto(p)).join('');

        } catch (e) {
            document.getElementById('tituloCategoria').textContent = 'Categoría no encontrada';
            U.vacio(grid, 'fa-solid fa-circle-question', 'No encontramos esta categoría', e.message,
                { href: 'productos.html', texto: 'Ver todas las categorías' });
        }
    },
};

document.addEventListener('DOMContentLoaded', () => {
    Catalogo.iniciar();
    Categoria.iniciar();
});
