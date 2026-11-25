import { buildWeekCalendar, shiftsOf } from './reportCalendar.js';

/**
 * Agregación semanal.
 *
 * Toma los documentos diarios ya guardados de un establecimiento a lo largo de
 * una semana y produce la estructura del reporte semanal. Es el equivalente de
 * los procedimientos Lunes_Diurno … Domingo_Nocturno de la macro de Excel, pero
 * en un solo sitio.
 *
 * La forma de la salida está calcada de los PDF que hoy se emiten a mano
 * (Bocas Grill Doral y las ocho sedes de Francisca), incluidas tres reglas que
 * no son evidentes:
 *
 *   1. Salón y barra son filas distintas del cuadro general, pero los gráficos
 *      por día y los porcentajes usan la suma de las dos.
 *   2. Los toques se dibujan por día (siete puntos), no por turno.
 *   3. Lo que el establecimiento no evalúa no aparece: Hialeah, Kendall y
 *      Wynwood salen sin primera atención y sin barra.
 *
 * No hace red, no toca React y no depende del store: recibe los documentos ya
 * descargados y devuelve datos. Así se puede probar con fixtures y contrastar
 * contra un reporte semanal ya emitido.
 *
 * Lee las páginas por `type`, nunca por posición, porque el orden de páginas no
 * se persiste al hidratar.
 *
 * Punto de entrada: buildWeeklyReport, al final del archivo. Es el paso 7 del
 * flujo que empieza en app/routes/weekly_document/index.jsx, y sus pasos
 * internos van numerados 7.1, 7.2…
 *
 * El archivo va de lo pequeño a lo grande:
 *
 *   1. Utilidades de números, tiempo y fechas.
 *   2. Reconocimiento: qué fila es una demora real, cuál es de barra, qué
 *      alerta es una devolución o un cliente sin ubicar.
 *   3. readDailyDocument: un documento diario → una lectura plana.
 *   4. Herramientas de agregación: sumas por turno, series por día, porcentajes.
 *   5. Una función por sección del reporte: cuadro general, toques, métrica…
 *   6. buildWeeklyReport, que prepara las lecturas y llama a las secciones.
 *
 * Vocabulario del archivo:
 *
 *   lectura    lo que devuelve readDailyDocument para un documento, es decir,
 *              para un turno de un día. Toda la agregación trabaja con lecturas.
 *   turno      'day', 'night' o 'all' (turno único). Las tablas añaden una
 *              columna 'total' con la suma de los tres.
 *   categoría  una categoría de plato del local ('Lunch', 'Plato fuerte'). En
 *              la salida se llama `dish`, como en el resto del proyecto.
 *
 * Cada función lleva dos líneas de ejemplo: 📥 lo que recibe y 📤 lo que
 * devuelve. Las que dicen "Bocas" o "Doral" usan las semanas de demoWeek.js.
 */


/* ─────────────────────────── Utilidades ─────────────────────────── */

/** Rellena a dos cifras, para horas y fechas. */
// 📥 Recibe:   7
// 📤 Devuelve: '07'
const dosCifras = numero => String(numero).padStart(2, '0');

/** Suma una lista de números. */
// 📥 Recibe:   [1, 2, 3]
// 📤 Devuelve: 6
const sumar = valores => valores.reduce((suma, valor) => suma + valor, 0);

/** Suma un mismo campo a lo largo de una lista de objetos. */
// 📥 Recibe:   [{ rotaciones: 57 }, { rotaciones: 11 }], 'rotaciones'
// 📤 Devuelve: 68
const sumaDe = (lista, campo) => lista.reduce((suma, elemento) => suma + elemento[campo], 0);


/* ─────────────────────────── Tiempo ─────────────────────────── */

/** 'HH:MM:SS' → segundos. Devuelve null para 'N/A', vacío o basura. */
// 📥 Recibe:   '00:10:53'
// 📤 Devuelve: 653
export function hmsToSeconds(value) {
    if (typeof value !== 'string') return null;
    const texto = value.trim();
    if (!texto || texto === 'N/A' || texto === '--') return null;
    const partes = texto.split(':');
    if (partes.length < 2 || partes.length > 3) return null;
    const numeros = partes.map(Number);
    if (numeros.some(numero => !Number.isFinite(numero) || numero < 0)) return null;
    if (numeros.length === 3) {
        const [horas, minutos, segundos] = numeros;
        return horas * 3600 + minutos * 60 + segundos;
    }
    // Con dos partes se lee como MM:SS.
    const [minutos, segundos] = numeros;
    return minutos * 60 + segundos;
}

/** segundos → 'HH:MM:SS'. null o negativo devuelve 'N/A'. */
// 📥 Recibe:   653
// 📤 Devuelve: '00:10:53'
export function secondsToHms(total) {
    if (!Number.isFinite(total) || total < 0) return 'N/A';
    const redondeado = Math.round(total);
    const horas = Math.floor(redondeado / 3600);
    const minutos = Math.floor((redondeado % 3600) / 60);
    const segundos = redondeado % 60;
    return [horas, minutos, segundos].map(dosCifras).join(':');
}

/**
 * Promedio de una lista de 'HH:MM:SS'.
 * Los valores no válidos se descartan en lugar de contar como cero: un turno sin
 * dato no debe arrastrar el promedio hacia abajo.
 */
// 📥 Recibe:   ['00:10:00', 'N/A', '00:20:00']
// 📤 Devuelve: '00:15:00'
export function averageHms(values) {
    const segundos = (values || []).map(hmsToSeconds).filter(valor => valor !== null);
    if (!segundos.length) return 'N/A';
    return secondsToHms(sumar(segundos) / segundos.length);
}

/**
 * Promedio ponderado por cantidad de procesos. Más fiel que promediar promedios.
 *
 * El reporte NO lo usa: el libro de Excel promedia sin ponderar y el objetivo
 * es reproducirlo (ver promedioDePreparacion). Se conserva, y probado, por si
 * algún día se decide cambiar.
 */
// 📥 Recibe:   [['00:10:00', 100], ['00:20:00', 300]]
// 📤 Devuelve: '00:17:30'
export function weightedAverageHms(pairs) {
    let sumaPonderada = 0;
    let pesoTotal = 0;
    for (const [valor, cantidad] of pairs || []) {
        const segundos = hmsToSeconds(valor);
        const peso = Number(cantidad) || 0;
        if (segundos === null || peso <= 0) continue;
        sumaPonderada += segundos * peso;
        pesoTotal += peso;
    }
    if (!pesoTotal) return 'N/A';
    return secondsToHms(sumaPonderada / pesoTotal);
}


/* ─────────────────────────── Fechas ─────────────────────────── */

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const UN_DIA_EN_MS = 86400000;

/** 'YYYY-MM-DD' → milisegundos de su medianoche. En UTC para no depender de la zona horaria. */
// 📥 Recibe:   '2026-08-24'
// 📤 Devuelve: 1787529600000
const medianocheUtc = fechaIso => {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    return Date.UTC(anio, mes - 1, dia);
};

/** Date → 'YYYY-MM-DD', leída en UTC. */
// 📥 Recibe:   new Date(Date.UTC(2026, 7, 24))
// 📤 Devuelve: '2026-08-24'
const aFechaIso = fecha =>
    `${fecha.getUTCFullYear()}-${dosCifras(fecha.getUTCMonth() + 1)}-${dosCifras(fecha.getUTCDate())}`;

/** Normaliza 'YYYY-MM-DD' o 'MM-DD-YYYY' a 'YYYY-MM-DD'. */
// 📥 Recibe:   '08-24-2026'
// 📤 Devuelve: '2026-08-24'
export function normalizeDate(value) {
    if (typeof value !== 'string') return null;
    const texto = value.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
    const formatoUs = texto.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (formatoUs) {
        const [, mes, dia, anio] = formatoUs;
        return `${anio}-${mes}-${dia}`;
    }
    return null;
}

/** Nombre del día. Se construye a mano para no depender de la zona horaria. */
// 📥 Recibe:   '2026-08-24'
// 📤 Devuelve: 'Lunes'
export function weekdayOf(dateStr) {
    const fecha = normalizeDate(dateStr);
    if (!fecha) return null;
    return DIAS[new Date(medianocheUtc(fecha)).getUTCDay()];
}

/**
 * Siete días seguidos a partir de `from`, que se espera sea lunes.
 * Ojo: no lo corrige si no lo es. El calendario de reportCalendar.js sí alinea
 * la semana al lunes.
 */
// 📥 Recibe:   '2026-08-24'
// 📤 Devuelve: [{ date: '2026-08-24', weekday: 'Lunes' }, …, { date: '2026-08-30', weekday: 'Domingo' }]
export function buildWeekDays(from) {
    const fecha = normalizeDate(from);
    if (!fecha) return [];
    const primerDia = medianocheUtc(fecha);
    return Array.from({ length: 7 }, (_, numeroDeDia) => {
        const dia = new Date(primerDia + numeroDeDia * UN_DIA_EN_MS);
        return { date: aFechaIso(dia), weekday: DIAS[dia.getUTCDay()] };
    });
}


/* ─────────────────────────── Lectura de páginas ─────────────────────────── */

/** La primera página de ese tipo, o null. */
// 📥 Recibe:   { pages: [{ type: 'summary', data: {} }] }, 'summary'
// 📤 Devuelve: { type: 'summary', data: {} }
const paginaDeTipo = (documento, tipo) => documento?.pages?.find(pagina => pagina.type === tipo) || null;

