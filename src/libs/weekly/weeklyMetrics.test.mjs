/**
 * Pruebas del agregador semanal.
 *
 * Se ejecuta con:  npm run test:weekly
 *
 * Usa datos sinteticos con la forma real de las paginas guardadas, asi que
 * corre sin API y sin base de datos. Cuando tengas una semana real, cambia
 * el fixture por los documentos descargados y contrasta contra el PDF ya
 * emitido de esa misma semana.
 */

import {
  buildWeeklyReport, hmsToSeconds, secondsToHms, averageHms,
  weightedAverageHms, weekdayOf, buildWeekDays, readDailyDocument, dishesOf, esAlertaSinUbicar,
  tipoDeDevolucion, promedioSinVacios, esTakeOut,
} from './weeklyMetrics.js';
import {
  DORAL_FROM, DORAL_ESTABLISHMENT, doralDocuments,
  DORAL_PLATO_DIA, DORAL_PLATO_NOC, DORAL_PEDIDO_DIA, DORAL_PEDIDO_NOC,
  DEMO_FROM, DEMO_ESTABLISHMENT, demoDocuments,
} from './demoWeek.js';

let pass = 0, fail = 0;
const eq = (got, want, name) => {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FALLO ' + name + '\n        esperaba ' + b + '\n        obtuvo   ' + a); }
};

console.log('── Tiempo ──');
eq(hmsToSeconds('00:10:53'), 653, 'hms a segundos');
eq(hmsToSeconds('N/A'), null, 'N/A no es cero');
eq(hmsToSeconds(''), null, 'vacio no es cero');
eq(secondsToHms(653), '00:10:53', 'segundos a hms');
eq(secondsToHms(null), 'N/A', 'nulo sale N/A');
eq(averageHms(['00:10:00', '00:20:00']), '00:15:00', 'promedio simple');
eq(averageHms(['00:10:00', 'N/A']), '00:10:00', 'N/A se descarta, no arrastra');
eq(averageHms(['N/A']), 'N/A', 'todo invalido sale N/A');
// 10 min con peso 100 y 20 min con peso 300 => 17:30
eq(weightedAverageHms([['00:10:00', 100], ['00:20:00', 300]]), '00:17:30', 'promedio ponderado');

