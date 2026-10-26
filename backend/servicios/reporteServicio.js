const ExcelJS = require('exceljs');

const reporteDAO = require('../dao/reporteDAO');


const ROSA = 'FFEC4F95';
const SUAVE = 'FFFDEAF3';
const TINTA = 'FF1F2430';
const GRIS = 'FF6B7280';
const LINEA = 'FFE5E7EB';
const AMARILLO = 'FFFFF9C4';

const SOLES = '"S/ "#,##0.00';
const ENTERO = '#,##0';
const PORCENTAJE = '0.0%';

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const BORDE_INFERIOR = { bottom: { style: 'thin', color: { argb: LINEA } } };


function letra(nombre, extra = {}) {
    return { name: 'Arial', ...extra };
}


function pintarCabecera(hoja, fila, titulos, desde = 2) {
    titulos.forEach((titulo, i) => {
        const celda = hoja.getCell(fila, desde + i);
        celda.value = titulo;
        celda.font = letra('Arial', { bold: true, size: 10, color: { argb: 'FFFFFFFF' } });
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROSA } };
        celda.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    hoja.getRow(fila).height = 24;
}


function pintarSelector(celda) {
    celda.font = letra('Arial', { bold: true, size: 11, color: { argb: TINTA } });
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMARILLO } };
    celda.alignment = { horizontal: 'center' };

    const linea = { style: 'thin', color: { argb: ROSA } };
    celda.border = { top: linea, left: linea, bottom: linea, right: linea };
}


function pintarTotal(hoja, fila, desde, hasta) {
    for (let c = desde; c <= hasta; c++) {
        hoja.getCell(fila, c).font = letra('Arial', { bold: true, size: 11, color: { argb: ROSA } });
        hoja.getCell(fila, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUAVE } };
    }
}


function redondear(numero) {
    return Math.round(numero * 100) / 100;
}


function sumar(lista, campo) {
    return redondear(lista.reduce((total, x) => total + Number(x[campo] || 0), 0));
}


function conMayuscula(texto) {
    const limpio = String(texto || '').replace('_', ' ');
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}


function periodoDe(anio, mes) {
    return `${anio}-${String(mes).padStart(2, '0')}`;
}


function calcularResumen(pedidos, cotizaciones) {
    const resumen = {
        ventas: sumar(pedidos, 'total'),
        pedidos: pedidos.length,
        unidades: sumar(pedidos, 'unidades'),
        envios: sumar(pedidos, 'envio'),
        cotizaciones: cotizaciones.length,
    };

    resumen.ticket = resumen.pedidos ? redondear(resumen.ventas / resumen.pedidos) : 0;

    return resumen;
}


function calcularMeses(pedidos, cotizaciones) {
    const meses = [];

    for (let mes = 1; mes <= 12; mes++) {
        const delMes = pedidos.filter((p) => p.mes === mes);
        const cotDelMes = cotizaciones.filter((c) => c.mes === mes);
        const ventas = sumar(delMes, 'total');

        meses.push({
            vacio: delMes.length === 0,
            ventas,
            pedidos: delMes.length,
            unidades: sumar(delMes, 'unidades'),
            ticket: delMes.length ? redondear(ventas / delMes.length) : '',
            cotizaciones: cotDelMes.length,
        });
    }

    return meses;
}


function hojaPedidos(wb, pedidos) {
    const hoja = wb.addWorksheet('Pedidos', { views: [{ state: 'frozen', ySplit: 1 }] });

    pintarCabecera(hoja, 1, [
        'Código', 'Fecha', 'Periodo', 'Año', 'Mes #', 'Mes', 'Cliente', 'Correo',
        'Distrito', 'Entrega', 'Método de pago', 'Estado', 'Subtotal', 'Envío',
        'Total', 'Unidades',
    ], 1);

    pedidos.forEach((p, i) => {
        const fila = hoja.getRow(i + 2);

        fila.values = [
            p.codigo, p.fecha, periodoDe(p.anio, p.mes), p.anio, p.mes, MESES[p.mes - 1],
            p.nombre_contacto, p.email_contacto, p.distrito,
            p.tipo_entrega === 'recojo' ? 'Recojo en tienda' : 'Delivery',
            conMayuscula(p.metodo_pago), conMayuscula(p.estado),
            Number(p.subtotal), Number(p.envio), Number(p.total), Number(p.unidades || 0),
        ];

        fila.font = letra('Arial', { size: 10 });
        [13, 14, 15].forEach((c) => { fila.getCell(c).numFmt = SOLES; });
        fila.getCell(16).numFmt = ENTERO;
    });

    hoja.autoFilter = `A1:P${pedidos.length + 1}`;
    [15, 12, 10, 7, 7, 12, 18, 26, 14, 18, 16, 16, 13, 11, 13, 10]
        .forEach((ancho, i) => { hoja.getColumn(i + 1).width = ancho; });

    return hoja;
}


