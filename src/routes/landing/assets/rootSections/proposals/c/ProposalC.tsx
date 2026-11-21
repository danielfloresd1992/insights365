import CatalogMarquee from './CatalogMarquee'
import DelayAnatomy from './DelayAnatomy'
import EvidenceWall from './EvidenceWall'

/*  PROPUESTA C · CADA ALERTA, CON SU PRUEBA
 *
 *  Lo que sigue a las tarjetas, contado desde la prueba: primero el catálogo real de alertas en cintas que corren, con
 *  sus cifras; luego una demora desarmada capa a capa (sus fotos, su tiempo, su validación y a dónde va), y al final
 *  tarjetas del muro que se dan la vuelta para enseñar lo que hay detrás. Solo pinta.
 */
export default function ProposalC() {
  return (
    <>
      <CatalogMarquee />
      <DelayAnatomy />
      <EvidenceWall />
    </>
  )
}
