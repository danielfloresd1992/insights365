import {
    parseISO, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    eachDayOfInterval, addDays, isSameDay, isAfter, startOfDay, getDay,
} from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Calendario de reportes.
 *
 * Construye un arreglo con un objeto por día —fecha, día de la semana y los
 * turnos que ese establecimiento debe entregar— y ancla en él los reportes
 * diarios que existan. El resultado dice de forma explícita qué se esperaba,
 * qué llegó y qué falta, sin que nadie tenga que deducirlo contando.
 *
 * ── El modelo real, tomado de api_jarvis365 ──
 *
 * DocumentConfig.numberOfReports es un enum de dos valores y manda sobre todo
 * lo demás:
 *
 *   'single-diary'  un reporte al día.   El documento lleva shift: 'all'
 *                                        y config.time es una cadena, "12:00".
 *   'dual-diary'    dos reportes al día. Los documentos llevan shift 'day' y
 *                                        'night', y config.time es un objeto
 *                                        { day: "11:00", night: "18:00" }.
 *
 * Document.type es enum ['complete-shift', 'resume-shift']: no admite un tipo
 * semanal, y por eso el reporte semanal no crea documento.
 *
 * Las fechas se manejan con date-fns en hora local y SIEMPRE a partir de
 * 'YYYY-MM-DD'. parseISO devuelve la medianoche local de ese día, así que la
 * ida y vuelta con format(d, 'yyyy-MM-dd') es estable y una fecha nunca se
 * corre de día por el huso horario.
 */


/* ─────────────────────────── Turnos ─────────────────────────── */

/** Los turnos que un establecimiento entrega según su configuración. */
export function shiftsOf(config) {
    return config?.numberOfReports === 'single-diary' ? ['all'] : ['day', 'night'];
}

export const SHIFT_ES = { day: 'Diurno', night: 'Nocturno', all: 'Único' };

/**
 * La hora configurada de un turno.
 * En single-diary `time` es una cadena; en dual-diary un objeto por turno.
 */
export function shiftTime(config, shift) {
    const t = config?.time;
    if (t === null || t === undefined) return null;
    if (typeof t === 'string') return shift === 'all' ? t : null;
    return t?.[shift] ?? null;
}


/* ─────────────────────────── Rangos ─────────────────────────── */

const iso = d => format(d, 'yyyy-MM-dd');

/** date-fns da el día en minúscula; los reportes lo escriben con mayúscula. */
const capitaliza = t => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

/** Rango de la semana (lunes a domingo) que contiene la fecha dada. */
export function weekRange(dateStr) {
    const d = parseISO(dateStr);
    const start = startOfWeek(d, { weekStartsOn: 1 });
    return { start, end: endOfWeek(d, { weekStartsOn: 1 }), from: iso(start) };
}

/** Rango del mes que contiene la fecha dada. */
export function monthRange(dateStr) {
    const d = parseISO(dateStr);
    const start = startOfMonth(d);
    return { start, end: endOfMonth(d), from: iso(start) };
}


/* ─────────────────────────── Calendario ─────────────────────────── */

/**
 * Esqueleto del calendario: un objeto por día, con sus turnos vacíos.
 *
 * @param {object} input
 * @param {string} input.from    primer día, 'YYYY-MM-DD'
 * @param {string} [input.to]    último día; si falta se toma la semana de `from`
 * @param {object} input.config  DocumentConfig del establecimiento
 * @param {Date}   [input.today] para poder probar sin depender del reloj
 */
export function buildCalendar({ from, to, config, today = null }) {
    const start = parseISO(from);
    const end = to ? parseISO(to) : addDays(startOfWeek(start, { weekStartsOn: 1 }), 6);
    const shifts = shiftsOf(config);
    const hoy = today ? startOfDay(today) : null;

    return eachDayOfInterval({ start, end }).map(d => {
        const futuro = hoy ? isAfter(startOfDay(d), hoy) : false;

        const turnos = {};
        for (const shift of shifts) {
            turnos[shift] = {
                shift,
                shiftEs: SHIFT_ES[shift],
                horaConfig: shiftTime(config, shift),
                esperado: !futuro,
                estado: futuro ? 'futuro' : 'ausente',
                documentId: null,
                document: null,
                motivo: null,
            };
        }

        return {
            date: iso(d),
            weekday: capitaliza(format(d, 'EEEE', { locale: es })),
            weekdayCorto: capitaliza(format(d, 'EEE', { locale: es })),
            weekdayIndex: getDay(d),          // 0 domingo … 6 sábado
            etiqueta: format(d, "d 'de' MMMM", { locale: es }),
            etiquetaCorta: format(d, 'dd MMM', { locale: es }),
            esHoy: hoy ? isSameDay(d, hoy) : false,
            esFuturo: futuro,

            modo: config?.numberOfReports === 'single-diary' ? 'single' : 'dual',
            turnosEsperados: futuro ? 0 : shifts.length,
            turnos,

            encontrados: 0,
            completo: futuro,
        };
    });
}