function hojaCotizaciones(wb, cotizaciones) {
    const hoja = wb.addWorksheet('Cotizaciones', { views: [{ state: 'frozen', ySplit: 1 }] });

    pintarCabecera(hoja, 1, [
        'Fecha', 'Periodo', 'Año', 'Mes #', 'Nombre', 'Correo', 'Teléfono',
        'Producto de interés', 'Estado',
    ], 1);

    cotizaciones.forEach((c, i) => {
        const fila = hoja.getRow(i + 2);

        fila.values = [
            c.fecha, periodoDe(c.anio, c.mes), c.anio, c.mes,
            c.nombre, c.email, c.telefono, c.producto, conMayuscula(c.estado),
        ];

        fila.font = letra('Arial', { size: 10 });
    });

    hoja.autoFilter = `A1:I${cotizaciones.length + 1}`;
    [12, 10, 7, 7, 18, 26, 14, 24, 14]
        .forEach((ancho, i) => { hoja.getColumn(i + 1).width = ancho; });

    return hoja;
}


function hojaListas(wb, anios) {
    const hoja = wb.addWorksheet('_listas');
    hoja.state = 'hidden';

    hoja.getCell('A1').value = 'Todo';

    anios.forEach((anio, i) => {
        hoja.getCell(`A${i + 2}`).value = anio;
        hoja.getCell(`B${i + 1}`).value = anio;
    });

    return hoja;
}


function llenarResumen(hoja, rangos, anios, ultimo, resumen) {
    hoja.getCell('B2').value = 'VONVI STUDIO PERÚ';
    hoja.getCell('B2').font = letra('Arial', { bold: true, size: 20, color: { argb: ROSA } });

    hoja.getCell('B3').value = 'Reporte de ventas';
    hoja.getCell('B3').font = letra('Arial', { size: 12, color: { argb: GRIS } });

    hoja.getCell('B5').value = 'Año';
    hoja.getCell('B5').font = letra('Arial', { bold: true, size: 11 });

    hoja.getCell('C5').value = ultimo;
    pintarSelector(hoja.getCell('C5'));
    hoja.getCell('C5').dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [`=_listas!$A$1:$A$${anios.length + 1}`],
    };

    hoja.getCell('H1').value = { formula: 'IF($C$5="Todo",">0",$C$5)', result: ultimo };
    hoja.getColumn('H').hidden = true;

    const tarjetas = [
        ['Ventas totales', `SUMIF(${rangos.anio},$H$1,${rangos.total})`, resumen.ventas, SOLES],
        ['Pedidos', `COUNTIF(${rangos.anio},$H$1)`, resumen.pedidos, ENTERO],
        ['Ticket promedio', 'IFERROR(C8/C9,0)', resumen.ticket, SOLES],
        ['Unidades vendidas', `SUMIF(${rangos.anio},$H$1,${rangos.unidades})`, resumen.unidades, ENTERO],
        ['Envíos cobrados', `SUMIF(${rangos.anio},$H$1,${rangos.envio})`, resumen.envios, SOLES],
        ['Cotizaciones recibidas', `COUNTIF(${rangos.cotAnio},$H$1)`, resumen.cotizaciones, ENTERO],
    ];

    tarjetas.forEach(([titulo, formula, valor, formato], i) => {
        const fila = 8 + i;

        const etiqueta = hoja.getCell(fila, 2);
        etiqueta.value = titulo;
        etiqueta.font = letra('Arial', { size: 11, color: { argb: GRIS } });
        etiqueta.border = BORDE_INFERIOR;

        const numero = hoja.getCell(fila, 3);
        numero.value = { formula, result: valor };
        numero.font = letra('Arial', { bold: true, size: 14, color: { argb: TINTA } });
        numero.numFmt = formato;
        numero.border = BORDE_INFERIOR;

        hoja.getRow(fila).height = 22;
    });

    hoja.getColumn(1).width = 3;
    hoja.getColumn(2).width = 26;
    hoja.getColumn(3).width = 20;
}