/** Todas las páginas de ese tipo. */
// 📥 Recibe:   { pages: [{ type: 'summary' }, { type: 'blocked&novelty' }] }, 'blocked&novelty'
// 📤 Devuelve: [{ type: 'blocked&novelty' }]
const paginasDeTipo = (documento, tipo) => documento?.pages?.filter(pagina => pagina.type === tipo) || [];

/** Un número que puede llegar como texto. Lo que no se pueda leer cuenta como 0. */
// 📥 Recibe:   '1,200'
// 📤 Devuelve: 1200
const numeroOCero = valor => {
    const numero = Number(String(valor ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(numero) ? numero : 0;
};

const TIEMPO_VACIO = new Set(['', 'N/A', '--', '00:00:00', 'null', 'undefined']);

/**
 * Una fila de demora cuenta solo si tiene algún tiempo real.
 *
 * Ojo: las filas NO tienen todas la misma forma. Las de primera atención y
 * limpieza guardan {init, end}, mientras que las de Toast POS, entrega y
 * servicio guardan {tomaOrden, listoTablet, listoCocina, EntregaPLato,
 * timeTotal}. Mirar solo init y end descartaba estas últimas por completo.
 * Además hay sitios donde timePeriod llega serializado como cadena.
 */
// 📥 Recibe:   { timePeriod: { init: '19:00:00', end: '19:06:00' } }
// 📤 Devuelve: true
const esDemoraReal = fila => {
    let periodo = fila?.timePeriod;

    if (typeof periodo === 'string') {
        try { periodo = JSON.parse(periodo); } catch { return false; }
    }
    if (!periodo || typeof periodo !== 'object') return false;

    return Object.values(periodo).some(tiempo => {
        if (tiempo === null || tiempo === undefined) return false;
        return !TIEMPO_VACIO.has(String(tiempo).trim());
    });
};

/**
 * Los errores en comanda (errores de ticket) viven en el mismo array que las
 * demoras de preparación y cuentan como una más, igual que en el resumen del
 * diario, que cuenta todo ese array (symary.jsx). Los que se añaden a mano en
 * tablet_pos.jsx nacen con los tiempos en 00:00:00, así que esDemoraReal los
 * descartaba: se reconocen por su alerta, con el mismo criterio que usa
 * tablet_pos.jsx para separarlos.
 */
// 📥 Recibe:   { nameDish: 'drinks', menuRef: { es: 'Error en comanda' }, timePeriod: { tomaOrden: '00:00:00' } }
// 📤 Devuelve: true
const esErrorEnComanda = fila => fila?.menuRef?.es === 'Error en comanda';

/** Una fila de preparación cuenta si tiene tiempo real o si es un error en comanda. */
// 📥 Recibe:   { nameDish: 'drinks', menuRef: { es: 'Error en comanda' }, timePeriod: { tomaOrden: '00:00:00' } }
// 📤 Devuelve: true
const cuentaComoDemoraDePreparacion = fila => esDemoraReal(fila) || esErrorEnComanda(fila);


/* ─────────────────────────── Reconocimiento de alertas ─────────────────────────── */

/** Minúsculas y sin acentos, para comparar nombres del catálogo. */
// 📥 Recibe:   'Posible Devolución'
// 📤 Devuelve: 'posible devolucion'
const sinTildes = texto => String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Reconoce la alerta de clientes que el host no ubicó.
 *
 * El catálogo de alertas (colección Menu de api_jarvis365) vive en la base de
 * datos, no en el código: el nombre exacto no se puede leer desde aquí. Se
 * compara sin acentos ni mayúsculas contra las formas plausibles.
 *
 * Si el nombre real no cae aquí, el reporte lo dirá: `alertasVistas` lista los
 * nombres que sí aparecieron esa semana, y basta con añadir el que falte.
 */
// 📥 Recibe:   'Cliente no ubicado por el host'
// 📤 Devuelve: true
export const esAlertaSinUbicar = (idNovelty, novedad) => {

    if(!idNovelty) return false;
    return idNovelty ==='640f7c747d44282c3f625d55'
};

/**
 * Las devoluciones, que también son alertas de novedad.
 *
 * El catálogo (categoría `food`) trae seis, y las escribe con la mayúscula
 * inicial cambiada de una a otra —"posible devolución de plato" pero "Posible
 * devolución de pedido"—, así que se comparan sin acentos ni mayúsculas.
 *
 * El orden es el del reporte que se emite hoy: plato y pedido primero, que son
 * las dos filas que salen siempre; las otras cuatro solo si hubo alguna.
 */
export const TIPOS_DEVOLUCION = [
    { tipo: 'plato', etiqueta: 'Devoluciones de plato', siempre: true },
    { tipo: 'pedido', etiqueta: 'Devoluciones de pedido', siempre: true },
    { tipo: 'bebida', etiqueta: 'Devoluciones de bebida' },

    // Una devolución cuyo nombre no reconocemos. Va a su propia fila en vez de
    // sumarse a la de plato: inflar una cifra real es peor que una fila de más.
   // { tipo: 'otra', etiqueta: 'Otras devoluciones' },
];

/**
 * El tipo de devolución según el nombre de la alerta, o null si no es una
 * devolución. Gana la primera regla que encaje, así que el orden importa:
 * "plato" va al final porque muchos nombres lo mencionan de pasada.
 */
// 📥 Recibe:   'Posible devolución de pedido'
// 📤 Devuelve: 'pedido'
export const tipoDeDevolucion = nombre => {
    const texto = sinTildes(nombre);
    if (!/devoluc|devuelt/.test(texto)) return null;
    if (/pedido|orden|delivery/.test(texto)) return 'pedido';
    if (/entrada|appetiz/.test(texto)) return 'entrada';
    if (/postre|dessert/.test(texto)) return 'postre';
    if (/bebida|drink|trago/.test(texto)) return 'bebida';
    if (/ensalada|salad/.test(texto)) return 'ensalada';
    if (/plato|dish/.test(texto)) return 'plato';
    return 'otra';
};

/** El nombre de la categoría de plato va en `nameDish`, no en `dish`. */
// 📥 Recibe:   { nameDish: 'Lunch', dish: 'Plato fuerte' }, 'Lunch'
// 📤 Devuelve: true
const esDeLaCategoria = (fila, categoria) => fila?.nameDish === categoria;

/** Cuántas filas son de esa categoría de plato. */
// 📥 Recibe:   [{ nameDish: 'Lunch' }, { nameDish: 'Plato fuerte' }, { nameDish: 'Lunch' }], 'Lunch'
// 📤 Devuelve: 2
const contarDeLaCategoria = (filas, categoria) =>
    filas.filter(fila => esDeLaCategoria(fila, categoria)).length;

/**
 * Configuración de semanales (config_report.weeklyAlerts): alertas del
 * catálogo, por Menu._id, que se suman a cada conteo además de las que el
 * reporte diario ya clasifica solo.
 *
 * Los tres grupos de demora suman ocurrencias a su conteo. El de
 * devoluciones funciona distinto: decide qué páginas de novedad son
 * devoluciones, junto al reconocimiento por nombre (ver contarDevoluciones).
 */
export const GRUPOS_DE_DEMORA = ['firstAttention', 'cleaning', 'preparation'];
export const GRUPOS_SEMANALES = [...GRUPOS_DE_DEMORA, 'returns'];

/**
 * Normaliza la configuración de semanales a un Set de ids por grupo. Los ids
 * pueden llegar sueltos ('a1') o poblados ({ _id: 'a1' }).
 */
// 📥 Recibe:   { returns: ['a1', { _id: 'a2' }] }
// 📤 Devuelve: { firstAttention: Set(0), cleaning: Set(0), preparation: Set(0), returns: Set('a1', 'a2') }
export function normalizaWeeklyAlerts(weeklyAlerts) {
    const idsPorGrupo = {};
    for (const grupo of GRUPOS_SEMANALES) {
        const configuradas = Array.isArray(weeklyAlerts?.[grupo]) ? weeklyAlerts[grupo] : [];
        idsPorGrupo[grupo] = new Set(
            configuradas.map(alerta => String(alerta?._id ?? alerta ?? '')).filter(Boolean)
        );
    }
    return idsPorGrupo;
}

/**
 * Una fila es de barra si trae mesa y no es un número. Sin mesa, es salón.
 * Se usa con las filas que suma la configuración de semanales.
 */
// 📥 Recibe:   { table: 'Barra' }
// 📤 Devuelve: true
const esFilaDeBarra = fila => {
    const mesa = fila?.table;
    if (mesa === undefined || mesa === null || String(mesa).trim() === '') return false;
    return isNaN(Number(mesa));
};

/**
 * El criterio del reporte diario (arrNovelty.tsx), copiado tal cual para las
 * demoras de primera atención. Casi coincide con esFilaDeBarra, pero no del
 * todo: una fila SIN el campo `table` aquí cuenta como barra, porque
 * Number(undefined) es NaN, y allí como salón. Se mantienen separados a
 * propósito para no mover cifras; unificarlos es una decisión de negocio.
 */
// 📥 Recibe:   {}
// 📤 Devuelve: true
const esFilaDeBarraSegunDiario = fila => isNaN(Number(fila?.table));

/** Las categorías de plato del local, en el orden en que se configuraron. */
// 📥 Recibe:   { dishes: [{ nameDishe: 'Lunch' }, { nameDishe: 'Plato fuerte' }] }
// 📤 Devuelve: ['Lunch', 'Plato fuerte']
export function dishesOf(establishment) {
    if (establishment?.dishes?.length) {
        return establishment.dishes.map(categoria => categoria.nameDishe).filter(Boolean);
    }
    const menu = establishment?.dishMenu || {};
    return [menu.appetize, menu.mainDish, menu.dessert].filter(Boolean);
}

/**
 * La categoría de take out. Sus tickets no cuentan como procesos evaluados en
 * el total de la métrica, igual que en el resumen del diario (symary.jsx),
 * que los salta al sumar. Se compara sin mayúsculas ni acentos, como el resto
 * de nombres del catálogo.
 */
// 📥 Recibe:   'Take out'
// 📤 Devuelve: true
export const esTakeOut = categoria => sinTildes(categoria).trim() === 'take out';


/* ─────────────────────────── Lectura de un documento diario ─────────────────────────── */

/**
 * Las páginas de novedad guardan una alerta por página: data.menuRef es la
 * alerta del catálogo y data.body sus ocurrencias, una fila por cada una.
 */
// 📥 Recibe:   { pages: [{ type: 'blocked&novelty', data: { menuRef: { _id: 'a1', es: 'Devolución de postre', category: 'food' }, body: [{}, {}] } }] }
// 📤 Devuelve: [{ id: 'a1', nombre: 'Devolución de postre', categoria: 'food', ocurrencias: [{}, {}] }]
function leerNovedades(documento) {
    return paginasDeTipo(documento, 'blocked&novelty').map(pagina => ({
        id: String(pagina?.data?.menuRef?._id ?? ''),
        nombre: pagina?.data?.menuRef?.es || '',
        categoria: pagina?.data?.menuRef?.category || '',
        ocurrencias: pagina?.data?.body || [],
    }));
}

/**
 * Las filas que la configuración de semanales suma a cada grupo de demora:
 * la página de novedad cuya alerta (menuRef._id) esté en la lista de un grupo
 * cuenta como esa demora. Las base ya vienen aparte en delay1ra, delayClear y
 * toastPost —una alerta de categoría `delay` nunca llega como página de
 * novedad—, así que no hay doble conteo.
 */
// 📥 Recibe:   [{ id: 'a1', ocurrencias: [{ table: '4' }] }], { cleaning: new Set(['a1']) }
// 📤 Devuelve: { firstAttention: [], cleaning: [{ table: '4' }], preparation: [] }
function filasExtraPorGrupo(novedades, alertasExtra) {
    const filas = { firstAttention: [], cleaning: [], preparation: [] };
    if (!alertasExtra) return filas;
    for (const novedad of novedades) {
        if (!novedad.id) continue;
        for (const grupo of GRUPOS_DE_DEMORA) {
            if (alertasExtra[grupo]?.has(novedad.id)) filas[grupo].push(...novedad.ocurrencias);
        }
    }
    return filas;
}

/**
 * Las devoluciones del turno, por tipo.
 *
 * Una página de novedad es una devolución si su alerta está en el grupo de
 * devoluciones de la configuración, por id, o si su nombre la delata. Es una
 * cosa o la otra, nunca las dos: cada página se cuenta una sola vez, así que
 * las seis base, que cumplen ambas, no se duplican. El nombre se conserva de
 * respaldo porque la familia es abierta y un tipo nuevo del catálogo no
 * estaría todavía en la configuración.
 *
 * El tipo, y con él la fila de la tabla, lo sigue diciendo el nombre. Una
 * alerta añadida a mano cuyo nombre no encaje en ninguno va a "otra".
 * `soloPorConfiguracion` cuenta las que entran gracias a la configuración: las
 * que además reconoce el nombre ya contaban sin ella.
 */
// 📥 Recibe:   [{ id: 'a1', nombre: 'posible devolución de plato', ocurrencias: [{}, {}] }, { id: 'x9', nombre: 'Queja', ocurrencias: [{}] }], { returns: new Set(['x9']) }
// 📤 Devuelve: { porTipo: { plato: 2, otra: 1 }, soloPorConfiguracion: 1 }
function contarDevoluciones(novedades, alertasExtra) {
    const porTipo = {};
    let soloPorConfiguracion = 0;
    for (const novedad of novedades) {
        const tipoPorNombre = tipoDeDevolucion(novedad.nombre);
        const estaEnConfiguracion = novedad.id !== '' && alertasExtra?.returns?.has(novedad.id) === true;
        if(tipoPorNombre === 'otra') continue;
        if (!tipoPorNombre && !estaEnConfiguracion) continue;
        const tipo = tipoPorNombre || 'otra';
        porTipo[tipo] = (porTipo[tipo] || 0) + novedad.ocurrencias.length;
        if (!tipoPorNombre) soloPorConfiguracion += novedad.ocurrencias.length;
    }
    return { porTipo, soloPorConfiguracion };
}

/**
 * Una columna de toques del resumen diario.
 *
 * El nombre viene como `${cargo} ${nombre}`: "Gerente Johana", "Asistente
 * Desiree". El reporte titula cada bloque con ese cargo, así que se separa
 * aquí. `firt`, con la errata, es como lo guarda el diario.
 */
// 📥 Recibe:   { name: 'Gerente Johana', result: { firt: { value: 12 }, second: { value: 14 } } }
// 📤 Devuelve: { id: 'Gerente Johana', name: 'Gerente Johana', cargo: 'Gerente', persona: 'Johana', primeros: 12, otros: 14, total: 0 }
function leerToque(columna) {
    const nombreCompleto = (columna?.name || 'Sin nombre').trim();
    const primerEspacio = nombreCompleto.indexOf(' ');
    const tieneCargo = primerEspacio > 0;
    return {
        id: columna?._id || nombreCompleto,
        name: nombreCompleto,
        cargo: tieneCargo ? nombreCompleto.slice(0, primerEspacio) : '',
        persona: tieneCargo ? nombreCompleto.slice(primerEspacio + 1) : nombreCompleto,
        primeros: numeroOCero(columna?.result?.firt?.value),
        otros: numeroOCero(columna?.result?.second?.value),
        total: numeroOCero(columna?.result?.total),
    };
}

const CATEGORIAS_DE_INCIDENCIA = ['incident', 'localIncident'];

/**
 * Extrae de un documento diario las cifras que el semanal necesita: una
 * lectura. Devolver una forma plana hace que la agregación posterior sea
 * trivial.
 */
// 📥 Recibe:   documento del lunes 24 diurno de Bocas: { date: '2026-08-24', shift: 'day', pages: [summary, delay1ra, delayClear, …] }
// 📤 Devuelve: { date: '2026-08-24', shift: 'day', rotacionesSalon: 57, rotacionesBarra: 0, rotaciones: 57, demora1ra: 0, demoraLimpieza: 1, toques: […], … }
export function readDailyDocument(doc, alertasExtra = null) {
    const resumen = paginaDeTipo(doc, 'summary')?.data;
    const primeraAtencion = paginaDeTipo(doc, 'delay1ra')?.data;
    const limpieza = paginaDeTipo(doc, 'delayClear')?.data;
    // Toast POS (preparación), entrega y servicio comparten una sola página.
    const preparacionEntregaYServicio = paginaDeTipo(doc, 'delayToastPostAndServise')?.data;

    // Salón y barra van SEPARADOS en el cuadro general, pero los gráficos por
    // día y los porcentajes usan la suma de los dos.
    const rotacionesSalon = numeroOCero(resumen?.totalOfOccupiedTables);
    const rotacionesBarra = resumen?.totalOfOccupiedTablesBar?.bodyForTable?.length || 0;

    const novedades = leerNovedades(doc);
    const filasExtra = filasExtraPorGrupo(novedades, alertasExtra);
    const devoluciones = contarDevoluciones(novedades, alertasExtra);
   
    const extraPrimeraAtencion = filasExtra.firstAttention.length;
    const extraPrimeraAtencionBarra = filasExtra.firstAttention.filter(esFilaDeBarra).length;

    // "Demora de primera atención" mezcla mesas de salón y de barra. El reporte
    // diario las separa por el campo table: si no es un número, es de barra.
    // Se replica ese mismo criterio, que está en arrNovelty.tsx.
    const filasPrimeraAtencion = (primeraAtencion?.body || []).filter(esDemoraReal);
    const filasPrimeraAtencionBarra = filasPrimeraAtencion.filter(esFilaDeBarraSegunDiario);

    const toques = (resumen?.touch || []).map(leerToque);

    const preparacion = preparacionEntregaYServicio?.delayToastPost || {};
    const entrega = preparacionEntregaYServicio?.delayDeliveryDishWhenItIsReadyInKitchen || {};
    const servicio = preparacionEntregaYServicio?.delayServices || {};

    return {
        date: normalizeDate(doc?.date),
        shift: doc?.shift || 'all',
        establishmentName: doc?.establishmentName || null,

        rotacionesSalon,
        rotacionesBarra,
        rotaciones: rotacionesSalon + rotacionesBarra,

        // countTotalUsePhone es "Uso de celular", otra cosa. Los clientes que
        // el host no ubicó salen de las páginas de novedad.
        usoDeCelular: numeroOCero(resumen?.countTotalUsePhone),
        clientesSinUbicar: novedades
            .filter(novedad => esAlertaSinUbicar(novedad.id, novedad))
            .reduce((total, novedad) => total + novedad.ocurrencias.length, 0),

        // Las devoluciones son alertas de la categoría `food`: una página por
        // nombre, una fila de `body` por devolución, agrupadas por tipo.
        devoluciones: devoluciones.porTipo,

        demora1ra: filasPrimeraAtencion.length + extraPrimeraAtencion,
        demora1raBarra: filasPrimeraAtencionBarra.length + extraPrimeraAtencionBarra,
        demora1raSalon: (filasPrimeraAtencion.length - filasPrimeraAtencionBarra.length)
            + (extraPrimeraAtencion - extraPrimeraAtencionBarra),
        demoraLimpieza: (limpieza?.body || []).filter(esDemoraReal).length
            + filasExtra.cleaning.length,

        // Cuántas ocurrencias sumó la configuración de semanales en este turno.
        alertasExtra: {
            firstAttention: extraPrimeraAtencion,
            cleaning: filasExtra.cleaning.length,
            preparation: filasExtra.preparation.length,
            returns: devoluciones.soloPorConfiguracion,
        },

        // Los nombres de alerta que aparecieron, para poder afinar el
        // reconocimiento cuando alguno no se identifique.
        alertasVistas: novedades.map(novedad => novedad.nombre).filter(Boolean),

        promedio1ra: resumen?.averageTimeToFirstResponse || 'N/A',
        promedioLimpieza: resumen?.averageTimeToCleartTable || 'N/A',
        promedioPlatoFuerte: resumen?.averageTimeToReceiveTheMainCourse || 'N/A',

        toques,

        // categoryMetrics va indexado por nombre de plato y solo trae
        // totalTickets y avgPreparation.
        metricasPreparacion: preparacion.categoryMetrics || {},

        // Incluye los errores en comanda, que el diario también cuenta aquí.
        demorasPreparacion: (preparacion.delay || []).filter(cuentaComoDemoraDePreparacion),
        // Sin categoría de plato: van al total y a los gráficos por día.
        demorasPreparacionExtra: filasExtra.preparation.length,
        demorasEntrega: (entrega.delay || []).filter(esDemoraReal),
        demorasServicio: (servicio.delay || []).filter(esDemoraReal),

        incidencias: novedades
            .filter(novedad => CATEGORIAS_DE_INCIDENCIA.includes(novedad.categoria))
            .reduce((total, novedad) => total + (novedad.ocurrencias.length || 0), 0),
    };
}


/* ─────────────────────────── Herramientas de agregación ─────────────────────────── */

/** 'day' y 'night' son turnos; cualquier otra cosa, incluido undefined, es el turno único. */
// 📥 Recibe:   'tarde'
// 📤 Devuelve: 'all'
const turnoDe = shift => (shift === 'day' || shift === 'night' ? shift : 'all');

/** Una fila de tabla vacía: una columna por turno y la del total. */
// 📥 Recibe:   (nada)
// 📤 Devuelve: { day: 0, night: 0, all: 0, total: 0 }
const turnosEnCero = () => ({ day: 0, night: 0, all: 0, total: 0 });

/** Suma el valor en la columna de su turno y en la del total. Modifica `acumulado`. */
// 📥 Recibe:   { day: 0, night: 0, all: 0, total: 0 }, 'night', 5
// 📤 Devuelve: nada; `acumulado` queda { day: 0, night: 5, all: 0, total: 5 }
function sumarAlTurno(acumulado, turno, valor) {
    acumulado[turno] += valor;
    acumulado.total += valor;
}

/** Las lecturas de un turno. */
// 📥 Recibe:   [{ shift: 'day' }, { shift: 'night' }], 'night'
// 📤 Devuelve: [{ shift: 'night' }]
const lecturasDelTurno = (lecturas, turno) => lecturas.filter(lectura => turnoDe(lectura.shift) === turno);

/** Las lecturas de un día, normalmente una por turno. */
// 📥 Recibe:   [{ date: '2026-08-24' }, { date: '2026-08-25' }], '2026-08-24'
// 📤 Devuelve: [{ date: '2026-08-24' }]
const lecturasDelDia = (lecturas, fecha) => lecturas.filter(lectura => lectura.date === fecha);

/**
 * Una cifra de la semana en las dos formas que usa el reporte: por turno para
 * las tablas y por día y turno para las gráficas. Las dos salen del mismo
 * valor por documento en una sola pasada, así que lo que suma la gráfica es,
 * por construcción, el total que enseña la tabla.
 */
// 📥 Recibe:   lecturas, dias, lectura => lectura.demorasEntrega.length
// 📤 Devuelve: { turnos: { day: 3, night: 1, all: 0, total: 4 }, porDia: [{ date: '2026-08-24', weekday: 'Lunes', day: 1, night: 0, all: 0 }, …] }
function serieSemanal(lecturas, dias, valorDe) {
    const turnos = turnosEnCero();
    const porDia = dias.map(({ date, weekday }) => ({ date, weekday, day: 0, night: 0, all: 0 }));
    const posicionDeLaFecha = new Map(dias.map((dia, posicion) => [dia.date, posicion]));
    for (const lectura of lecturas) {
        const posicion = posicionDeLaFecha.get(lectura.date);
        if (posicion === undefined) continue;
        const turno = turnoDe(lectura.shift);
        const valor = valorDe(lectura) || 0;
        sumarAlTurno(turnos, turno, valor);
        porDia[posicion][turno] += valor;
    }
    return { turnos, porDia };
}

/**
 * Porcentaje redondeado. Un decimal en casi todo el reporte; `decimales`
 * existe para las cifras que el libro escribe con más precisión. Sin
 * denominador devuelve null, no cero.
 */
// 📥 Recibe:   5, 1319, 2
// 📤 Devuelve: 0.38
const porcentaje = (parte, sobre, decimales = 1) =>
    (sobre > 0 ? +(parte / sobre * 100).toFixed(decimales) : null);

/** Fracción sin redondear, para promediar como lo hace Excel: solo se redondea al exponer. */
// 📥 Recibe:   12, 57
// 📤 Devuelve: 0.21052631578947367
const razon = (parte, sobre) => (sobre > 0 ? parte / sobre : null);

/** Fracción → porcentaje con un decimal, que es como se expone. null sigue siendo null. */
// 📥 Recibe:   0.21052631578947367
// 📤 Devuelve: 21.1
const fraccionAPorcentaje = fraccion =>
    (fraccion === null || fraccion === undefined ? null : +(fraccion * 100).toFixed(1));

/**
 * AVERAGEIF(rango, ">0.0%") del libro de Excel: promedia solo los valores
 * mayores que cero. Los ceros, los nulos, los N/A y los #DIV/0! quedan fuera
 * en vez de arrastrar el promedio hacia abajo. Sin ningún valor devuelve null.
 */
// 📥 Recibe:   [0.25, 0, null, 0.75]
// 📤 Devuelve: 0.5
export const promedioSinVacios = valores => {
    const positivos = valores.filter(valor => typeof valor === 'number' && Number.isFinite(valor) && valor > 0);
    return positivos.length ? sumar(positivos) / positivos.length : null;
};

/** Procesos evaluados (tickets) de una categoría en un grupo de lecturas. */
// 📥 Recibe:   [{ metricasPreparacion: { Lunch: { totalTickets: '19' } } }, { metricasPreparacion: { Lunch: { totalTickets: 14 } } }], 'Lunch'
// 📤 Devuelve: 33
const procesosEvaluados = (lecturas, categoria) =>
    lecturas.reduce((suma, lectura) => suma + numeroOCero(lectura.metricasPreparacion?.[categoria]?.totalTickets), 0);

/** Demoras de preparación de una categoría en un grupo de lecturas. */
// 📥 Recibe:   [{ demorasPreparacion: [{ nameDish: 'Lunch' }, { nameDish: 'Plato fuerte' }] }], 'Lunch'
// 📤 Devuelve: 1
const demorasDePreparacion = (lecturas, categoria) =>
    lecturas.reduce((suma, lectura) => suma + contarDeLaCategoria(lectura.demorasPreparacion, categoria), 0);

/**
 * Tiempo medio de preparación de una categoría.
 *
 * El libro de Excel promedia SIN ponderar. Su fórmula es
 *   BJ = AVERAGE(valores diarios del turno)   y   BL = AVERAGE(BJ, BK)
 * y los blancos se saltan. Comprobado contra tres casos de dos
 * establecimientos: Bocas plato fuerte 00:12:16, Francisca Doral plato
 * fuerte 00:09:06 y entrada 00:05:09. Ponderar por volumen sería más
 * correcto estadísticamente, pero daría cifras distintas a las del reporte
 * que se emite, y el objetivo es reproducirlo.
 *
 * Un turno sin procesos de esa categoría no entra en el promedio. En el
 * libro esa celda queda en blanco y AVERAGE la salta; aquí el documento
 * conserva un promedio residual que, si se contara, ensuciaría la cifra.
 */
// 📥 Recibe:   [{ metricasPreparacion: { Lunch: { totalTickets: 19, avgPreparation: '00:10:53' } } }, { metricasPreparacion: { Lunch: { totalTickets: 0, avgPreparation: '00:30:00' } } }], 'Lunch'
// 📤 Devuelve: '00:10:53'
const promedioDePreparacion = (lecturas, categoria) => averageHms(
    lecturas
        .filter(lectura => numeroOCero(lectura.metricasPreparacion?.[categoria]?.totalTickets) > 0)
        .map(lectura => lectura.metricasPreparacion?.[categoria]?.avgPreparation)
);

/** Demoras de preparación sumadas por la configuración de semanales, que no tienen categoría. */
// 📥 Recibe:   [{ demorasPreparacionExtra: 2 }, {}]
// 📤 Devuelve: 2
const demorasExtraDe = lecturas =>
    lecturas.reduce((suma, lectura) => suma + (lectura.demorasPreparacionExtra || 0), 0);


/* ─────────────────────────── Secciones del reporte ─────────────────────────── */

/**
 * Cuadro general, la tabla de la hoja 2.
 *
 * Salón y barra son filas distintas, como en el reporte real. Las filas que
 * no aplican al establecimiento se omiten al dibujar.
 *
 * La primera atención se expone repartida, igual que las rotaciones: salón,
 * barra y el total. Antes solo salía una de las tres, y cuál era dependía de
 * requireBarTable, así que el cuadro y el gráfico podían enseñar cifras
 * distintas y las de barra no aparecían en ninguna fila. Quién dibuja qué lo
 * decide aplica.barra, no este cálculo.
 */
// 📥 Recibe:   lecturas de Bocas
// 📤 Devuelve: { rotacionesSalon: { day: 314, night: 141, all: 0, total: 455 }, …, demora1ra: { day: 3, night: 2, all: 0, total: 5 }, porcentaje1ra: { day: 1, night: 1.4, all: null, total: 1.1 }, … }
function calcularCuadroGeneral(lecturas) {
    // Cada fila del cuadro se llama igual que el campo de la lectura que suma.
    const sumas = {
        rotacionesSalon: turnosEnCero(),
        rotacionesBarra: turnosEnCero(),
        rotaciones: turnosEnCero(),
        clientesSinUbicar: turnosEnCero(),
        demora1raSalon: turnosEnCero(),
        demora1raBarra: turnosEnCero(),
        demora1ra: turnosEnCero(),
        demoraLimpieza: turnosEnCero(),
    };
    for (const lectura of lecturas) {
        const turno = turnoDe(lectura.shift);
        for (const campo of Object.keys(sumas)) sumarAlTurno(sumas[campo], turno, lectura[campo]);
    }

    // Porcentaje de demora sobre TODAS las rotaciones del mismo turno, salón y
    // barra incluidas. Es el mismo denominador que usan los gráficos, así que
    // la fila del cuadro y la hoja de porcentaje dicen lo mismo. Sin
    // rotaciones el porcentaje es null, no cero: no es que no hubiera
    // demoras, es que no hay sobre qué calcularlo.
    const sobreRotaciones = demoras => ({
        day: porcentaje(demoras.day, sumas.rotaciones.day),
        night: porcentaje(demoras.night, sumas.rotaciones.night),
        all: porcentaje(demoras.all, sumas.rotaciones.all),
        total: porcentaje(demoras.total, sumas.rotaciones.total),
    });

    return {
        rotacionesSalon: sumas.rotacionesSalon,
        rotacionesBarra: sumas.rotacionesBarra,
        rotaciones: sumas.rotaciones,
        clientesSinUbicar: sumas.clientesSinUbicar,
        demora1raSalon: sumas.demora1raSalon,
        demora1raBarra: sumas.demora1raBarra,
        demora1ra: sumas.demora1ra,
        porcentaje1ra: sobreRotaciones(sumas.demora1ra),
        demoraLimpieza: sumas.demoraLimpieza,
        porcentajeLimpieza: sobreRotaciones(sumas.demoraLimpieza),
    };
}

/**
 * Serie por día del cuadro general, para los gráficos.
 *
 * Las rotaciones del gráfico incluyen la barra, y el porcentaje de demora se
 * calcula sobre ese mismo total: así es como cuadran los PDF emitidos.
 */
// 📥 Recibe:   lecturas de Bocas, dias
// 📤 Devuelve: [{ date: '2026-08-24', weekday: 'Lunes', day: { presente: true, rotaciones: 57, …, porcentajeLimpieza: 1.8 }, night: {…}, all: { presente: false, … } }, …]
function calcularSeriePorDia(lecturas, dias) {
    return dias.map(({ date, weekday }) => {
        const delDia = lecturasDelDia(lecturas, date);
        const resumenDelTurno = turno => {
            const delTurno = lecturasDelTurno(delDia, turno);
            const rotaciones = sumaDe(delTurno, 'rotaciones');
            const demora1ra = sumaDe(delTurno, 'demora1ra');
            const demoraLimpieza = sumaDe(delTurno, 'demoraLimpieza');
            return {
                presente: delTurno.length > 0,
                rotaciones,
                rotacionesSalon: sumaDe(delTurno, 'rotacionesSalon'),
                rotacionesBarra: sumaDe(delTurno, 'rotacionesBarra'),
                demora1ra,
                demora1raSalon: sumaDe(delTurno, 'demora1raSalon'),
                demora1raBarra: sumaDe(delTurno, 'demora1raBarra'),
                demoraLimpieza,
                porcentaje1ra: porcentaje(demora1ra, rotaciones),
                porcentajeLimpieza: porcentaje(demoraLimpieza, rotaciones),
            };
        };
        return {
            date,
            weekday,
            day: resumenDelTurno('day'),
            night: resumenDelTurno('night'),
            all: resumenDelTurno('all'),
        };
    });
}

/*
 * ── Toques ──
 * Calcado del libro de Excel ('Base de datos', el bloque de cada persona):
 *
 *   P.T de un turno   = primeros toques / rotaciones de ese turno    (E$9/AZ$28)
 *   O.T de un turno   = otros toques    / primeros toques            (E$10/E$9)
 *   Promedio diario   = AVERAGEIF(los dos turnos, ">0.0%")           (filas 15 y 16)
 *   Promedio semanal  = AVERAGEIF(los siete días, ">0.0%")           (AA15 y AA16)
 *
 * AVERAGEIF con ">0.0%" salta los ceros, los N/A y los #DIV/0!: un turno
 * que no se reportó, o que no tuvo toques, no arrastra el promedio hacia
 * abajo. Se promedian las fracciones sin redondear, como hace Excel, y solo
 * se redondea al exponer.
 *
 * "Otros toques" va sobre los primeros, no sobre las rotaciones, y por eso
 * puede pasar del 100 % (Tiago Ferreira, domingo 30 de agosto: 137 %).
 */

/**
 * Junta los toques de la semana en una ficha por persona, con un registro
 * por fecha que guarda cada turno y sus fracciones sin redondear.
 */
// 📥 Recibe:   lecturas de Bocas
// 📤 Devuelve: [{ name: 'Gerente Johana', cargo: 'Gerente', persona: 'Johana', registrosPorFecha: Map(7), soloTotal: false }, { name: 'Asistente Desiree Agüero', … }]
function agruparToquesPorPersona(lecturas) {
    const fichas = new Map();
    for (const lectura of lecturas) {
        for (const toque of lectura.toques) {
            if (!fichas.has(toque.name)) {
                fichas.set(toque.name, {
                    name: toque.name,
                    cargo: toque.cargo,
                    persona: toque.persona,
                    registrosPorFecha: new Map(),
                    soloTotal: true,
                });
            }
            const ficha = fichas.get(toque.name);
            // Con un solo turno que separe primeros y otros ya no es "solo total".
            if (toque.primeros > 0 || toque.otros > 0) ficha.soloTotal = false;

            if (!ficha.registrosPorFecha.has(lectura.date)) {
                ficha.registrosPorFecha.set(lectura.date, { turnos: [], primeros: 0, otros: 0, rotaciones: 0 });
            }
            const registro = ficha.registrosPorFecha.get(lectura.date);
            registro.turnos.push({
                shift: lectura.shift,
                primeros: toque.primeros,
                otros: toque.otros,
                rotaciones: lectura.rotaciones,
                fraccionPrimeros: razon(toque.primeros, lectura.rotaciones),
                fraccionOtros: razon(toque.otros, toque.primeros),
            });
            registro.primeros += toque.primeros;
            registro.otros += toque.otros;
            registro.rotaciones += lectura.rotaciones;
        }
    }
    return [...fichas.values()];
}

/** El bloque de una persona: sus siete días, el promedio semanal y los totales. */
// 📥 Recibe:   ficha de 'Gerente Johana', dias
// 📤 Devuelve: { name: 'Gerente Johana', cargo: 'Gerente', persona: 'Johana', soloTotal: false, porDia: [7 días], promedioSemanal: { pctPrimeros: 27.2, pctOtros: 116.7 }, totales: { primeros: 84, otros: 98, rotaciones: 314 }, diasConRegistro: 7, diasQueCuentan: { primeros: 7, otros: 7 } }
function resumirToquesDePersona(ficha, dias) {
    const semana = dias.map(({ date, weekday }) => {
        const registro = ficha.registrosPorFecha.get(date);
        if (!registro) {
            return {
                date, weekday, presente: false, turnos: [],
                primeros: 0, otros: 0, rotaciones: 0,
                fraccionPrimeros: null, fraccionOtros: null,
            };
        }
        return {
            date,
            weekday,
            presente: true,
            turnos: registro.turnos.map(turno => ({
                shift: turno.shift,
                primeros: turno.primeros,
                otros: turno.otros,
                rotaciones: turno.rotaciones,
                pctPrimeros: fraccionAPorcentaje(turno.fraccionPrimeros),
                pctOtros: fraccionAPorcentaje(turno.fraccionOtros),
            })),
            primeros: registro.primeros,
            otros: registro.otros,
            rotaciones: registro.rotaciones,
            // Promedio diario: la media de los turnos con valor.
            fraccionPrimeros: promedioSinVacios(registro.turnos.map(turno => turno.fraccionPrimeros)),
            fraccionOtros: promedioSinVacios(registro.turnos.map(turno => turno.fraccionOtros)),
        };
    });

    // Promedio semanal: la media de los días con valor. Cada serie cuenta sus
    // propios días, como las dos celdas AA del libro.
    const promedioSemanalPrimeros = promedioSinVacios(semana.map(dia => dia.fraccionPrimeros));
    const promedioSemanalOtros = promedioSinVacios(semana.map(dia => dia.fraccionOtros));
    const diasPresentes = semana.filter(dia => dia.presente);

    return {
        name: ficha.name,
        cargo: ficha.cargo,
        persona: ficha.persona,
        soloTotal: ficha.soloTotal,
        porDia: semana.map(({ fraccionPrimeros, fraccionOtros, ...dia }) => ({
            ...dia,
            // null = N/A: la hoja lo dibuja en 0 % y no entra en el promedio.
            pctPrimeros: fraccionAPorcentaje(fraccionPrimeros),
            pctOtros: fraccionAPorcentaje(fraccionOtros),
        })),
        promedioSemanal: {
            pctPrimeros: fraccionAPorcentaje(promedioSemanalPrimeros),
            pctOtros: fraccionAPorcentaje(promedioSemanalOtros),
        },
        totales: {
            primeros: sumaDe(diasPresentes, 'primeros'),
            otros: sumaDe(diasPresentes, 'otros'),
            rotaciones: sumaDe(diasPresentes, 'rotaciones'),
        },
        diasConRegistro: diasPresentes.length,
        // Los días que de verdad entran en cada promedio semanal.
        diasQueCuentan: {
            primeros: semana.filter(dia => dia.fraccionPrimeros > 0).length,
            otros: semana.filter(dia => dia.fraccionOtros > 0).length,
        },
    };
}

/** Un bloque de toques por persona, de la que más toques hizo a la que menos. */
// 📥 Recibe:   lecturas de Bocas, dias
// 📤 Devuelve: [bloque de 'Gerente Johana' (182 toques), bloque de 'Asistente Desiree Agüero' (77 toques)]
function calcularToques(lecturas, dias) {
    const toquesDeLaSemana = bloque => bloque.totales.primeros + bloque.totales.otros;
    return agruparToquesPorPersona(lecturas)
        .map(ficha => resumirToquesDePersona(ficha, dias))
        .sort((uno, otro) => toquesDeLaSemana(otro) - toquesDeLaSemana(uno));
}

/**
 * Tabla general de métrica.
 *
 * Filas: procesos evaluados, un promedio por categoría, una cuenta de demoras
 * por categoría, el total y su porcentaje. Columnas por turno.
 *
 * Los tickets de take out no entran en `procesos` ni en `procesosTotales`,
 * como en el resumen del diario. Su fila sigue en `porPlato`, con su promedio
 * y sus demoras, y esas demoras sí cuentan en `demorasTotales` y en
 * `porcentajeDemora`. Es la aritmética del PDF que se emite: Hialeah
 * Gardens escribe 3 demoras (2 de take out) sobre 147 procesos, 2.0 %.
 */
// 📥 Recibe:   lecturas de Bocas, ['Lunch', 'Plato fuerte']
// 📤 Devuelve: { procesos: { day: 312, night: 138, all: 0, total: 450 }, porPlato: [{ dish: 'Lunch', day: {…}, night: {…}, all: {…}, total: {…} }, …], procesosTotales: 450, demorasTotales: 63, demorasExtra: {…}, porcentajeDemora: 14 }
function calcularMetrica(lecturas, categorias) {
    const porPlato = categorias.map(categoria => {
        const columnaDelTurno = turno => {
            const delTurno = lecturasDelTurno(lecturas, turno);
            const procesos = procesosEvaluados(delTurno, categoria);
            const demoras = demorasDePreparacion(delTurno, categoria);
            return {
                procesos,
                demoras,
                promedio: promedioDePreparacion(delTurno, categoria),
                porcentaje: porcentaje(demoras, procesos),
            };
        };
        const day = columnaDelTurno('day');
        const night = columnaDelTurno('night');
        const all = columnaDelTurno('all');
        const procesos = day.procesos + night.procesos + all.procesos;
        const demoras = day.demoras + night.demoras + all.demoras;
        return {
            dish: categoria,
            day,
            night,
            all,
            total: {
                procesos,
                demoras,
                // El total es el promedio de los turnos, no de todos los días
                promedio: averageHms([day.promedio, night.promedio, all.promedio]),
                porcentaje: porcentaje(demoras, procesos),
            },
        };
    });

    // Take out se queda fuera del total: la hoja de métrica lo restaba al
    // pintarse, y lo hacía sobre el reporte en cada render.
    const procesos = turnosEnCero();
    for (const fila of porPlato) {
        if (esTakeOut(fila.dish)) continue;
        procesos.day += fila.day.procesos;
        procesos.night += fila.night.procesos;
        procesos.all += fila.all.procesos;
        procesos.total += fila.total.procesos;
    }

    // Alertas configuradas como demora en preparación: no tienen categoría de
    // plato, así que van al total, a los gráficos por día y a una fila propia
    // de la tabla de métrica.
    const demorasExtra = turnosEnCero();
    for (const lectura of lecturas) {
        sumarAlTurno(demorasExtra, turnoDe(lectura.shift), lectura.demorasPreparacionExtra || 0);
    }

    const demorasTotales = sumar(porPlato.map(fila => fila.total.demoras)) + demorasExtra.total;

    return {
        procesos,
        porPlato,
        procesosTotales: procesos.total,
        demorasTotales,
        demorasExtra,
        // A dos decimales, como lo escribe el libro: 5 demoras sobre 1319
        // procesos son «0.38%», y con un decimal salía «0.4%». Al ser un
        // número, los ceros de cola no se imprimen: el 14 de Bocas sigue
        // saliendo «14%», igual que en su PDF.
        // Todas las demoras, take out incluido, sobre los procesos sin take
        // out: así lo escribe el PDF (3 sobre 147 en Hialeah Gardens, 2.0 %)
        // y así lo hace el resumen del diario, que cuenta todo el array de
        // demoras y salta solo los tickets de take out.
        porcentajeDemora: porcentaje(demorasTotales, procesos.total, 2),
    };
}

/**
 * Demoras de preparación por día, desglosadas por categoría y por turno.
 *
 * `porPlato` más `extra` es `cantidad`, y la semana de `cantidad` es
 * metrica.demorasTotales: el gráfico por categoría dibuja las dos partes
 * para que sus barras sumen lo mismo que la tabla.
 *
 * `procesos`, el denominador de `porcentaje`, va sin take out, con la
 * misma regla que metrica.procesosTotales: las demoras de take out sí
 * cuentan en `cantidad`, sus tickets no cuentan como procesos evaluados.
 */
// 📥 Recibe:   lecturas de Bocas, dias, ['Lunch', 'Plato fuerte']
// 📤 Devuelve: [{ date: '2026-08-24', weekday: 'Lunes', porPlato: { Lunch: 9, 'Plato fuerte': 7 }, extra: 0, cantidad: 16, procesos: 68, porcentaje: 23.5, day: 15, night: 1, all: 0 }, …]
function calcularDemorasPorDia(lecturas, dias, categorias) {
    return dias.map(({ date, weekday }) => {
        const delDia = lecturasDelDia(lecturas, date);
        const porPlato = {};
        for (const categoria of categorias) porPlato[categoria] = demorasDePreparacion(delDia, categoria);

        const extra = demorasExtraDe(delDia);
        const cantidad = sumar(Object.values(porPlato)) + extra;
        const procesos = sumar(categorias
            .filter(categoria => !esTakeOut(categoria))
            .map(categoria => procesosEvaluados(delDia, categoria)));

        const demorasDelTurno = turno => {
            const delTurno = lecturasDelTurno(delDia, turno);
            return sumar(categorias.map(categoria => demorasDePreparacion(delTurno, categoria)))
                + demorasExtraDe(delTurno);
        };

        return {
            date,
            weekday,
            porPlato,
            extra,
            cantidad,
            procesos,
            porcentaje: porcentaje(cantidad, procesos),
            day: demorasDelTurno('day'),
            night: demorasDelTurno('night'),
            all: demorasDelTurno('all'),
        };
    });
}

/**
 * Procesos evaluados por día y turno, para el gráfico apilado.
 * Sin take out, como el total de la tabla de métrica: así las barras de la
 * semana suman lo mismo que esa tabla.
 */
// 📥 Recibe:   lecturas de Bocas, dias, ['Lunch', 'Plato fuerte']
// 📤 Devuelve: [{ date: '2026-08-24', weekday: 'Lunes', day: 57, night: 11, all: 0 }, …]
function calcularProcesosPorDia(lecturas, dias, categorias) {
    const queCuentan = categorias.filter(categoria => !esTakeOut(categoria));
    return dias.map(({ date, weekday }) => {
        const delDia = lecturasDelDia(lecturas, date);
        const procesosDelTurno = turno => {
            const delTurno = lecturasDelTurno(delDia, turno);
            return sumar(queCuentan.map(categoria => procesosEvaluados(delTurno, categoria)));
        };
        return {
            date,
            weekday,
            day: procesosDelTurno('day'),
            night: procesosDelTurno('night'),
            all: procesosDelTurno('all'),
        };
    });
}

/**
 * Demoras en entrega, por categoría, y demoras de servicio.
 * Van en la misma hoja que las devoluciones, como en el reporte de Excel.
 */
// 📥 Recibe:   lecturas, dias, ['Lunch', 'Plato fuerte'], 450
// 📤 Devuelve: { entregas: { day: 3, night: 1, all: 0, total: 4 }, servicios: {…}, porPlato: [{ dish: 'Lunch', day: 2, night: 0, all: 0, total: 2 }, …], sinCategoria: {…}, porDia: [{ date: '2026-08-24', weekday: 'Lunes', day: 1, night: 1, all: 0, porPlato: { Lunch: 1, 'Plato fuerte': 1 }, sinCategoria: 0 }, …], porcentaje: 0.9 }
function calcularEntregasYServicios(lecturas, dias, categorias, procesosTotales) {
    const porPlato = categorias.map(categoria => {
        const demorasDelTurno = turno => lecturasDelTurno(lecturas, turno)
            .reduce((suma, lectura) => suma + contarDeLaCategoria(lectura.demorasEntrega, categoria), 0);
        const day = demorasDelTurno('day');
        const night = demorasDelTurno('night');
        const all = demorasDelTurno('all');
        return { dish: categoria, day, night, all, total: day + night + all };
    });

    // La fila de total y el gráfico de entregas salen de la misma serie.
    const entregas = serieSemanal(lecturas, dias, lectura => lectura.demorasEntrega.length);
    const servicios = serieSemanal(lecturas, dias, lectura => lectura.demorasServicio.length).turnos;

    // Las demoras en entrega cuya categoría no es ninguna de las configuradas
    // cuentan en el total y en el gráfico, así que también llevan su fila:
    // sin ella, las filas de la tabla no sumaban la cifra de abajo.
    const esDeCategoriaConfigurada = fila => categorias.some(categoria => esDeLaCategoria(fila, categoria));
    const sinCategoriaEn = lectura => lectura.demorasEntrega.filter(fila => !esDeCategoriaConfigurada(fila)).length;
    const sinCategoria = serieSemanal(lecturas, dias, sinCategoriaEn).turnos;

    // La gráfica junta los dos turnos de cada día y los reparte por categoría,
    // como la hoja del reporte manual. Cada día conserva day, night y all, y
    // su porPlato más su sinCategoria suman lo mismo que esos tres turnos.
    const porDia = entregas.porDia.map(dia => {
        const delDia = lecturasDelDia(lecturas, dia.date);
        const porPlatoDelDia = {};
        for (const categoria of categorias) {
            porPlatoDelDia[categoria] = delDia.reduce(
                (suma, lectura) => suma + contarDeLaCategoria(lectura.demorasEntrega, categoria), 0);
        }
        return {
            ...dia,
            porPlato: porPlatoDelDia,
            sinCategoria: delDia.reduce((suma, lectura) => suma + sinCategoriaEn(lectura), 0),
        };
    });

    return {
        entregas: entregas.turnos,
        servicios,
        porPlato,
        // porPlato más sinCategoria suman `entregas`, igual que porDia.
        sinCategoria,
        porDia,
        // BT11 del libro: total de demoras en entrega sobre procesos evaluados.
        porcentaje: porcentaje(entregas.turnos.total, procesosTotales),
    };
}

/**
 * Devoluciones.
 *
 * Salen de las páginas de novedad, agrupadas por tipo de alerta. El libro de
 * Excel las trae en la misma tabla que las entregas: dos filas fijas (plato y
 * pedido) y un total. Las otras cuatro categorías del catálogo solo se dibujan
 * si esa semana hubo alguna, para no llenar la hoja de ceros que el reporte
 * manual no tiene.
 *
 * El gráfico de la última hoja dibuja todas las devoluciones, no solo las de
 * plato como el libro de Excel: así sus barras suman la fila "Cantidad total
 * de devoluciones" de la tabla.
 */
// 📥 Recibe:   lecturas de Doral, dias, 1566
// 📤 Devuelve: { porTipo: [{ tipo: 'plato', etiqueta: 'Devoluciones de plato', day: 30, night: 12, all: 0, total: 42, visible: true }, …], total: { day: 33, night: 13, all: 0, total: 46 }, porcentaje: 2.9, porDia: […] }
function calcularDevoluciones(lecturas, dias, procesosTotales) {
    const porTipo = TIPOS_DEVOLUCION.map(({ tipo, etiqueta, siempre }) => {
        const turnos = serieSemanal(lecturas, dias, lectura => lectura.devoluciones?.[tipo] || 0).turnos;
        return { tipo, etiqueta, ...turnos, visible: siempre === true || turnos.total > 0 };
    });

    const todas = serieSemanal(lecturas, dias, lectura => sumar(Object.values(lectura.devoluciones || {})));

    return {
        porTipo,
        total: todas.turnos,
        // BT9 del libro: total de devoluciones sobre procesos evaluados.
        porcentaje: porcentaje(todas.turnos.total, procesosTotales),
        porDia: todas.porDia,
    };
}

/** Qué sumó la configuración de semanales en toda la semana, por grupo. */
// 📥 Recibe:   [{ alertasExtra: { firstAttention: 2, cleaning: 0, preparation: 1, returns: 0 } }, {}]
// 📤 Devuelve: { firstAttention: 2, cleaning: 0, preparation: 1, returns: 0 }
function contarAlertasSemanales(lecturas) {

    const contadas = Object.fromEntries(GRUPOS_SEMANALES.map(grupo => [grupo, 0]));
    for (const lectura of lecturas) {
        for (const grupo of GRUPOS_SEMANALES) contadas[grupo] += lectura.alertasExtra?.[grupo] || 0;
    }
    return contadas;
}

/**
 * Qué filas y páginas tienen sentido para este establecimiento.
 *
 * El reporte real omite lo que el local no evalúa: Hialeah, Kendall y Wynwood
 * salen sin primera atención y sin barra.
 *
 * requireBarTable y typeOfManagerToTableApproachEvaluation vienen del
 * DocumentConfig. Son la fuente correcta: mirar si el total es cero falla en
 * una semana floja, donde el local sí evalúa pero no hubo ni un caso.
 *
 * El cuadro general del reporte real conserva filas en cero: Bocas muestra
 * "Clientes sin ser ubicados por el host  0  0  0". Pero Hialeah, Kendall y
 * Wynwood salen con un cuadro reducido, sin esa fila ni la de primera
 * atención. Lo que los separa es el tipo de resumen: el clásico trae el
 * cuadro completo, y los otros solo lo que miden. Es una hipótesis razonable,
 * no algo que el modelo declare; si algún local clásico no debiera traer
 * alguna fila, se ajusta aquí.
 */
// 📥 Recibe:   { config, cuadroGeneral, lecturas, metrica, entregasYServicios, devoluciones, toques } de Bocas
// 📤 Devuelve: { barra: false, clientesSinUbicar: true, demora1ra: true, demoraLimpieza: true, metrica: true, entregas: false, servicios: false, devoluciones: false, toques: true, toquesSeparados: true, preShift: false, perimetro: false }
function decidirQueAplica({ config, cuadroGeneral, lecturas, metrica, entregasYServicios, devoluciones, toques }) {
    const resumenClasico = !config || config.typePageSumary === 'classic';

    return {
        barra: config
            ? config.requireBarTable === true
            : cuadroGeneral.rotacionesBarra.total > 0,
        clientesSinUbicar: resumenClasico || cuadroGeneral.clientesSinUbicar.total > 0,
        demora1ra: resumenClasico || cuadroGeneral.demora1ra.total > 0,
        demoraLimpieza: cuadroGeneral.demoraLimpieza.total > 0
            || lecturas.some(lectura => lectura.promedioLimpieza && lectura.promedioLimpieza !== 'N/A'),
        metrica: metrica.procesosTotales > 0,
        // Separadas: las demoras de servicio llevan fila en la tabla, pero no
        // tienen gráfico, y con solo ellas el de entregas salía todo en cero.
        entregas: entregasYServicios.entregas.total > 0,
        servicios: entregasYServicios.servicios.total > 0,
        devoluciones: devoluciones.total.total > 0,
        // Las hojas de toques de gerente salen salvo que la configuración de
        // semanales las oculte (weeklyHideManagerTouches). Los datos siguen
        // en `toques`; solo dejan de dibujarse.
        toques: config?.weeklyHideManagerTouches !== true,
        // 'single' evalúa los toques como una cantidad total; 'complete' los
        // separa en primeros y otros, que es lo que el gráfico dibuja.
        toquesSeparados: config
            ? config.typeOfManagerToTableApproachEvaluation !== 'single'
            : toques.some(bloque => !bloque.soloTotal),
        preShift: config?.requirePageMeetingPreShift === true,
        perimetro: config?.perimeterActivated === true,
    };
}

/**
 * Avisos honestos sobre la calidad del dato.
 * Viajan en `report.avisos`, pero ya no se dibujan: la hoja de notas se quitó
 * del PDF. El orden de los avisos es el de este código.
 */
// 📥 Recibe:   { semana, toques, categorias, hayAlertasSemanales, alertasContadas, barraIgnorada, entregasYServicios, devoluciones }
// 📤 Devuelve: ['El promedio de toques de mesoneros no se agrega: …', 'Los toques van como en el libro de Excel: …', …]
function redactarAvisos({
    semana, toques, categorias, hayAlertasSemanales, alertasContadas,
    barraIgnorada, entregasYServicios, devoluciones,
}) {
    const avisos = [];

    // Los documentos que el calendario no pudo anclar, con su motivo.
    for (const sobrante of semana.sobrantes) {
        avisos.push(`Documento del ${sobrante.document?.date} descartado: ${sobrante.motivo}.`);
    }
    const { esperados, faltantes } = semana.cobertura;
    if (faltantes.length) {
        // `esperados` es un número (cobertura.esperados), no una lista.
        avisos.push(`Faltan ${faltantes.length} de ${esperados} turnos de la semana.`);
    }
    avisos.push(
        'El promedio de toques de mesoneros no se agrega: la página de resumen lo guarda con valores aleatorios.'
    );
    if (toques.length) {
        avisos.push(
            'Los toques van como en el libro de Excel: primeros toques sobre las rotaciones del turno, otros toques sobre los primeros, y los promedios diario y semanal sin contar los turnos ni los días en cero o en N/A. Por eso "otros toques" puede pasar del 100 %.'
        );
    }
    if (!categorias.length) {
        avisos.push('El establecimiento no tiene categorías de plato configuradas; la tabla de métrica sale vacía.');
    }
    if (hayAlertasSemanales) {
        avisos.push(
            `Configuración de semanales: además de las alertas base se sumaron ${alertasContadas.firstAttention} ocurrencias a primera atención, ${alertasContadas.cleaning} a limpieza, ${alertasContadas.preparation} a preparación y ${alertasContadas.returns} a devoluciones.`
        );
    }
    if (barraIgnorada > 0) {
        avisos.push(
            `Se dejaron fuera ${barraIgnorada} rotaciones de barra: el establecimiento no evalúa barra, así que no cuentan en el cuadro, en los gráficos ni en los porcentajes.`
        );
    }
    if (entregasYServicios.sinCategoria.total > 0) {
        avisos.push(
            `Hay ${entregasYServicios.sinCategoria.total} demoras en entrega de una categoría que el establecimiento no tiene configurada; van en su propia fila para que la tabla sume el total.`
        );
    }
    if (devoluciones.total.total > 0 || entregasYServicios.entregas.total > 0) {
        avisos.push(
            'El porcentaje de devolución y el de demora en entrega se calculan sobre los procesos evaluados, igual que en el libro de Excel.'
        );
    }
    // "Otra" junta dos casos: un nombre que habla de devolución sin decir de
    // qué, y una alerta añadida a mano en la configuración cuyo nombre no
    // encaja en ningún tipo.
    const sinTipo = devoluciones.porTipo.find(fila => fila.tipo === 'otra' && fila.total > 0);
    if (sinTipo) {
        avisos.push(
            `Hay ${sinTipo.total} devoluciones que no encajan en ningún tipo; salen en "Otras devoluciones" en lugar de sumarse a una fila que no les toca.`
        );
    }
    avisos.push(
        'La desviación de tiempo en preparación tampoco aparece: el reporte diario solo guarda el promedio y la cantidad de procesos por categoría.'
    );

    return avisos;
}


/* ─────────────────────────── Punto de entrada ─────────────────────────── */

/**
 * La lectura de un local que no evalúa barra: la barra pasa a cero y toda la
 * primera atención cuenta como salón.
 */
// 📥 Recibe:   { rotacionesSalon: 40, rotacionesBarra: 6, rotaciones: 46, demora1ra: 3, demora1raSalon: 2, demora1raBarra: 1 }
// 📤 Devuelve: { rotacionesSalon: 40, rotacionesBarra: 0, rotaciones: 40, demora1ra: 3, demora1raSalon: 3, demora1raBarra: 0 }
const quitarBarra = lectura => ({
    ...lectura,
    rotacionesBarra: 0,
    rotaciones: lectura.rotacionesSalon,
    demora1raSalon: lectura.demora1ra,
    demora1raBarra: 0,
});

/**
 * Construye el reporte semanal. Es el paso 7 del flujo de
 * app/routes/weekly_document/index.jsx.
 *
 * @param {object}   input
 * @param {object[]} input.documents      documentos diarios con `pages` poblado
 * @param {object}   input.establishment  el local, con config_report y las categorías de plato
 * @param {string}   input.from           un día de la semana, 'YYYY-MM-DD'; el calendario la alinea al lunes
 * @param {object[]} [input.detalle]      diagnóstico por turno de getDocumentsForWeek
 * @param {Date}     [input.today]        para probar sin depender del reloj
 * @param {boolean}  [input.dualShift]    fuerza dos turnos al día; si falta lo decide config_report.numberOfReports
 */
// 📥 Recibe:   { documents: [14 documentos de Bocas], establishment: { name: 'Bocas Grill Doral', config_report: {…} }, from: '2026-08-24' }
// 📤 Devuelve: { meta: {…}, cobertura: { esperados: 14, encontrados: 14, faltantes: [], completa: true }, aplica: {…}, cuadroGeneral: {…}, porDia: […], toques: […], metrica: {…}, …, avisos: […] }
export function buildWeeklyReport({ documents = [], establishment = null, from, detalle = [], today = null, dualShift }) {

    // 7.1 · ⚙️ La configuración del local manda: numberOfReports decide los turnos,
    // requireBarTable y typeOfManagerToTableApproachEvaluation qué se evalúa.
    // Solo se cae a la heurística cuando no llega configuración.
    const config = establishment?.config_report || null;
    const esDual = dualShift !== undefined
        ? dualShift
        : config?.numberOfReports !== 'single-diary';
    const configDeTurnos = config || { numberOfReports: esDual ? 'dual-diary' : 'single-diary' };

    // 7.2 · 📅 El calendario ancla cada documento en su día y su turno, y de paso
    // dice qué se esperaba, qué llegó y qué falta.
    const semana = buildWeekCalendar({ from, config: configDeTurnos, documents, detalle, today });
    const dias = semana.calendario.map(dia => ({ date: dia.date, weekday: dia.weekday }));
    const categorias = dishesOf(establishment);

    // 7.3 · 📖 Lee cada documento aceptado por el calendario; los sobrantes
    // quedan fuera con su motivo, en vez de descartarse en silencio. La
    // configuración de semanales suma alertas del catálogo a cada conteo.
    const alertasSemanales = normalizaWeeklyAlerts(config?.weeklyAlerts);
    const hayAlertasSemanales = GRUPOS_SEMANALES.some(grupo => alertasSemanales[grupo].size > 0);
    const lecturasConBarra = semana.documentos
        .map(documento => readDailyDocument(documento, hayAlertasSemanales ? alertasSemanales : null))
        .filter(lectura => lectura.date);

    // 7.4 · 🍸 La barra solo cuenta si el local la evalúa, igual que en el diario:
    // sin requireBarTable el resumen no enseña la fila de barra y arrNovelty
    // cuenta todas las demoras de primera atención como de mesa. Si aun así
    // llegan rotaciones de barra, se dejan fuera de todo —cuadro, gráficos y
    // porcentajes— y se avisa. Sin configuración se mira el dato.
    const evaluaBarra = config ? config.requireBarTable === true : true;
    const barraIgnorada = evaluaBarra ? 0 : sumaDe(lecturasConBarra, 'rotacionesBarra');
    const lecturas = evaluaBarra ? lecturasConBarra : lecturasConBarra.map(quitarBarra);

    // 7.5 · 🧮 Cada sección del reporte sale de las mismas lecturas.
    const cuadroGeneral = calcularCuadroGeneral(lecturas);
    const toques = calcularToques(lecturas, dias);
    const metrica = calcularMetrica(lecturas, categorias);
    const entregasYServicios = calcularEntregasYServicios(lecturas, dias, categorias, metrica.procesosTotales);
    const devoluciones = calcularDevoluciones(lecturas, dias, metrica.procesosTotales);
    const alertasContadas = contarAlertasSemanales(lecturas);
    // 7.6 · 📦 El reporte que dibuja WeeklyPages.jsx. Sus hojas no hacen cuentas.
    return {
        meta: {
            establishmentName: lecturas[0]?.establishmentName || establishment?.name || null,
            franchiseName: documents[0]?.franchiseName || null,
            from: dias[0]?.date || null,
            to: dias[6]?.date || null,
            dishes: categorias,
            dualShift: esDual,
            modo: esDual ? 'dual' : 'single',
            turnos: shiftsOf(configDeTurnos),
            documentosUsados: lecturas.length,
        },
        cobertura: {
            esperados: semana.cobertura.esperados,
            encontrados: semana.cobertura.encontrados,
            faltantes: semana.cobertura.faltantes,
            completa: semana.cobertura.completa,
        },
        // El calendario completo: un objeto por día con sus turnos anclados.
        semana: semana.calendario,
        aplica: decidirQueAplica({ config, cuadroGeneral, lecturas, metrica, entregasYServicios, devoluciones, toques }),
        cuadroGeneral,
        porDia: calcularSeriePorDia(lecturas, dias),
        toques,
        metrica,
        demorasPorDia: calcularDemorasPorDia(lecturas, dias, categorias),
        procesosPorDia: calcularProcesosPorDia(lecturas, dias, categorias),
        entregasYServicios,
        // Umbrales con los que el reporte diario decide qué es una demora.
        umbrales: config ? {
            primeraAtencion: config.time1Attention || null,
            limpieza: config.timeDelayClean || null,
            servicios: config.timeServices || null,
        } : null,
        devoluciones,
        // Qué sumó la configuración de semanales, para poder auditarlo.
        configuracionSemanal: { activa: hayAlertasSemanales, contadas: alertasContadas },
        incidencias: sumaDe(lecturas, 'incidencias'),
        // Los nombres de alerta que aparecieron esa semana. Sirven para afinar
        // el reconocimiento cuando una alerta no se identifica: si "clientes
        // sin ubicar" sale en cero pero el nombre está en esta lista, basta con
        // añadirlo a esAlertaSinUbicar.
        alertasVistas: [...new Set(lecturas.flatMap(lectura => lectura.alertasVistas || []))].sort(),
        avisos: redactarAvisos({
            semana, toques, categorias, hayAlertasSemanales, alertasContadas,
            barraIgnorada, entregasYServicios, devoluciones,
        }),
    };
}


export default buildWeeklyReport;
