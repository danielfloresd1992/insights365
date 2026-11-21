/*  LAS SEIS FAMILIAS DE ALERTAS DE «LO QUE SE VIGILA»
 *
 *  El catálogo de alertas que usan los operadores (Jarvis-express365) tiene doce categorías. Aquí van agrupadas en
 *  seis, con ejemplos que salen tal cual de ese catálogo, el color de cada grupo (de la paleta de Amazonas) y su icono.
 */

// WatchIcon = «el dibujo de cada grupo»
export type WatchIcon = 'clock' | 'guest' | 'staff' | 'dish' | 'checklist' | 'camera'

export type WatchGroup = {
  id: string
  name: string
  examples: string
  color: string
  icon: WatchIcon
}

// WATCH_GROUPS = «los seis grupos de alertas, con ejemplos del catálogo real»
export const WATCH_GROUPS: WatchGroup[] = [
  {
    id: 'demoras',
    name: 'Demoras',
    examples: 'Primera atención, limpieza de mesa, servicio, preparación del plato y entrega.',
    color: '#d03b3b',
    icon: 'clock',
  },
  {
    id: 'clientes',
    name: 'Clientes',
    examples: 'Cliente sin ser ubicado por el host, cliente que pide atención, posible reclamo.',
    color: '#d9a441',
    icon: 'guest',
  },
  {
    id: 'personal',
    name: 'Personal',
    examples: 'Empleado sin uniforme, sin actividad, conversando o fuera de su área.',
    color: '#2f2a1e',
    icon: 'staff',
  },
  {
    id: 'comida',
    name: 'Comida y devoluciones',
    examples: 'Alimento expuesto, manipulación sin guantes, platos y pedidos devueltos.',
    color: '#b5763b',
    icon: 'dish',
  },
  {
    id: 'protocolo',
    name: 'Protocolo',
    examples: 'Mesa ocupada sin limpiar, orden tomada antes de tiempo, valet parking.',
    color: '#88847f',
    icon: 'checklist',
  },
  {
    id: 'local',
    name: 'Local y cámaras',
    examples: 'Puerta de cava abierta, área de host sola, basura acumulada, DVR sin conexión.',
    color: '#7d621b',
    icon: 'camera',
  },
]

// ICON_PATHS = «el trazo de cada icono, en una caja de 24»
export const ICON_PATHS: Record<WatchIcon, string> = {
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  guest: 'M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 20a7 7 0 0 1 14 0',
  staff: 'M9 7a3 3 0 1 0 6 0 3 3 0 0 0-6 0ZM4 21v-1a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1M12 15v6',
  dish: 'M4 15h16M6 15a6 6 0 0 1 12 0M12 7v2M3 19h18',
  checklist: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  camera: 'M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Zm12 3 6-3v8l-6-3',
}