function hojaPorMes(wb, rangos, anios, ultimo, meses, resumen) {
    const hoja = wb.addWorksheet('Por mes', { views: [{ showGridLines: false }] });

    hoja.getCell('B2').value = 'Mes a mes';
    hoja.getCell('B2').font = letra('Arial', { bold: true, size: 16, color: { argb: ROSA } });

    hoja.getCell('B4').value = 'Año';
    hoja.getCell('B4').font = letra('Arial', { bold: true, size: 11 });

    hoja.getCell('C4').value = ultimo;
    pintarSelector(hoja.getCell('C4'));
    hoja.getCell('C4').dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [`=_listas!$B$1:$B$${anios.length}`],
    };

    pintarCabecera(hoja, 6, [
        'Periodo', 'Mes', 'Ventas', 'Pedidos', 'Ticket promedio', 'Unidades', 'Cotizaciones',
    ]);

    for (let i = 0; i < 12; i++) {
        const fila = 7 + i;
        const mes = i + 1;
        const valores = meses[i];

        const hayPedidos = `COUNTIFS(${rangos.anio},$C$4,${rangos.mes},${mes})`;
        const hayCotizaciones = `COUNTIFS(${rangos.cotAnio},$C$4,${rangos.cotMes},${mes})`;

        hoja.getCell(fila, 2).value = {
            formula: `$C$4&"-"&TEXT(${mes},"00")`,
            result: periodoDe(ultimo, mes),
        };
        hoja.getCell(fila, 3).value = MESES[i];
        hoja.getCell(fila, 4).value = {
            formula: `IF(${hayPedidos}=0,"",SUMIFS(${rangos.total},${rangos.anio},$C$4,${rangos.mes},${mes}))`,
            result: valores.vacio ? '' : valores.ventas,
        };
        hoja.getCell(fila, 5).value = {
            formula: `IF(${hayPedidos}=0,"",${hayPedidos})`,
            result: valores.vacio ? '' : valores.pedidos,
        };
        hoja.getCell(fila, 6).value = {
            formula: `IFERROR(D${fila}/E${fila},"")`,
            result: valores.ticket,
        };
        hoja.getCell(fila, 7).value = {
            formula: `IF(${hayPedidos}=0,"",SUMIFS(${rangos.unidades},${rangos.anio},$C$4,${rangos.mes},${mes}))`,
            result: valores.vacio ? '' : valores.unidades,
        };
        hoja.getCell(fila, 8).value = {
            formula: `IF(${hayCotizaciones}=0,"",${hayCotizaciones})`,
            result: valores.cotizaciones === 0 ? '' : valores.cotizaciones,
        };

        [4, 6].forEach((c) => { hoja.getCell(fila, c).numFmt = SOLES; });
        [5, 7, 8].forEach((c) => { hoja.getCell(fila, c).numFmt = ENTERO; });

        for (let c = 2; c <= 8; c++) {
            hoja.getCell(fila, c).font = letra('Arial', { size: 10 });
            hoja.getCell(fila, c).border = BORDE_INFERIOR;
        }
    }

    hoja.getCell(19, 3).value = 'TOTAL';
    hoja.getCell(19, 4).value = { formula: 'SUM(D7:D18)', result: resumen.ventas };
    hoja.getCell(19, 5).value = { formula: 'SUM(E7:E18)', result: resumen.pedidos };
    hoja.getCell(19, 6).value = { formula: 'IFERROR(D19/E19,0)', result: resumen.ticket };
    hoja.getCell(19, 7).value = { formula: 'SUM(G7:G18)', result: resumen.unidades };
    hoja.getCell(19, 8).value = { formula: 'SUM(H7:H18)', result: resumen.cotizaciones };

    [4, 6].forEach((c) => { hoja.getCell(19, c).numFmt = SOLES; });
    [5, 7, 8].forEach((c) => { hoja.getCell(19, c).numFmt = ENTERO; });
    pintarTotal(hoja, 19, 3, 8);

    [12, 14, 16, 12, 18, 12, 14]
        .forEach((ancho, i) => { hoja.getColumn(i + 2).width = ancho; });

    return hoja;
}