/**
 * Ancla los documentos diarios en el calendario.
 *
 * Cada documento se coloca en su día y su turno. Los que caen fuera del rango,
 * o traen un turno que el establecimiento no entrega, se apartan en `sobrantes`
 * en lugar de descartarse en silencio.
 *
 * @param {object[]} calendario  salida de buildCalendar
 * @param {object[]} documents   documentos diarios, con date y shift
 * @param {object[]} [detalle]   diagnóstico por turno de la traída de datos
 */
export function anchorDocuments(calendario, documents = [], detalle = []) {
    const porFecha = new Map(calendario.map(d => [d.date, d]));
    const sobrantes = [];

    for (const doc of documents) {
        const fecha = typeof doc?.date === 'string' ? doc.date.slice(0, 10) : null;
        const dia = fecha ? porFecha.get(fecha) : null;

        if (!dia) {
            sobrantes.push({ document: doc, motivo: 'fecha fuera del rango' });
            continue;
        }

        const shift = doc?.shift || 'all';
        const casilla = dia.turnos[shift];

        if (!casilla) {
            sobrantes.push({
                document: doc,
                motivo: `turno '${shift}' no previsto en un establecimiento ${dia.modo}`,
            });
            continue;
        }

        if (casilla.document) {
            sobrantes.push({ document: doc, motivo: 'turno duplicado' });
            continue;
        }

        casilla.document = doc;
        casilla.documentId = doc?._id || null;
        casilla.estado = 'presente';
    }

    // El diagnóstico de la traída distingue "no existe" de "falló la API"
    for (const d of detalle) {
        const dia = porFecha.get(d.date);
        const casilla = dia?.turnos?.[d.shift];
        if (!casilla || casilla.estado === 'presente') continue;
        if (d.estado === 'error') { casilla.estado = 'error'; casilla.motivo = d.motivo; }
        else if (d.estado === 'sin-paginas') casilla.estado = 'sin-paginas';
    }

    for (const dia of calendario) {
        const casillas = Object.values(dia.turnos);
        dia.encontrados = casillas.filter(c => c.estado === 'presente').length;
        dia.completo = casillas.every(c => c.estado === 'presente' || c.estado === 'futuro');
    }

    return { calendario, sobrantes };
}


/**
 * Atajo: calendario de la semana con los documentos ya anclados, más un
 * resumen de cobertura listo para mostrar.
 */
export function buildWeekCalendar({ from, config, documents = [], detalle = [], today = null }) {
    const { from: lunes } = weekRange(from);
    const calendario = buildCalendar({ from: lunes, config, today });
    const { sobrantes } = anchorDocuments(calendario, documents, detalle);

    const casillas = calendario.flatMap(d => Object.values(d.turnos));
    const esperados = casillas.filter(c => c.esperado);
    const presentes = esperados.filter(c => c.estado === 'presente');

    return {
        from: lunes,
        to: calendario[calendario.length - 1]?.date || null,
        modo: calendario[0]?.modo || 'dual',
        calendario,
        sobrantes,
        cobertura: {
            esperados: esperados.length,
            encontrados: presentes.length,
            completa: esperados.length > 0 && presentes.length === esperados.length,
            faltantes: esperados
                .filter(c => c.estado !== 'presente')
                .map(c => {
                    const dia = calendario.find(d => Object.values(d.turnos).includes(c));
                    return { date: dia.date, weekday: dia.weekday, shift: c.shift, estado: c.estado, motivo: c.motivo };
                }),
        },
        /** Los documentos anclados, en orden de fecha y turno. */
        documentos: calendario.flatMap(d =>
            Object.values(d.turnos).filter(c => c.document).map(c => c.document)),
    };
}


export default buildWeekCalendar;
