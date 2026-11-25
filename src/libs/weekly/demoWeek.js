/**
 * Semana de muestra: Bocas Grill Doral, del 24 al 30 de agosto de 2026.
 *
 * Reconstruye los documentos diarios que habrían producido el reporte semanal
 * que hoy se emite a mano. Las cifras están leídas del PDF real, página por
 * página, y sirven para dos cosas:
 *
 *   1. La prueba de oro (weeklyMetrics.bocas.test.mjs) comprueba que el
 *      agregador reproduce ese PDF cifra por cifra.
 *   2. La vista previa de /weekly_document?demo=bocas dibuja el reporte sin
 *      tocar la API, para poder revisar el diseño de las páginas.
 *
 * Un solo sitio para los datos: si el fixture cambia, cambian las dos.
 */


/* ── Cifras leídas del PDF, día a día ── */

// Pág. 3, "Cantidad de rotaciones evaluadas"
export const ROT_DIA = [57, 42, 37, 44, 46, 46, 42];
export const ROT_NOC = [11, 12, 25, 19, 24, 26, 24];

// Pág. 4, "Cantidad de mesas con demora en ser atendida"
export const AT_DIA = [0, 0, 0, 0, 0, 0, 3];
export const AT_NOC = [1, 0, 0, 0, 0, 0, 1];

// Pág. 6, "Cantidad de mesas con demora en ser limpiada"
export const LI_DIA = [1, 0, 0, 0, 0, 0, 0];
export const LI_NOC = [2, 0, 0, 0, 0, 0, 2];

// Pág. 12, "Cantidad de procesos evaluados"
export const PROC_DIA = [57, 42, 37, 44, 46, 46, 40];
export const PROC_NOC = [11, 12, 25, 19, 24, 26, 21];

// Pág. 13, "Cantidad de demoras por día" (las barras suman los dos turnos)
export const DEM_LUNCH = [9, 1, 6, 3, 10, 0, 0];   // 29 en total
export const DEM_PLATO = [7, 1, 8, 2, 0, 10, 6];   // 34 en total

// Pág. 15, "Cantidad de demoras por turno" — de aquí sale el reparto
export const DEM_NOC = [1, 0, 2, 1, 0, 2, 2];      // 8, todas de plato fuerte
export const DEM_PLATO_DIA = DEM_PLATO.map((v, i) => v - DEM_NOC[i]);  // 26

// Reparto de procesos por categoría que cuadra con los totales de la pág. 11:
// Lunch solo de día (106), plato fuerte 206 de día y 138 de noche.
export const TK_LUNCH_DIA = [19, 14, 12, 15, 15, 16, 15];
export const TK_PLATO_DIA = PROC_DIA.map((v, i) => v - TK_LUNCH_DIA[i]);
export const TK_PLATO_NOC = PROC_NOC;

export const DEMO_FROM = '2026-08-24';

/** El establecimiento tal y como lo devuelve la API, con su DocumentConfig. */
export const DEMO_ESTABLISHMENT = {
    name: 'Bocas Grill Doral',
    dishes: [{ nameDishe: 'Lunch' }, { nameDishe: 'Plato fuerte' }],
    config_report: {
        // Resumen clásico: el cuadro general trae todas sus filas, incluidas
        // las que quedan en cero, como se ve en el PDF emitido.
        typePageSumary: 'classic',
        numberOfReports: 'dual-diary',
        time: { day: '11:00', night: '18:00' },
        requireBarTable: false,
        typeOfManagerToTableApproachEvaluation: 'complete',
        requirePageMeetingPreShift: false,
        perimeterActivated: false,
        time1Attention: '00:05:00',
        timeDelayClean: '00:07:00',
    },
};


/* ── Reconstrucción de los documentos diarios ── */

const filaDemora = nameDish => ({
    table: '1',
    nameDish,
    timePeriod: {
        tomaOrden: '18:00:00', listoTablet: '18:14:00',
        listoCocina: '00:00:00', EntregaPLato: '00:00:00', timeTotal: null,
    },
});

const filaSimple = () => ({ table: '1', timePeriod: { init: '19:00:00', end: '19:06:00' } });

function documento({ date, shift, rot, at, li, tickets, demoras, toques }) {
    return {
        _id: `demo-${date}-${shift}`,
        date,
        shift,
        type: 'complete-shift',
        establishmentName: 'Bocas Grill Doral',
        franchiseName: 'Bocas',
        pages: [
            {
                type: 'summary',
                data: {
                    totalOfOccupiedTables: String(rot),
                    totalOfOccupiedTablesBar: { bodyForTable: [] },
                    countTotalUsePhone: '0',
                    averageTimeToFirstResponse: '00:05:00',
                    averageTimeToCleartTable: '00:07:00',
                    averageTimeToReceiveTheMainCourse: '00:12:00',
                    touch: toques.map(t => ({
                        name: t.name,
                        result: { firt: { value: t.primeros }, second: { value: t.otros } },
                    })),
                },
            },
            { type: 'delay1ra', data: { body: Array.from({ length: at }, filaSimple) } },
            { type: 'delayClear', data: { body: Array.from({ length: li }, filaSimple) } },
            {
                type: 'delayToastPostAndServise',
                data: {
                    delayToastPost: {
                        delay: Object.entries(demoras)
                            .flatMap(([plato, n]) => Array.from({ length: n }, () => filaDemora(plato))),
                        categoryMetrics: Object.fromEntries(
                            Object.entries(tickets).map(([plato, n]) => [plato, {
                                totalTickets: n,
                                avgPreparation: plato === 'Lunch'
                                    ? '00:10:53'
                                    : (shift === 'day' ? '00:12:09' : '00:12:23'),
                            }])
                        ),
                    },
                    delayDeliveryDishWhenItIsReadyInKitchen: { delay: [], categoryMetrics: {} },
                    delayServices: { delay: [], categoryMetrics: {} },
                },
            },
        ],
    };
}