function hojaProductos(wb, productos) {
    const hoja = wb.addWorksheet('Productos', { views: [{ showGridLines: false }] });

    hoja.getCell('B2').value = 'Qué se vende más';
    hoja.getCell('B2').font = letra('Arial', { bold: true, size: 16, color: { argb: ROSA } });

    pintarCabecera(hoja, 4, [
        '#', 'Producto', 'Categoría', 'Unidades', 'Ingresos', '% de las ventas', 'Pedidos',
    ]);

    const filaTotal = 5 + productos.length;
    const ingresosTotales = redondear(
        productos.reduce((total, p) => total + Number(p.ingresos), 0)
    );

    productos.forEach((p, i) => {
        const fila = 5 + i;

        hoja.getCell(fila, 2).value = i + 1;
        hoja.getCell(fila, 3).value = p.nombre_producto;
        hoja.getCell(fila, 4).value = p.nombre_categoria;

        hoja.getCell(fila, 5).value = Number(p.unidades);
        hoja.getCell(fila, 5).numFmt = ENTERO;

        hoja.getCell(fila, 6).value = Number(p.ingresos);
        hoja.getCell(fila, 6).numFmt = SOLES;

        hoja.getCell(fila, 7).value = {
            formula: `IFERROR(F${fila}/$F$${filaTotal},0)`,
            result: ingresosTotales ? Number(p.ingresos) / ingresosTotales : 0,
        };
        hoja.getCell(fila, 7).numFmt = PORCENTAJE;

        hoja.getCell(fila, 8).value = Number(p.pedidos);
        hoja.getCell(fila, 8).numFmt = ENTERO;

        for (let c = 2; c <= 8; c++) {
            hoja.getCell(fila, c).font = letra('Arial', { size: 10 });
            hoja.getCell(fila, c).border = BORDE_INFERIOR;
        }
    });

    hoja.getCell(filaTotal, 4).value = 'TOTAL';
    hoja.getCell(filaTotal, 5).value = {
        formula: `SUM(E5:E${filaTotal - 1})`,
        result: productos.reduce((total, p) => total + Number(p.unidades), 0),
    };
    hoja.getCell(filaTotal, 5).numFmt = ENTERO;

    hoja.getCell(filaTotal, 6).value = {
        formula: `SUM(F5:F${filaTotal - 1})`,
        result: ingresosTotales,
    };
    hoja.getCell(filaTotal, 6).numFmt = SOLES;

    hoja.getCell(filaTotal, 7).value = {
        formula: `SUM(G5:G${filaTotal - 1})`,
        result: productos.length ? 1 : 0,
    };
    hoja.getCell(filaTotal, 7).numFmt = PORCENTAJE;

    pintarTotal(hoja, filaTotal, 4, 8);

    [5, 30, 14, 12, 16, 16, 10]
        .forEach((ancho, i) => { hoja.getColumn(i + 2).width = ancho; });

    return hoja;
}


async function libro() {
    const [pedidos, cotizaciones, productos] = await Promise.all([
        reporteDAO.pedidos(),
        reporteDAO.cotizaciones(),
        reporteDAO.productos(),
    ]);

    const anios = [...new Set(pedidos.map((p) => p.anio))].sort((a, b) => a - b);
    const ultimo = anios.length ? anios[anios.length - 1] : new Date().getFullYear();

    const delUltimo = pedidos.filter((p) => p.anio === ultimo);
    const cotDelUltimo = cotizaciones.filter((c) => c.anio === ultimo);

    const resumen = calcularResumen(delUltimo, cotDelUltimo);
    const meses = calcularMeses(delUltimo, cotDelUltimo);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Vonvi Studio Perú';
    wb.created = new Date();

    const filasPedidos = pedidos.length + 1;
    const filasCotizaciones = cotizaciones.length + 1;

    const rangos = {
        anio: `Pedidos!$D$2:$D$${filasPedidos}`,
        mes: `Pedidos!$E$2:$E$${filasPedidos}`,
        envio: `Pedidos!$N$2:$N$${filasPedidos}`,
        total: `Pedidos!$O$2:$O$${filasPedidos}`,
        unidades: `Pedidos!$P$2:$P$${filasPedidos}`,
        cotAnio: `Cotizaciones!$C$2:$C$${filasCotizaciones}`,
        cotMes: `Cotizaciones!$D$2:$D$${filasCotizaciones}`,
    };

    const listaAnios = anios.length ? anios : [ultimo];

    const hojaResumen = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }] });
    llenarResumen(hojaResumen, rangos, listaAnios, ultimo, resumen);

    hojaPorMes(wb, rangos, listaAnios, ultimo, meses, resumen);
    hojaProductos(wb, productos);
    hojaPedidos(wb, pedidos);
    hojaCotizaciones(wb, cotizaciones);
    hojaListas(wb, listaAnios);

    return wb;
}


function nombreArchivo() {
    const hoy = new Date();
    const fecha = hoy.getFullYear() + '-' +
        String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
        String(hoy.getDate()).padStart(2, '0');

    return `reporte-vonvi-${fecha}.xlsx`;
}


module.exports = {
    libro,
    nombreArchivo,
};