console.log('── Fechas ──');
eq(weekdayOf('2026-08-24'), 'Lunes', 'lunes 24 ago 2026');
eq(weekdayOf('2026-08-30'), 'Domingo', 'domingo 30 ago 2026');
eq(buildWeekDays('2026-08-24').map(d => d.weekday),
  ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'], 'semana lunes a domingo');
eq(buildWeekDays('2026-08-24')[6].date, '2026-08-30', 'la semana cierra el domingo');

console.log('── Categorias de plato ──');
eq(dishesOf({ dishes: [{ nameDishe: 'Lunch' }, { nameDishe: 'Plato fuerte' }] }), ['Lunch', 'Plato fuerte'], 'desde dishes');
eq(dishesOf({ dishMenu: { appetize: 'Entrada', mainDish: 'Plato fuerte', dessert: 'Postre' } }),
  ['Entrada', 'Plato fuerte', 'Postre'], 'desde dishMenu');

/* ── Fixture con la forma real de las paginas ── */

// Primera atencion y limpieza: {init, end}
const T = (init, end) => ({ table: '1', timePeriod: { init, end } });

// Toast POS, entrega y servicio: otra forma distinta, y con nameDish
const TP = (nameDish, tomaOrden, listoTablet) => ({
  table: '1', nameDish,
  timePeriod: { tomaOrden, listoTablet, listoCocina: '00:00:00', EntregaPLato: '00:00:00', timeTotal: null },
});
const TP_VACIO = nameDish => ({
  table: '0', nameDish,
  timePeriod: { tomaOrden: '00:00:00', listoTablet: '00:00:00', listoCocina: '00:00:00', EntregaPLato: '00:00:00', timeTotal: null },
});

function makeDoc({ date, shift, rotSalon, rotBar = 0, sinUbicar = 0, at = 0, li = 0, toques = [], tickets = {}, demorasPrep = {}, entregas = 0 }) {
  return {
    date, shift, establishmentName: 'Bocas Grill Doral', franchiseName: 'Bocas',
    pages: [
      { type: 'front', data: { date, shift } },
      {
        type: 'summary',
        data: {
          totalOfOccupiedTables: String(rotSalon),
          totalOfOccupiedTablesBar: { bodyForTable: Array.from({ length: rotBar }, () => ({})) },
          countTotalUsePhone: String(sinUbicar),
          averageTimeToFirstResponse: '00:05:00',
          averageTimeToCleartTable: '00:07:00',
          averageTimeToReceiveTheMainCourse: '00:12:00',
          touch: toques.map(t => ({ name: t.name, result: { firt: { value: t.primeros }, second: { value: t.otros } } })),
          waitersApproachTheTable: { result: { firt: { value: 7 }, second: { value: '00:00:28' } } },
        },
      },
      { type: 'delay1ra', data: { body: Array.from({ length: at }, () => T('19:00:00', '19:06:00')) } },
      { type: 'delayClear', data: { body: Array.from({ length: li }, () => T('20:00:00', '20:08:00')) } },
      {
        type: 'delayToastPostAndServise',
        data: {
          delayToastPost: {
            // demorasPrep es {plato: cantidad}; se anade una fila vacia que NO debe contar
            delay: [
              ...Object.entries(demorasPrep).flatMap(([plato, n]) =>
                Array.from({ length: n }, () => TP(plato, '18:00:00', '18:14:00'))),
              TP_VACIO('Lunch'),
            ],
            categoryMetrics: Object.fromEntries(
              Object.entries(tickets).map(([k, v]) => [k, { totalTickets: v.n, avgPreparation: v.avg }])
            ),
          },
          delayDeliveryDishWhenItIsReadyInKitchen: {
            delay: Array.from({ length: entregas }, () => TP('Plato fuerte', '19:00:00', '19:11:00')),
            categoryMetrics: {},
          },
          delayServices: { delay: [], categoryMetrics: {} },
        },
      },
      // fila vacia: no debe contar como demora
      { type: 'delayClear', data: { body: [T('N/A', 'N/A')] } },
    ],
  };
}

console.log('── Lectura de un documento ──');
const uno = readDailyDocument(makeDoc({
  date: '2026-08-24', shift: 'day', rotSalon: 40, rotBar: 5, sinUbicar: 2, at: 3, li: 2,
  toques: [{ name: 'Gerente Johana', primeros: 10, otros: 4 }],
  tickets: { Lunch: { n: 106, avg: '00:10:53' } }, demorasPrep: { Lunch: 29 }, entregas: 2,
}));
eq(uno.rotaciones, 45, 'rotaciones = salon + barra');
eq(uno.demora1ra, 3, 'demoras de primera atencion');
eq(uno.demoraLimpieza, 2, 'la fila N/A no cuenta como demora');
eq(uno.toques.length, 1, 'toques leidos');
eq(uno.metricasPreparacion.Lunch.totalTickets, 106, 'tickets por categoria');

/* ── Semana completa: 7 dias x 2 turnos, faltan 2 ── */
const dias = buildWeekDays('2026-08-24').map(d => d.date);
const docs = [];
dias.forEach((date, i) => {
  docs.push(makeDoc({
    date, shift: 'day', rotSalon: 40, rotBar: 5, sinUbicar: 0, at: i === 0 ? 3 : 0, li: i === 0 ? 2 : 0,
    toques: [{ name: 'Gerente Johana', primeros: 10, otros: 4 }],
    tickets: { Lunch: { n: 15, avg: '00:10:00' }, 'Plato fuerte': { n: 30, avg: '00:12:00' } },
    demorasPrep: { Lunch: 3, 'Plato fuerte': 1 }, entregas: 2,
  }));
  // el sabado no tiene turno nocturno: hueco deliberado
  if (i !== 5) {
    docs.push(makeDoc({
      date, shift: 'night', rotSalon: 20, rotBar: 0, at: 0, li: 0,
      toques: [{ name: 'Asistente Desiree Agüero', primeros: 6, otros: 2 }],
      tickets: { Lunch: { n: 0, avg: 'N/A' }, 'Plato fuerte': { n: 20, avg: '00:12:20' } },
      demorasPrep: { 'Plato fuerte': 1 }, entregas: 1,
    }));
  }
});
// documento de otra semana: debe descartarse
docs.push(makeDoc({ date: '2026-09-14', shift: 'day', rotSalon: 999 }));

const r = buildWeeklyReport({
  documents: docs,
  establishment: { name: 'Bocas Grill Doral', dishes: [{ nameDishe: 'Lunch' }, { nameDishe: 'Plato fuerte' }] },
  from: '2026-08-24',
  dualShift: true,
});

console.log('── Reporte semanal ──');
eq(r.cobertura.esperados, 14, 'se esperan 14 turnos');
eq(r.cobertura.encontrados, 13, 'llegaron 13');
eq(r.cobertura.faltantes.length, 1, 'falta un turno');
eq(r.cobertura.faltantes[0].date, '2026-08-29', 'el que falta es del sabado');
eq(r.cobertura.faltantes[0].shift, 'night', 'y es el turno nocturno');
eq(r.cobertura.faltantes[0].estado, 'ausente', 'ausente, no un error de la API');
eq(r.cobertura.completa, false, 'la cobertura no es completa');
eq(r.meta.documentosUsados, 13, 'el documento de otra semana se descarta');
eq(r.avisos.some(a => a.includes('fuera del rango')), true, 'avisa del documento fuera de rango');

// diurno: 7 dias x 45 = 315. nocturno: 6 dias x 20 = 120
eq(r.cuadroGeneral.rotaciones.day, 315, 'rotaciones diurnas (salon + barra)');
eq(r.cuadroGeneral.rotacionesSalon.day, 280, 'salon diurno: 7 x 40');
eq(r.cuadroGeneral.rotacionesBarra.day, 35, 'barra diurna: 7 x 5');
eq(r.cuadroGeneral.rotacionesBarra.night, 0, 'sin barra de noche');
eq(r.aplica.barra, true, 'el establecimiento evalua barra');
eq(r.cuadroGeneral.rotaciones.night, 120, 'rotaciones nocturnas');
eq(r.cuadroGeneral.rotaciones.total, 435, 'rotaciones totales');
eq(r.cuadroGeneral.demora1ra.total, 3, 'demoras de primera atencion en la semana');
eq(r.cuadroGeneral.demoraLimpieza.total, 2, 'demoras de limpieza en la semana');

eq(r.porDia.length, 7, 'siete dias');
eq(r.porDia[0].weekday, 'Lunes', 'empieza en lunes');
eq(r.porDia[0].day.rotaciones, 45, 'lunes diurno');
eq(r.porDia[0].day.porcentaje1ra, 6.7, 'porcentaje de primera atencion del lunes');
eq(r.porDia[5].night.presente, false, 'el sabado nocturno se marca ausente');
eq(r.porDia[5].night.porcentaje1ra, null, 'sin datos el porcentaje es nulo, no cero');

eq(r.toques.length, 2, 'dos personas con toques');
const johana = r.toques.find(t => t.persona === 'Johana');
const desiree = r.toques.find(t => t.persona === 'Desiree Agüero');
eq(johana.cargo, 'Gerente', 'el cargo se separa del nombre');
eq(desiree.cargo, 'Asistente', 'asistente tambien');
eq(johana.porDia.length, 7, 'siete dias por persona');
// Como en el libro: primeros sobre las rotaciones del turno (10/45 = 22.2 %)
// y otros sobre los primeros (4/10 = 40 %), no sobre las rotaciones.
eq(johana.porDia[0].pctPrimeros, 22.2, 'porcentaje de primeros toques del lunes');
eq(johana.porDia[0].pctOtros, 40, 'otros toques del lunes: 4 sobre 10 primeros');
eq(johana.porDia[0].rotaciones, 45, 'las rotaciones del dia son las de su turno');
eq(johana.promedioSemanal.pctPrimeros, 22.2, 'promedio semanal de primeros');
eq(johana.promedioSemanal.pctOtros, 40, 'promedio semanal de otros');
eq(johana.totales.primeros, 70, 'Johana: 7 dias x 10 primeros');
eq(johana.totales.rotaciones, 315, 'rotaciones de los dias que trabajo');
eq(johana.diasConRegistro, 7, 'dias con dato');
eq(johana.diasQueCuentan, { primeros: 7, otros: 7 }, 'los siete dias entran en el promedio');
// Desiree solo nocturno: 6 primeros sobre 20 = 30 %, 2 otros sobre 6 = 33.3 %
eq(desiree.porDia[0].pctPrimeros, 30, 'porcentaje del lunes de la asistente');
eq(desiree.porDia[0].pctOtros, 33.3, 'otros toques de la asistente: 2 sobre 6');
eq(desiree.promedioSemanal.pctPrimeros, 30, 'promedio semanal de la asistente');
eq(desiree.totales.rotaciones, 120, 'rotaciones nocturnas acumuladas');
// El sabado no tuvo turno nocturno: para Desiree es N/A, no cero, y no cuenta.
eq(desiree.porDia[5].presente, false, 'el sabado la asistente no tiene registro');
eq(desiree.porDia[5].pctPrimeros, null, 'y su punto es N/A, no cero');
eq(desiree.diasQueCuentan.primeros, 6, 'seis dias entran en su promedio');
eq(r.avisos.some(a => a.includes('sobre los primeros')), true, 'avisa de la base del porcentaje');

const lunch = r.metrica.porPlato.find(p => p.dish === 'Lunch');
eq(lunch.day.procesos, 105, 'Lunch diurno: 7 x 15');
eq(lunch.night.procesos, 0, 'Lunch nocturno sin procesos');
eq(lunch.day.promedio, '00:10:00', 'promedio de Lunch');
eq(lunch.total.promedio, '00:10:00', 'los turnos sin tickets no arrastran el promedio');

const fuerte = r.metrica.porPlato.find(p => p.dish === 'Plato fuerte');
eq(fuerte.total.procesos, 330, 'Plato fuerte: 7x30 + 6x20');
// El libro de Excel promedia sin ponderar: AVERAGE(diurno, nocturno).
// Diurno 12:00 los siete dias, nocturno 12:20 los seis con turno.
eq(fuerte.day.promedio, '00:12:00', 'promedio diurno de plato fuerte');
eq(fuerte.night.promedio, '00:12:20', 'promedio nocturno de plato fuerte');
eq(fuerte.total.promedio, '00:12:10', 'total: promedio simple de los dos turnos');

eq(r.metrica.procesosTotales, 435, 'procesos totales');
eq(r.metrica.procesos.day, 315, 'procesos diurnos');
eq(r.metrica.procesos.night, 120, 'procesos nocturnos');

console.log('── Formas reales de las filas de demora ──');
// Las filas de Toast POS y de entrega NO usan {init,end} sino
// {tomaOrden, listoTablet, listoCocina, EntregaPLato}. Mirar solo init/end
// las descartaba todas.
eq(uno.demorasPreparacion.length, 29, 'la fila vacia no cuenta, las 29 con hora si');
eq(uno.demorasEntrega.length, 2, 'las demoras de entrega se leen pese a su otra forma');
// La categoria va en nameDish, no en dish. Antes cada demora se contaba
// en TODAS las categorias.
eq(lunch.total.demoras, 21, 'Lunch: 3 al dia x 7 dias, solo diurno');
eq(fuerte.total.demoras, 13, 'Plato fuerte: 7 diurnas + 6 nocturnas');
eq(lunch.night.demoras, 0, 'Lunch no tiene demoras nocturnas');
eq(r.metrica.demorasTotales, 34, 'total de demoras, sin duplicar por categoria');
eq(r.entregasYServicios.entregas.total, 20, 'entregas: 2 al dia x 7 mas 1 x 6');
eq(r.entregasYServicios.entregas.day, 14, 'entregas diurnas');
eq(r.entregasYServicios.porPlato.find(p => p.dish === 'Plato fuerte').total, 20, 'entregas por categoria');
eq(r.aplica.entregas, true, 'hay pagina de entregas');
eq(r.demorasPorDia.length, 7, 'demoras por dia, siete entradas');
eq(r.demorasPorDia[0].cantidad, 5, 'lunes: 4 diurnas + 1 nocturna');
eq(r.avisos.some(a => a.includes('aleatorios')), true, 'avisa de la metrica aleatoria');
eq(r.avisos.some(a => a.includes('Faltan 1')), true, 'avisa del turno que falta');

console.log('── Volumen, entregas y devoluciones ──');
eq(r.procesosPorDia.length, 7, 'procesos por dia, siete entradas');
eq(r.procesosPorDia[0].day, 45, 'lunes diurno: 15 Lunch + 30 plato');
eq(r.procesosPorDia[0].night, 20, 'lunes nocturno: solo plato fuerte');
eq(r.procesosPorDia[5].night, 0, 'sabado sin turno nocturno');
eq(r.entregasYServicios.porDia.length, 7, 'entregas por dia, siete entradas');
eq(r.entregasYServicios.porDia[0].day, 2, 'entregas del lunes diurno');
// La grafica de entregas junta los dos turnos del dia y separa por categoria.
eq(r.entregasYServicios.porDia[0].porPlato, { Lunch: 0, 'Plato fuerte': 3 },
  'lunes por categoria: 2 diurnas + 1 nocturna, todas de plato fuerte');
eq(r.entregasYServicios.porDia[0].sinCategoria, 0, 'lunes: ninguna sin categoria');
eq(r.entregasYServicios.servicios.total, 0, 'el fixture no trae demoras de servicio');
eq(r.devoluciones.total.total, 0, 'el fixture no trae devoluciones');
eq(r.aplica.devoluciones, false, 'sin devoluciones no se dibuja el grafico de devoluciones');
eq(r.devoluciones.porTipo.filter(d => d.visible).map(d => d.tipo), ['plato', 'pedido'],
  'plato y pedido salen siempre; las otras cuatro solo si hubo alguna');


console.log('── Take out: sus tickets no entran en el total de procesos ──');
// Como en el resumen del diario (symary.jsx): la categoria conserva su fila,
// con promedio y demoras, pero no suma en "Procesos evaluados".
const docsTo = [
  makeDoc({
    date: '2026-08-24', shift: 'day', rotSalon: 40,
    tickets: { Lunch: { n: 100, avg: '00:10:00' }, 'take out': { n: 30, avg: '00:05:00' } },
    demorasPrep: { Lunch: 4, 'take out': 2 },
  }),
  makeDoc({
    date: '2026-08-24', shift: 'night', rotSalon: 20,
    tickets: { Lunch: { n: 50, avg: '00:12:00' }, 'take out': { n: 10, avg: '00:06:00' } },
    demorasPrep: { Lunch: 1 },
  }),
];
const estTo = {
  name: 'T', dishes: [{ nameDishe: 'Lunch' }, { nameDishe: 'take out' }],
  config_report: { numberOfReports: 'dual-diary', typePageSumary: 'classic' },
};
const rTo = buildWeeklyReport({ documents: docsTo, establishment: estTo, from: '2026-08-24' });
eq(rTo.metrica.procesos, { day: 100, night: 50, all: 0, total: 150 }, 'procesos por turno sin take out');
eq(rTo.metrica.procesosTotales, 150, 'procesos totales sin los 40 de take out');
const filaTo = rTo.metrica.porPlato.find(f => f.dish === 'take out');
eq(filaTo.total.procesos, 40, 'la fila de take out conserva sus procesos');
eq(filaTo.total.demoras, 2, 'y sus demoras');
eq(filaTo.total.promedio, '00:05:30', 'y su promedio');
eq(rTo.metrica.demorasTotales, 7, 'las demoras de take out si cuentan en el total: 5 de Lunch + 2');
eq(rTo.metrica.porcentajeDemora, 4.67, 'porcentaje como en el PDF: las 7 demoras, take out incluido, sobre los 150 procesos sin take out');
eq(rTo.procesosPorDia[0], { date: '2026-08-24', weekday: 'Lunes', day: 100, night: 50, all: 0 },
  'la grafica de procesos tampoco suma take out');
eq(rTo.demorasPorDia[0].cantidad, 7, 'el porcentaje por dia cuenta las 7 demoras, take out incluido');
eq(rTo.demorasPorDia[0].procesos, 150, 'sobre los 150 procesos sin take out');
eq(rTo.demorasPorDia[0].porcentaje, 4.7, 'y da 7/150 a un decimal');
eq(rTo.procesosPorDia.reduce((s, d) => s + d.day + d.night + d.all, 0), rTo.metrica.procesosTotales,
  'y sus barras suman el total de la tabla de metrica');
eq(esTakeOut('Take Out'), true, 'se reconoce sin mayusculas');
eq(esTakeOut('Lunch'), false, 'y no confunde otra categoria');

console.log('── Alertas de novedad: clientes sin ubicar y primera atencion ──');
// El catalogo de alertas vive en Mongo, asi que el nombre se reconoce por su
// forma, sin acentos ni mayusculas.
for (const n of ['Cliente sin ser ubicado por el host', 'Clientes sin ubicar', 'Mesa sin ser ubicada por el host'])
  eq(esAlertaSinUbicar(n), true, 'reconoce: ' + n);
for (const n of ['Demora de primera atencion', 'Uso de celular', ''])
  eq(esAlertaSinUbicar(n), false, 'no confunde: ' + (n || '(vacio)'));

const TT = t => ({ table: t, timePeriod: { init: '19:00:00', end: '19:06:00' } });
const docAlerta = (date, shift, { sinUbicar = 0, salon = 0, barra = 0 } = {}) => ({
  date, shift, establishmentName: 'Francisca Miami',
  pages: [
    { type: 'summary', data: { totalOfOccupiedTables: '50', totalOfOccupiedTablesBar: { bodyForTable: [{}, {}] }, countTotalUsePhone: '99', touch: [] } },
    { type: 'delay1ra', data: { body: [...Array.from({ length: salon }, () => TT('4')), ...Array.from({ length: barra }, () => TT('Barra'))] } },
    { type: 'blocked&novelty', data: { menuRef: { es: 'Cliente sin ser ubicado por el host', category: 'employee' }, body: Array.from({ length: sinUbicar }, () => ({})) } },
    { type: 'blocked&novelty', data: { menuRef: { es: 'Uso indebido de celular', category: 'employee' }, body: [{}, {}, {}] } },
  ],
});
const diasA = buildWeekDays('2026-08-24').map(d => d.date);
const docsA = [];
diasA.forEach((date, i) => {
  docsA.push(docAlerta(date, 'day', { sinUbicar: i === 0 ? 2 : 0, salon: i === 0 ? 2 : 0, barra: i === 0 ? 1 : 0 }));
  docsA.push(docAlerta(date, 'night', { sinUbicar: i === 0 ? 1 : 0 }));
});
const rA = buildWeeklyReport({
  documents: docsA, from: '2026-08-24',
  establishment: {
    name: 'Francisca Miami', dishes: [{ nameDishe: 'Entradas' }],
    config_report: { numberOfReports: 'dual-diary', typePageSumary: 'classic', requireBarTable: true },
  },
});
eq(rA.cuadroGeneral.clientesSinUbicar.day, 2, 'clientes sin ubicar, diurno');
eq(rA.cuadroGeneral.clientesSinUbicar.night, 1, 'clientes sin ubicar, nocturno');
eq(rA.cuadroGeneral.clientesSinUbicar.total, 3, 'clientes sin ubicar, total');
// countTotalUsePhone vale 99 y es "Uso de celular": no debe colarse aqui
eq(rA.cuadroGeneral.clientesSinUbicar.total !== 99, true, 'el uso de celular no se cuenta como clientes sin ubicar');
eq(rA.cuadroGeneral.demora1raSalon.day, 2, 'primera atencion de salon');
eq(rA.cuadroGeneral.demora1raBarra.day, 1, 'primera atencion de barra, en su propia fila');
eq(rA.cuadroGeneral.demora1ra.day, 3, 'y el total es la suma de las dos');
eq(rA.aplica.clientesSinUbicar, true, 'la fila se dibuja en un resumen clasico');
eq(rA.alertasVistas.length, 2, 'se listan los nombres de alerta vistos');

console.log('── Toques: el metodo del libro de Excel ──');
// 'Base de datos' de "Semanal de francisca Doral.xlsm": cada turno da
// primeros/rotaciones y otros/primeros, y el promedio diario y el semanal son
// AVERAGEIF(..., ">0.0%"), que salta los ceros, los N/A y los #DIV/0!.
// Las series son las que los graficos "Promedio diario" tenian en cache y los
// resultados, las celdas AA de cada persona.
const avg = xs => +((promedioSinVacios(xs) ?? 0) * 100).toFixed(1);
// Tiago Ferreira: el miercoles es #DIV/0! y queda fuera; el domingo da 137 %.
eq(avg([0.8421, 0.6957, null, 0.7818, 0.68, 0.7796, 0.7105]), 74.8, 'Tiago, primeros: AA23 = 74.8 %');
eq(avg([0.5625, 0.8873, null, 0.6279, 0.5294, 0.8363, 1.3704]), 80.2, 'Tiago, otros: AA24 = 80.2 %');
// Gabriel Portillo: tres dias en cero, solo cuatro cuentan.
eq(avg([0, 0, 0.8462, 0.8750, 0.8718, 0, 0.6842]), 81.9, 'Gabriel, primeros: AA15 = 81.9 %');
eq(avg([0, 0, 0.6364, 0.3333, 0.8824, 0, 0.3846]), 55.9, 'Gabriel, otros: AA16 = 55.9 %');
// Isael Meneses: un solo dia con dato; el promedio es ese dia.
eq(avg([0, 0, 0.66, 0, 0, 0, 0]), 66, 'Isael, primeros: AA31 = 66.0 %');
eq(avg([0, 0, 0.387, 0, 0, 0, 0]), 38.7, 'Isael, otros: AA32 = 38.7 %');
eq(promedioSinVacios([0, null, undefined, NaN]), null, 'sin ningun valor el promedio es N/A, no cero');
eq(promedioSinVacios([]), null, 'vacio tambien es N/A');

// De punta a punta: dos turnos el lunes, un turno sin toques el martes, nada
// el miercoles y un turno sin "otros" el jueves.
const docsT = [
  makeDoc({ date: '2026-08-24', shift: 'day', rotSalon: 38, toques: [{ name: 'Gerente Tiago', primeros: 32, otros: 18 }] }),
  makeDoc({ date: '2026-08-24', shift: 'night', rotSalon: 46, toques: [{ name: 'Gerente Tiago', primeros: 30, otros: 25 }] }),
  makeDoc({ date: '2026-08-25', shift: 'night', rotSalon: 23, toques: [{ name: 'Gerente Tiago', primeros: 0, otros: 0 }] }),
  makeDoc({ date: '2026-08-27', shift: 'day', rotSalon: 50, toques: [{ name: 'Gerente Tiago', primeros: 5, otros: 0 }] }),
];
const rT = buildWeeklyReport({
  documents: docsT, from: '2026-08-24', dualShift: true,
  establishment: { name: 'Francisca Doral', dishes: [{ nameDishe: 'Lunch' }] },
});
const tiago = rT.toques.find(t => t.persona === 'Tiago');
eq(tiago.porDia[0].turnos.map(t => t.pctPrimeros), [84.2, 65.2], 'lunes, primeros por turno: 32/38 y 30/46');
eq(tiago.porDia[0].turnos.map(t => t.pctOtros), [56.3, 83.3], 'lunes, otros por turno: 18/32 y 25/30');
eq(tiago.porDia[0].pctPrimeros, 74.7, 'promedio diario del lunes: la media de los dos turnos');
eq(tiago.porDia[0].pctOtros, 69.8, 'y el de otros toques');
eq(tiago.porDia[1].pctPrimeros, null, 'martes con turno pero sin toques: N/A, no cero');
eq(tiago.porDia[2].pctPrimeros, null, 'miercoles sin registro: N/A');
eq(tiago.porDia[3].pctPrimeros, 10, 'jueves: 5 sobre 50');
eq(tiago.porDia[3].pctOtros, null, 'jueves sin otros toques: N/A en otros');
eq(tiago.promedioSemanal.pctPrimeros, 42.4, 'semanal de primeros: solo lunes y jueves');
eq(tiago.promedioSemanal.pctOtros, 69.8, 'semanal de otros: solo el lunes');
eq(tiago.diasConRegistro, 3, 'tres dias con registro');
eq(tiago.diasQueCuentan, { primeros: 2, otros: 1 }, 'pero cuentan dos en primeros y uno en otros');


console.log('── Configuracion de semanales: alertas extra por Menu._id ──');
// config_report.weeklyAlerts trae ids del catalogo. Una pagina de novedad
// cuya menuRef._id este en la lista de un grupo cuenta como esa demora,
// ademas de las base que el diario ya clasifica.
const ID_HOST = '64a000000000000000000001';
const ID_LIMP = '64a000000000000000000002';
const ID_PREP = '64a000000000000000000003';
const novedad = (id, es, filas) => ({
  type: 'blocked&novelty', data: { menuRef: { _id: id, es, category: 'employee' }, body: filas },
});
const docExtra = (date, shift) => {
  const d = makeDoc({
    date, shift, rotSalon: 40, rotBar: 5, at: 2, li: 1,
    tickets: { Lunch: { n: 50, avg: '00:10:00' } }, demorasPrep: { Lunch: 4 },
  });
  d.pages.push(
    novedad(ID_HOST, 'Cliente sin ser ubicado por el host', [{ table: '3' }, { table: 'Barra' }, {}]),
    novedad(ID_LIMP, 'Mesa sucia reportada', [{ table: '7' }]),
    novedad(ID_PREP, 'Plato frio', [{ table: '2' }, { table: '4' }]),
    novedad('64a0000000000000000000ff', 'Otra alerta cualquiera', [{}, {}]),
  );
  return d;
};
const docsX = [docExtra('2026-08-24', 'day'), docExtra('2026-08-24', 'night')];
const configX = {
  numberOfReports: 'dual-diary', typePageSumary: 'classic', requireBarTable: true,
  // un id suelto y otro poblado como { _id }: los dos valen
  weeklyAlerts: { firstAttention: [ID_HOST], cleaning: [ID_LIMP], preparation: [{ _id: ID_PREP, es: 'Plato frio' }] },
};
const estX = { name: 'X', dishes: [{ nameDishe: 'Lunch' }], config_report: configX };
const rX = buildWeeklyReport({ documents: docsX, establishment: estX, from: '2026-08-24' });
const sinX = buildWeeklyReport({
  documents: docsX, from: '2026-08-24',
  establishment: { ...estX, config_report: { ...configX, weeklyAlerts: undefined } },
});

eq(sinX.cuadroGeneral.demora1ra.total, 4, 'sin configuracion: solo las base, 2 por turno');
eq(sinX.metrica.demorasTotales, 8, 'sin configuracion la metrica no cambia');
eq(sinX.configuracionSemanal.activa, false, 'y se declara inactiva');

// Con requireBarTable el cuadro reparte: de las 3 extra, la de mesa "Barra"
// va a la fila de barra, igual que pasa con las base. Ninguna se pierde.
eq(rX.cuadroGeneral.demora1raSalon.total, 8, 'salon: 2 base + 2 extra, por turno');
eq(rX.cuadroGeneral.demora1raBarra.total, 2, 'barra: 1 extra por turno');
eq(rX.cuadroGeneral.demora1ra.total, 10, 'total: las diez, sin perder ninguna');
eq(rX.cuadroGeneral.demora1ra.day, 5, 'diurno: 4 de salon y 1 de barra');
const unoX = readDailyDocument(docsX[0], {
  firstAttention: new Set([ID_HOST]), cleaning: new Set([ID_LIMP]), preparation: new Set([ID_PREP]),
});
eq(unoX.demora1raBarra, 1, 'la fila con mesa no numerica va a barra');
eq(unoX.demora1raSalon, 4, 'las demas al salon, incluida la que no trae mesa');
eq(rX.cuadroGeneral.demoraLimpieza.total, 4, 'limpieza: 1 base + 1 extra, por turno');

// El cuadro y el grafico tienen que enseñar la misma cifra. Cuando el local
// evaluaba barra no cuadraban: el cuadro contaba solo el salon y el grafico
// todo, y las demoras de barra no salian en ninguna fila.
const sumaDelGrafico = rep => rep.porDia.reduce((t, d) => t + d.day.demora1ra + d.night.demora1ra + d.all.demora1ra, 0);
eq(rX.cuadroGeneral.demora1ra.total, sumaDelGrafico(rX), 'el cuadro cuadra con el grafico');
eq(rA.cuadroGeneral.demora1ra.total, sumaDelGrafico(rA), 'tambien con barra evaluada');
eq(rX.cuadroGeneral.demora1raSalon.total + rX.cuadroGeneral.demora1raBarra.total, rX.cuadroGeneral.demora1ra.total, 'salon + barra = total');
eq(rX.porDia[0].day.demora1raSalon + rX.porDia[0].day.demora1raBarra, rX.porDia[0].day.demora1ra, 'y tambien dia a dia');

console.log('── Porcentaje de demora en el cuadro ──');
// El denominador son TODAS las rotaciones del turno, salon mas barra:
// 40 de salon y 5 de barra por documento, dos documentos, son 90.
eq(rX.cuadroGeneral.rotaciones.total, 90, 'rotaciones de la semana, salon y barra');
eq(rX.cuadroGeneral.porcentaje1ra.total, 11.1, 'porcentaje de primera atencion: 10 de 90');
eq(rX.cuadroGeneral.porcentaje1ra.day, 11.1, 'y por turno: 5 de 45');
eq(rX.cuadroGeneral.porcentajeLimpieza.total, 4.4, 'porcentaje de limpieza: 4 de 90');

// Sin rotaciones no hay sobre que calcular: N/A, no cero. Un cero diria que
// no hubo demoras, y eso es otra cosa.
eq(rX.cuadroGeneral.porcentaje1ra.all, null, 'sin turno unico, el porcentaje es null');
eq(rX.metrica.demorasTotales, 12, 'preparacion: 4 base + 2 extra, por turno');
eq(rX.metrica.demorasExtra.total, 4, 'las extra de preparacion se exponen aparte');
eq(rX.metrica.porcentajeDemora, 12, '12 demoras sobre 100 procesos = 12 %');

// El porcentaje de demora en preparacion va a dos decimales, como en el libro.
// Caso real de Francisca Doral: 5 demoras sobre 1319 procesos se imprimen
// como 0.38%, y con un decimal salia 0.4%.
const docPrep = (shift, n, demoras) => makeDoc({
  date: '2026-08-24', shift, rotSalon: 10,
  tickets: { Lunch: { n, avg: '00:09:00' } }, demorasPrep: { Lunch: demoras },
});
const rPrep = buildWeeklyReport({
  documents: [docPrep('day', 919, 2), docPrep('night', 400, 3)], from: '2026-08-24',
  establishment: { name: 'P', dishes: [{ nameDishe: 'Lunch' }], config_report: { numberOfReports: 'dual-diary' } },
});
eq(rPrep.metrica.procesosTotales, 1319, 'procesos de la semana');
eq(rPrep.metrica.demorasTotales, 5, 'demoras de la semana');
eq(rPrep.metrica.porcentajeDemora, 0.38, 'porcentaje a dos decimales: 0.38, no 0.4');
eq(rX.demorasPorDia[0].cantidad, 12, 'el lunes suma las extra en el grafico por dia');
eq(rX.demorasPorDia[0].night, 6, 'y por turno');
eq(rX.demorasPorDia[0].extra, 4, 'el grafico por categoria recibe las extra aparte, para dibujarlas');
eq(rX.configuracionSemanal.contadas, { firstAttention: 6, cleaning: 2, preparation: 4, returns: 0 }, 'resumen de lo sumado');
eq(rX.avisos.some(a => a.includes('Configuración de semanales')), true, 'lo avisa en las notas');
eq(rX.alertasVistas.includes('Otra alerta cualquiera'), true, 'una alerta fuera de la lista no se cuenta, pero se lista');


console.log('── Devoluciones: los nombres reales del catalogo ──');
// Tomados de Jarvis-express365/src/component/Main/foods.json, categoria "food".
// La mayuscula inicial cambia de una a otra, asi que se comparan sin acentos
// ni mayusculas.
eq(tipoDeDevolucion('posible devolución de plato'), 'plato', 'plato');
eq(tipoDeDevolucion('posible devolución de postre'), 'postre', 'postre');
eq(tipoDeDevolucion('posible devolución de entrada'), 'entrada', 'entrada');
eq(tipoDeDevolucion('posible devolución de bebida'), 'bebida', 'bebida');
eq(tipoDeDevolucion('Posible devolución de ensalada'), 'ensalada', 'ensalada');
eq(tipoDeDevolucion('Posible devolución de pedido'), 'pedido', 'pedido');
eq(tipoDeDevolucion('Posible devolucion de plato'), 'plato', 'sin tilde tambien');
eq(tipoDeDevolucion('Devolución de algo nuevo'), 'otra', 'una desconocida no se suma a plato');
eq(tipoDeDevolucion('Demora de primera atención'), null, 'una demora no es una devolucion');
eq(tipoDeDevolucion('Uso indebido de celular'), null, 'ni el uso de celular');


console.log('── Prueba de oro: devoluciones de Francisca Doral (24 al 30 ago) ──');
// Cifras del PDF emitido "Reporte Semanal Francisca Doral - Del 08-24-2026 -
// Al 08-30-2026". El fixture vive en demoWeek.js, junto al de Bocas, para que
// la prueba de renderizado dibuje exactamente estos mismos numeros.
const diasD = buildWeekDays(DORAL_FROM).map(d => d.date);
const rD = buildWeeklyReport({
  documents: doralDocuments(diasD),
  establishment: DORAL_ESTABLISHMENT,
  from: DORAL_FROM,
});

const devPlato = rD.devoluciones.porTipo.find(d => d.tipo === 'plato');
const devPedido = rD.devoluciones.porTipo.find(d => d.tipo === 'pedido');

eq([devPlato.day, devPlato.night, devPlato.total], [30, 12, 42], 'devoluciones de plato: 30 12 42');
eq([devPedido.day, devPedido.night, devPedido.total], [3, 1, 4], 'devoluciones de pedido: 3 1 4');
eq([rD.devoluciones.total.day, rD.devoluciones.total.night, rD.devoluciones.total.total],
  [33, 13, 46], 'cantidad total de devoluciones: 33 13 46');
eq([rD.metrica.procesos.day, rD.metrica.procesos.night, rD.metrica.procesos.total],
  [1047, 519, 1566], 'procesos evaluados: 1047 519 1566');
eq(rD.devoluciones.porcentaje, 2.9, 'porcentaje de devolucion: 46/1566 = 2.9 %');
eq(rD.entregasYServicios.entregas.total, 0, 'cantidad total de demoras en entrega: 0');
eq(rD.entregasYServicios.porcentaje, 0, 'porcentaje de demora en entrega: 0.0 %');
eq(rD.aplica.devoluciones, true, 'se dibuja el grafico de devoluciones');
eq(rD.aplica.entregas, false, 'pero no el de demoras en entrega, que no las hubo');
eq(rD.devoluciones.porDia.length, 7, 'el grafico trae un punto por dia');
// El PDF manual dibujaba solo las de plato. El grafico lleva ahora todas,
// plato y pedido, para que sume la fila de total de la tabla: 33 y 13.
eq(rD.devoluciones.porDia.map(d => d.day), DORAL_PLATO_DIA.map((n, i) => n + DORAL_PEDIDO_DIA[i]),
  'devoluciones diurnas por dia, todos los tipos');
eq(rD.devoluciones.porDia.map(d => d.night), DORAL_PLATO_NOC.map((n, i) => n + DORAL_PEDIDO_NOC[i]),
  'devoluciones nocturnas por dia, todos los tipos');
eq(rD.devoluciones.porTipo.filter(d => d.visible).map(d => d.tipo), ['plato', 'pedido'],
  'solo salen las dos filas que el reporte manual tiene');


console.log('── Configuracion de semanales: devoluciones por Menu._id ──');
// El grupo de devoluciones guarda ids: los de las seis base, que la seccion
// de configuracion resuelve por nombre, y los que se anadan a mano. Una
// pagina cuenta si su id esta en el grupo o si su nombre la reconoce, pero
// una sola vez aunque cumpla las dos.
const ID_DEV_PLATO = '64b000000000000000000001';
const ID_DEV_NUEVA = '64b000000000000000000002';
const docDev = (date, shift) => {
  const d = makeDoc({ date, shift, rotSalon: 30, tickets: { Lunch: { n: 50, avg: '00:10:00' } } });
  d.pages.push(
    { type: 'blocked&novelty', data: { menuRef: { _id: ID_DEV_PLATO, es: 'posible devolución de plato', category: 'food' }, body: [{}, {}] } },
    { type: 'blocked&novelty', data: { menuRef: { _id: ID_DEV_NUEVA, es: 'Plato regresado a cocina', category: 'food' }, body: [{}] } },
  );
  return d;
};
const docsDev = [docDev('2026-08-24', 'day'), docDev('2026-08-24', 'night')];
const configDev = {
  numberOfReports: 'dual-diary', typePageSumary: 'classic',
  weeklyAlerts: { returns: [ID_DEV_PLATO, { _id: ID_DEV_NUEVA }] },
};
const estDev = { name: 'D', dishes: [{ nameDishe: 'Lunch' }], config_report: configDev };
const rDev = buildWeeklyReport({ documents: docsDev, establishment: estDev, from: '2026-08-24' });
const sinDev = buildWeeklyReport({
  documents: docsDev, from: '2026-08-24',
  establishment: { ...estDev, config_report: { ...configDev, weeklyAlerts: undefined } },
});
const devTipo = (rep, tipo) => rep.devoluciones.porTipo.find(d => d.tipo === tipo).total;

eq(sinDev.devoluciones.total.total, 4, 'sin configuracion: solo las que reconoce el nombre, 2 por turno');
eq(devTipo(rDev, 'plato'), 4, 'la base, configurada y reconocida, cuenta una sola vez');
eq(devTipo(rDev, 'otra'), 2, 'la anadida a mano cuenta, en otras devoluciones');
eq(rDev.devoluciones.total.total, 6, 'total: 4 de plato y 2 anadidas');
eq(rDev.devoluciones.porcentaje, 6, 'y entran en el porcentaje: 6 de 100 procesos');
eq(rDev.configuracionSemanal.contadas.returns, 2, 'la configuracion sumo solo las que el nombre no reconocia');
eq(rDev.avisos.some(a => a.includes('2 a devoluciones')), true, 'lo avisa en las notas');


console.log('── La barra solo cuenta si el establecimiento la evalua ──');
// Como en el diario: sin requireBarTable el resumen no enseña la barra y
// todas las demoras de primera atencion son de mesa.
const docsBar = diasA.slice(0, 1).map(date => docAlerta(date, 'day', { salon: 2, barra: 1 }));
const conBarra = buildWeeklyReport({
  documents: docsBar, from: '2026-08-24',
  establishment: { name: 'B', dishes: [], config_report: { numberOfReports: 'dual-diary', requireBarTable: true } },
});
const sinBarra = buildWeeklyReport({
  documents: docsBar, from: '2026-08-24',
  establishment: { name: 'B', dishes: [], config_report: { numberOfReports: 'dual-diary', requireBarTable: false } },
});
eq(conBarra.cuadroGeneral.rotaciones.total, 52, 'con barra evaluada: 50 de salon y 2 de barra');
eq(sinBarra.cuadroGeneral.rotaciones.total, 50, 'sin barra evaluada, la barra no cuenta');
eq(sinBarra.cuadroGeneral.rotacionesBarra.total, 0, 'ni en su fila');
eq(sinBarra.porDia[0].day.rotaciones, 50, 'ni en el grafico');
eq(sinBarra.cuadroGeneral.demora1ra.total, 3, 'las tres demoras de primera atencion siguen contando');
eq(sinBarra.cuadroGeneral.demora1raSalon.total, 3, 'todas como de mesa, igual que en el diario');
eq(sinBarra.cuadroGeneral.demora1raBarra.total, 0, 'ninguna de barra');
eq(sinBarra.cuadroGeneral.porcentaje1ra.day, 6, 'el porcentaje es sobre las 50 de salon: 3 de 50');
eq(sinBarra.avisos.some(a => a.includes('2 rotaciones de barra')), true, 'y avisa de lo que dejo fuera');
eq(conBarra.avisos.some(a => a.includes('rotaciones de barra')), false, 'con barra evaluada no hay aviso');


console.log('── Entregas: la tabla suma su total ──');
// Una demora en entrega de una categoria que el local no tiene configurada
// cuenta en el total y en el grafico, asi que lleva su propia fila.
const docEnt = makeDoc({ date: '2026-08-24', shift: 'day', rotSalon: 10, entregas: 3 });
docEnt.pages.find(p => p.type === 'delayToastPostAndServise').data.delayServices.delay =
  [TP('Lunch', '18:00:00', '18:30:00')];
const rEnt = buildWeeklyReport({
  documents: [docEnt], from: '2026-08-24',
  establishment: { name: 'E', dishes: [{ nameDishe: 'Lunch' }], config_report: { numberOfReports: 'dual-diary' } },
});
eq(rEnt.entregasYServicios.entregas.total, 3, 'tres demoras en entrega');
eq(rEnt.entregasYServicios.porPlato.find(p => p.dish === 'Lunch').total, 0, 'ninguna es de Lunch');
eq(rEnt.entregasYServicios.sinCategoria.total, 3, 'las tres van a otras categorias');
eq(rEnt.entregasYServicios.porDia[0].sinCategoria, 3, 'y en la grafica van en su propia serie');
eq(rEnt.entregasYServicios.porDia[0].porPlato, { Lunch: 0 }, 'no en la de Lunch');
eq(rEnt.avisos.some(a => a.includes('3 demoras en entrega')), true, 'y se avisa');
eq(rEnt.aplica.servicios, true, 'hubo demoras de servicio');
const docServ = makeDoc({ date: '2026-08-24', shift: 'day', rotSalon: 10 });
docServ.pages.find(p => p.type === 'delayToastPostAndServise').data.delayServices.delay =
  [TP('Lunch', '18:00:00', '18:30:00')];
const soloServicio = buildWeeklyReport({
  documents: [docServ], from: '2026-08-24',
  establishment: { name: 'S', dishes: [{ nameDishe: 'Lunch' }], config_report: { numberOfReports: 'dual-diary' } },
});
eq(soloServicio.aplica.servicios, true, 'solo hubo demoras de servicio');
eq(soloServicio.aplica.entregas, false, 'asi que no se dibuja el grafico de entregas, que saldria en cero');


console.log('── Errores en comanda: cuentan como demora de preparacion ──');
// Comparten array con las demoras de preparacion y el resumen del diario los
// cuenta ahi. Los manuales nacen con los tiempos en cero; los de Jarvis traen hora.
const ERROR_MANUAL = nameDish => ({ ...TP_VACIO(nameDish), menuRef: { es: 'Error en comanda' } });
const ERROR_JARVIS = nameDish => ({ ...TP(nameDish, '18:06:02', '18:21:29'), menuRef: { es: 'Error en comanda' } });
const docErr = makeDoc({
  date: '2026-08-24', shift: 'night', rotSalon: 10,
  tickets: { Lunch: { n: 20, avg: '00:10:00' }, Drinks: { n: 10, avg: '00:03:00' } }, demorasPrep: { Lunch: 2 },
});
docErr.pages.find(p => p.type === 'delayToastPostAndServise').data.delayToastPost.delay.push(
  ERROR_MANUAL('Drinks'), ERROR_MANUAL('Lunch'), ERROR_JARVIS('Drinks'));
eq(readDailyDocument(docErr).demorasPreparacion.length, 5, 'las 2 demoras con hora y los 3 errores; la fila vacia sigue sin contar');
const rErr = buildWeeklyReport({
  documents: [docErr], from: '2026-08-24',
  establishment: { name: 'Francisca Doral', dishes: [{ nameDishe: 'Lunch' }, { nameDishe: 'Drinks' }], config_report: { numberOfReports: 'dual-diary' } },
});
eq(rErr.metrica.porPlato.find(p => p.dish === 'Drinks').night.demoras, 2, 'drinks: el error manual en cero y el de Jarvis');
eq(rErr.metrica.porPlato.find(p => p.dish === 'Lunch').night.demoras, 3, 'lunch: 2 demoras y 1 error manual');
eq(rErr.metrica.demorasTotales, 5, 'el total de la tabla los incluye');
eq(rErr.demorasPorDia[0].cantidad, 5, 'y la grafica por dia tambien');


console.log('── Ocultar las hojas de toques ──');
eq(r.aplica.toques, true, 'por defecto las hojas de toques salen');
const rSinToques = buildWeeklyReport({
  documents: demoDocuments(buildWeekDays(DEMO_FROM).map(d => d.date)),
  establishment: { ...DEMO_ESTABLISHMENT, config_report: { ...DEMO_ESTABLISHMENT.config_report, weeklyHideManagerTouches: true } },
  from: DEMO_FROM,
});
eq(rSinToques.aplica.toques, false, 'con weeklyHideManagerTouches no se dibujan');
eq(rSinToques.toques.length, 2, 'pero los datos de toques siguen en el reporte');


console.log('── Las graficas suman lo mismo que las tablas ──');
// Cada grafico por dia tiene que sumar, turno por turno, la cifra que su
// tabla enseña como total. Se comprueba en todos los reportes de esta suite.
const suma = xs => xs.reduce((a, b) => a + b, 0);
const TURNOS = ['day', 'night', 'all'];
const deGrafico = (serie, campo) => TURNOS.map(t => suma(serie.map(d => (campo ? d[t][campo] : d[t]))));
const deTabla = x => TURNOS.map(t => x[t]);

function cuadra(rep, nombre) {
  const c = rep.cuadroGeneral;
  const e = rep.entregasYServicios;
  eq(deGrafico(rep.porDia, 'rotaciones'), deTabla(c.rotaciones), `${nombre}: rotaciones`);
  eq(deGrafico(rep.porDia, 'demora1ra'), deTabla(c.demora1ra), `${nombre}: primera atencion`);
  eq(deGrafico(rep.porDia, 'demoraLimpieza'), deTabla(c.demoraLimpieza), `${nombre}: limpieza`);
  eq(deGrafico(rep.procesosPorDia), deTabla(rep.metrica.procesos), `${nombre}: procesos evaluados`);
  eq(suma(deGrafico(rep.demorasPorDia)), rep.metrica.demorasTotales, `${nombre}: demoras por turno`);
  eq(suma(rep.demorasPorDia.map(d => suma(Object.values(d.porPlato)) + d.extra)), rep.metrica.demorasTotales,
    `${nombre}: demoras por categoria`);
  eq(deGrafico(e.porDia), deTabla(e.entregas), `${nombre}: demoras en entrega`);
  eq(suma(e.porPlato.map(p => p.total)) + e.sinCategoria.total, e.entregas.total, `${nombre}: filas de entregas`);
  // La grafica de entregas junta los turnos y separa por categoria: cada dia
  // sus barras suman lo que suman sus turnos, y cada serie, su fila de la tabla.
  eq(e.porDia.map(d => suma(Object.values(d.porPlato)) + d.sinCategoria), e.porDia.map(d => d.day + d.night + d.all),
    `${nombre}: entregas por categoria, dia a dia`);
  eq(e.porPlato.map(p => suma(e.porDia.map(d => d.porPlato[p.dish]))), e.porPlato.map(p => p.total),
    `${nombre}: series de entregas contra sus filas`);
  eq(suma(e.porDia.map(d => d.sinCategoria)), e.sinCategoria.total, `${nombre}: serie de entregas sin categoria`);
  eq(deGrafico(rep.devoluciones.porDia), deTabla(rep.devoluciones.total), `${nombre}: devoluciones`);
  eq(suma(rep.devoluciones.porTipo.map(d => d.total)), rep.devoluciones.total.total, `${nombre}: filas de devoluciones`);
}

const rBocas = buildWeeklyReport({
  documents: demoDocuments(buildWeekDays(DEMO_FROM).map(d => d.date)),
  establishment: DEMO_ESTABLISHMENT,
  from: DEMO_FROM,
});
for (const [rep, nombre] of [[r, 'sintetico'], [rX, 'alertas extra'], [rA, 'con barra'], [sinBarra, 'sin barra'],
  [rDev, 'devoluciones configuradas'], [rEnt, 'entregas sin categoria'], [rErr, 'errores en comanda'],
  [rBocas, 'Bocas'], [rD, 'Doral']]) {
  cuadra(rep, nombre);
}


console.log('\n' + (fail === 0 ? 'TODO CORRECTO' : 'HAY FALLOS') + '  ok:' + pass + '  fallos:' + fail);
process.exit(fail ? 1 : 0);
