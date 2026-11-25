/**
 * Prueba de oro: el agregador contra un reporte semanal REAL ya emitido.
 *
 * Se ejecuta con:  npm run test:bocas
 *
 * Las cifras están tomadas del PDF "Reporte Semanal Bocas Grill Doral - Del
 * 08-24-2026 - Al 08-30-2026", que se hizo a mano en Excel y Word. Cada bloque
 * dice de qué página del PDF sale lo que comprueba.
 *
 * El fixture reconstruye los documentos diarios que habrían producido ese
 * reporte, así que si el agregador cambia y deja de reproducirlo, esta prueba
 * falla. Es la única forma de saber que la automatización da lo mismo que el
 * proceso manual.
 */

import { buildWeeklyReport, buildWeekDays } from './weeklyMetrics.js';

let pass = 0, fail = 0;
const eq = (got, want, name) => {
    const a = JSON.stringify(got), b = JSON.stringify(want);
    if (a === b) { pass++; console.log('  ok   ' + name); }
    else { fail++; console.log('  FALLO ' + name + '\n        esperaba ' + b + '\n        obtuvo   ' + a); }
};


/* Las cifras y los documentos viven en demoWeek.js: un solo sitio para
   el fixture, que la vista previa de la ruta usa tambien. */
import {
    DEMO_FROM, DEMO_ESTABLISHMENT, demoDocuments,
    PROC_DIA, PROC_NOC, DEM_LUNCH, DEM_PLATO, DEM_NOC,
} from './demoWeek.js';

const dias = buildWeekDays(DEMO_FROM).map(d => d.date);
const documents = demoDocuments(dias);

const r = buildWeeklyReport({
    documents,
    establishment: DEMO_ESTABLISHMENT,
    from: DEMO_FROM,
});

const lunch = r.metrica.porPlato.find(m => m.dish === 'Lunch');
const plato = r.metrica.porPlato.find(m => m.dish === 'Plato fuerte');


console.log('── Cuadro general (pág. 2 del PDF) ──');
eq(r.cuadroGeneral.rotacionesSalon.day, 314, 'rotaciones de mesas, diurno');
eq(r.cuadroGeneral.rotacionesSalon.night, 141, 'rotaciones de mesas, nocturno');
eq(r.cuadroGeneral.rotacionesSalon.total, 455, 'rotaciones de mesas, total');
eq(r.cuadroGeneral.clientesSinUbicar.total, 0, 'clientes sin ubicar: cero en la semana');
eq(r.alertasVistas.length, 0, 'Bocas no tuvo alertas de novedad esa semana');
eq(r.cuadroGeneral.demora1ra.day, 3, 'demora de primera atención, diurno');
eq(r.cuadroGeneral.demora1ra.night, 2, 'demora de primera atención, nocturno');
eq(r.cuadroGeneral.demoraLimpieza.day, 1, 'demora de limpieza, diurno');
eq(r.cuadroGeneral.demoraLimpieza.night, 4, 'demora de limpieza, nocturno');
eq(r.aplica.barra, false, 'Bocas no evalúa barra: esa fila no se dibuja');
eq(r.aplica.clientesSinUbicar, true, 'la fila de clientes sin ubicar SÍ sale, aunque en cero');
eq(r.cobertura.completa, true, 'la semana está completa');

console.log('── Porcentaje de mesas con demora en ser atendida (pág. 5) ──');
eq(r.porDia[0].night.porcentaje1ra, 9.1, 'lunes nocturno 9.1 %');
eq(r.porDia[6].day.porcentaje1ra, 7.1, 'domingo diurno 7.1 %');
eq(r.porDia[6].night.porcentaje1ra, 4.2, 'domingo nocturno 4.2 %');

console.log('── Porcentaje de mesas con demora en ser limpiada (pág. 7) ──');
eq(r.porDia[0].day.porcentajeLimpieza, 1.8, 'lunes diurno 1.8 %');
eq(r.porDia[0].night.porcentajeLimpieza, 18.2, 'lunes nocturno 18.2 %');
eq(r.porDia[6].night.porcentajeLimpieza, 8.3, 'domingo nocturno 8.3 %');

