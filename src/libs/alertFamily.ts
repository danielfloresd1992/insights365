import { ICON_PATHS, WATCH_GROUPS } from '@/routes/landing/assets/rootSections/watchGroups'

/*  A QUÉ FAMILIA PERTENECE UNA ALERTA, Y SU ICONO
 *
 *  El catálogo de la API (Menu.category) tiene sus propias categorías; el portal las agrupa en las seis familias de
 *  «Lo que se vigila», cada una con su icono, el mismo de la portada (routes/landing/assets/rootSections/
 *  watchGroups). Una categoría que no esté aquí («--Selecione una categoria--», vacía o nueva) cae en «otra», con
 *  una campana.
 *  El nombre de la familia lo pone la traducción (family.<id> en src/i18n) y su color, el tema: --family-<id> en
 *  index.css, un tono para claro y otro para oscuro, con contraste suficiente sobre cada fondo.
 */

// FamilyId = «una de las seis familias»; FamilyLookId = «una de ellas u «otra», la de las alertas sin familia»
export type FamilyId = 'demoras' | 'clientes' | 'personal' | 'comida' | 'protocolo' | 'local'
export type FamilyLookId = FamilyId | 'otra'

// FamilyLook = «cómo se ve la familia de una alerta»: cuál es (o «otra») y el trazo de su icono, en una caja de 24
export type FamilyLook = { id: FamilyLookId; icon: string }

// CATEGORY_FAMILY = «la familia de cada categoría del catálogo»
const CATEGORY_FAMILY: Record<string, FamilyId> = {
  delay: 'demoras',
  client: 'clientes',
  employee: 'personal',
  'seguimiento-de-personal': 'personal',
  food: 'comida',
  protocol: 'protocolo',
  localIncident: 'local',
  incident: 'local',
  merchandise: 'local',
  door: 'local',
  trash: 'local',
  failed: 'local',
  perimeter: 'local',
}

// BELL = «la campana de las alertas sin familia»
const BELL = 'M18 16v-5a6 6 0 0 0-12 0v5l-1.5 2h15L18 16ZM10 20a2 2 0 0 0 4 0'

// alertFamily = «la familia de esa categoría y su icono; «otra» con la campana si no tiene»
export function alertFamily(category: string | null | undefined): FamilyLook {
  const familyId = category ? CATEGORY_FAMILY[category] : undefined
  const group = familyId ? WATCH_GROUPS.find(entry => entry.id === familyId) : undefined
  return familyId && group ? { id: familyId, icon: ICON_PATHS[group.icon] } : { id: 'otra', icon: BELL }
}
