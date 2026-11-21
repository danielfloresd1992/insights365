import WatchList from './WatchList'
import ProposalA from './proposals/a/ProposalA'
import ProposalB from './proposals/b/ProposalB'
import ProposalC from './proposals/c/ProposalC'
import type { CardsVariant, SectionsVariant } from '../landing.content'
import './proposals/proposals.css'

/*  LO QUE SIGUE A LA PORTADA EN '/': las seis familias de alertas en tarjetas 3D (WatchList, con su opción de
 *  movimiento) y, después, una de las tres propuestas para el resto de la página. Todo dentro del mismo <main>, donde
 *  los momentos de taste-skill buscan sus secciones. Solo pinta.
 */

type RootSectionsProps = {
  // cardsVariant = «cuál de las tres opciones de movimiento llevan las tarjetas de «Lo que se vigila»»
  cardsVariant: CardsVariant
  // sectionsVariant = «cuál de las tres propuestas sigue a las tarjetas»
  sectionsVariant: SectionsVariant
}

// PROPOSALS = «la propuesta de cada letra»
const PROPOSALS: Record<SectionsVariant, () => React.JSX.Element> = {
  a: ProposalA,
  b: ProposalB,
  c: ProposalC,
}

export default function RootSections({ cardsVariant, sectionsVariant }: RootSectionsProps) {
  const Proposal = PROPOSALS[sectionsVariant]
  return (
    <>
      <WatchList variant={cardsVariant} />
      <Proposal />
    </>
  )
}
