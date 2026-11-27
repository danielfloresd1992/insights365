import type { MetricId } from '../weekData'

/*  LOS ICONOS DE LOS TÍTULOS DEL SEMANAL (propuesta B del lienzo «Semanal en 3D con iconos»). Trazos de 24×24 para
 *  IconTile (parts.tsx); cada icono dice de qué va su título. Aparte, porque un archivo de componentes solo exporta
 *  componentes. */

// METRIC_ICON = «el icono de cada indicador»
export const METRIC_ICON: Record<MetricId, string[]> = {
  // dos flechas en círculo: las mesas que rotan
  rotaciones: ['M20 12a8 8 0 0 1-14.3 4.9', 'M4 12a8 8 0 0 1 14.3-4.9', 'M18.5 3v4.6h-4.6', 'M5.5 21v-4.6h4.6'],
  // la campana de recepción: la primera atención
  pct1ra: ['M4 17h16', 'M5.5 17a6.5 6.5 0 0 1 13 0', 'M12 8V6', 'M10 6h4', 'M3 20h18'],
  // la escoba: la limpieza
  pctLimpieza: ['M20 3l-7.4 7.4', 'M9.5 9.2l5.3 5.3', 'M3.5 20.5c.4-4.7 2.5-8.6 6-11.3l5.3 5.3c-2.7 3.5-6.6 5.6-11.3 6z', 'M7 17l2-2'],
  // el portapapeles con visto: los procesos evaluados
  procesos: ['M9 3.5h6v3H9z', 'M7.5 5H5v16h14V5h-2.5', 'M8.5 13.5l2.5 2.5 4.5-4.5'],
  // la olla con vapor: la preparación
  pctPrep: ['M4 11h16v2.5a6.5 6.5 0 0 1-6.5 6.5h-3A6.5 6.5 0 0 1 4 13.5z', 'M2 11h20', 'M9 3.5v4', 'M12 2.5v5', 'M15 3.5v4'],
  // la flecha de regreso: las devoluciones
  devoluciones: ['M9 9H4V4', 'M4.2 9A8 8 0 1 1 6 16.5'],
}

// SECTION_ICON = «el icono de cada bloque del detalle»
export const SECTION_ICON = {
  // una tabla: el cuadro general
  generalTable: ['M4 5h16v14H4z', 'M4 10h16', 'M4 15h16', 'M10 5v14'],
  // el calendario: las rotaciones por día
  rotationsByDay: ['M4 5h16v15H4z', 'M8 3v4', 'M16 3v4', 'M4 10h16'],
  // tenedor y cuchillo: la preparación por plato
  byDish: ['M7 3v8', 'M5 3v5a2 2 0 0 0 4 0V3', 'M7 11v10', 'M17 3c-1.7 1.2-2.5 3.5-2.5 6.5V13H17v8'],
  prepDelaysByDay: METRIC_ICON.pctPrep,
  returns: METRIC_ICON.devoluciones,
  // la mano que se acerca: los toques de gerente
  touches: ['M9 11V5.5a1.5 1.5 0 0 1 3 0V10', 'M12 9.5a1.5 1.5 0 0 1 3 0V11', 'M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.6 15a1.5 1.5 0 0 1 2.4-1.8L9 16'],
}