/** Los catorce documentos de la semana, siete días por dos turnos. */
export function demoDocuments(dias) {
    const documents = [];
    dias.forEach((date, i) => {
        documents.push(documento({
            date, shift: 'day',
            rot: ROT_DIA[i], at: AT_DIA[i], li: LI_DIA[i],
            tickets: { Lunch: TK_LUNCH_DIA[i], 'Plato fuerte': TK_PLATO_DIA[i] },
            demoras: { Lunch: DEM_LUNCH[i], 'Plato fuerte': DEM_PLATO_DIA[i] },
            toques: [{ name: 'Gerente Johana', primeros: 12, otros: 14 }],
        }));
        documents.push(documento({
            date, shift: 'night',
            rot: ROT_NOC[i], at: AT_NOC[i], li: LI_NOC[i],
            tickets: { Lunch: 0, 'Plato fuerte': TK_PLATO_NOC[i] },
            demoras: { 'Plato fuerte': DEM_NOC[i] },
            toques: [{ name: 'Asistente Desiree Agüero', primeros: 6, otros: 5 }],
        }));
    });
    return documents;
}


/* ── Semana de Francisca Doral: la que tiene devoluciones ──
   Bocas no tuvo ninguna esa semana, así que para probar las dos últimas hojas
   hace falta un segundo caso. Las cifras salen del PDF emitido "Reporte
   Semanal Francisca Doral - Del 08-24-2026 - Al 08-30-2026":

     Devoluciones de plato            30   12   42
     Devoluciones de pedido            3    1    4
     Cantidad total de devoluciones   33   13   46
     Porcentaje de devolución                2.9%
     Procesos evaluados             1047  519  1566

   El libro lo calcula en 'Base de datos'!BT9 = BV8/BL2: total de devoluciones
   entre procesos evaluados. El reparto por día es nuestro —el PDF solo dibuja
   el gráfico, sin cifras—; los totales y el porcentaje son los del reporte. */

export const DORAL_PLATO_DIA = [4, 4, 3, 5, 5, 3, 6];    // 30
export const DORAL_PLATO_NOC = [0, 1, 0, 3, 2, 5, 1];    // 12
export const DORAL_PEDIDO_DIA = [1, 0, 0, 1, 0, 1, 0];   // 3
export const DORAL_PEDIDO_NOC = [0, 0, 0, 0, 1, 0, 0];   // 1
export const DORAL_TICKETS_DIA = [150, 150, 150, 150, 150, 150, 147];  // 1047
export const DORAL_TICKETS_NOC = [74, 74, 74, 74, 74, 74, 75];         // 519

export const DORAL_FROM = '2026-08-24';

export const DORAL_ESTABLISHMENT = {
    name: 'Francisca Doral',
    dishes: [{ nameDishe: 'Plato fuerte' }],
    config_report: {
        typePageSumary: 'classic',
        numberOfReports: 'dual-diary',
        time: { day: '11:00', night: '18:00' },
        requireBarTable: false,
        typeOfManagerToTableApproachEvaluation: 'complete',
    },
};

/** Una página de novedad con `n` devoluciones de ese nombre de alerta. */
const paginaDevolucion = (es, n) => ({
    type: 'blocked&novelty',
    data: { menuRef: { es, category: 'food' }, body: Array.from({ length: n }, () => ({})) },
});

const docDoral = (date, shift, i) => ({
    _id: `doral-${date}-${shift}`,
    date,
    shift,
    type: 'complete-shift',
    establishmentName: 'Francisca Doral',
    franchiseName: 'La Francisca',
    pages: [
        { type: 'summary', data: { totalOfOccupiedTables: '100', touch: [] } },
        {
            type: 'delayToastPostAndServise',
            data: {
                delayToastPost: {
                    delay: [],
                    categoryMetrics: {
                        'Plato fuerte': {
                            totalTickets: shift === 'day' ? DORAL_TICKETS_DIA[i] : DORAL_TICKETS_NOC[i],
                            avgPreparation: shift === 'day' ? '00:08:54' : '00:09:18',
                        },
                    },
                },
                delayDeliveryDishWhenItIsReadyInKitchen: { delay: [], categoryMetrics: {} },
                delayServices: { delay: [], categoryMetrics: {} },
            },
        },
        // El catálogo escribe "plato" en minúscula y "Pedido" en mayúscula.
        paginaDevolucion('posible devolución de plato',
            shift === 'day' ? DORAL_PLATO_DIA[i] : DORAL_PLATO_NOC[i]),
        paginaDevolucion('Posible devolución de pedido',
            shift === 'day' ? DORAL_PEDIDO_DIA[i] : DORAL_PEDIDO_NOC[i]),
    ],
});

/** Los catorce documentos de la semana de Doral. */
export function doralDocuments(dias) {
    return dias.flatMap((date, i) => [docDoral(date, 'day', i), docDoral(date, 'night', i)]);
}