console.log('── Tabla general de métrica (pág. 11) ──');
eq(r.metrica.procesos.day, 312, 'procesos evaluados, diurno');
eq(r.metrica.procesos.night, 138, 'procesos evaluados, nocturno');
eq(r.metrica.procesos.total, 450, 'procesos evaluados, total');
eq(lunch.day.promedio, '00:10:53', 'promedio de Lunch, diurno');
eq(lunch.night.promedio, 'N/A', 'promedio de Lunch, nocturno');
eq(plato.day.promedio, '00:12:09', 'promedio de plato fuerte, diurno');
eq(plato.night.promedio, '00:12:23', 'promedio de plato fuerte, nocturno');
eq(lunch.day.demoras, 29, 'demoras de Lunch, diurno');
eq(lunch.night.demoras, 0, 'demoras de Lunch, nocturno');
eq(plato.day.demoras, 26, 'demoras de plato, diurno');
eq(plato.night.demoras, 8, 'demoras de plato, nocturno');
eq(r.metrica.demorasTotales, 63, 'demoras en preparación');
eq(r.metrica.porcentajeDemora, 14, 'porcentaje de demora en preparación');

console.log('── Cantidad de procesos evaluados (pág. 12) ──');
eq(r.procesosPorDia.map(d => d.day), PROC_DIA, 'procesos diurnos por día');
eq(r.procesosPorDia.map(d => d.night), PROC_NOC, 'procesos nocturnos por día');

console.log('── Cantidad de demoras por día (pág. 13) ──');
eq(r.demorasPorDia.map(d => d.porPlato['Lunch']), DEM_LUNCH, 'demoras de Lunch por día');
eq(r.demorasPorDia.map(d => d.porPlato['Plato fuerte']), DEM_PLATO, 'demoras de plato por día');

console.log('── Porcentaje de demoras por día (pág. 14) ──');
eq(r.demorasPorDia.map(d => d.porcentaje), [23.5, 3.7, 22.6, 7.9, 14.3, 13.9, 9.8], 'los siete porcentajes');

console.log('── Cantidad de demoras por turno (pág. 15) ──');
eq(r.demorasPorDia.map(d => d.day), [15, 2, 12, 4, 10, 8, 4], 'demoras diurnas por día');
eq(r.demorasPorDia.map(d => d.night), DEM_NOC, 'demoras nocturnas por día');

console.log('── Porcentaje de desviación diurno (pág. 16) ──');
eq(lunch.day.procesos, 106, 'Lunch, procesos diurnos');
eq(lunch.day.porcentaje, 27.4, 'Lunch, desviación diurna');
eq(plato.day.procesos, 206, 'plato fuerte, procesos diurnos');
eq(plato.day.porcentaje, 12.6, 'plato fuerte, desviación diurna');

console.log('── Porcentaje de desviación nocturno (pág. 17) ──');
eq(lunch.night.procesos, 0, 'Lunch, procesos nocturnos');
eq(lunch.night.porcentaje, null, 'Lunch nocturno sale N/A');
eq(plato.night.procesos, 138, 'plato fuerte, procesos nocturnos');
eq(plato.night.porcentaje, 5.8, 'plato fuerte, desviación nocturna');

console.log('── Toques, un bloque por persona (págs. 8 a 10) ──');
eq(r.toques.length, 2, 'dos personas con toques');
eq(r.toques.map(t => t.cargo).sort(), ['Asistente', 'Gerente'], 'el cargo se separa del nombre');
eq(r.toques[0].porDia.length, 7, 'siete puntos, uno por día');

console.log('── Lo que esa semana no tuvo ──');
eq(r.devoluciones.total.total, 0, 'Bocas no tuvo devoluciones esa semana');
eq(r.aplica.entregas, false, 'sin demoras de entrega no se dibuja esa hoja');
eq(r.aplica.devoluciones, false, 'ni el gráfico de devoluciones');

console.log('\n' + (fail === 0 ? 'REPRODUCE EL PDF REAL' : 'NO LO REPRODUCE') + '  ok:' + pass + '  fallos:' + fail);
process.exit(fail ? 1 : 0);
